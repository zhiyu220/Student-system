// graduation.js — drives the Graduation Audit page.
// Data sources:
//   GET /api/graduation/{id}      → eligibility, per-category buckets, missing courses, blocking items
//   GET /api/course-records/{id}  → full course history for the review tabs
//   GET /api/academic/courses     → catalog, used to suggest courses that fill remaining gaps

// ── Bucket display config ────────────────────────────────────────────────
const BUCKET_META = {
  'Department Required Courses': {
    short: 'Department Required',
    color: 'var(--cat-required-fg)',
    // course types that count toward this bucket (used for suggestions)
    types: ['required', 'common_required'],
  },
  'Elective Courses': {
    short: 'Elective',
    color: 'var(--cat-elective-fg)',
    types: ['elective'],
  },
  'University Compulsory & General Education': {
    short: 'University & General Ed.',
    color: 'var(--cat-univ-fg)',
    types: ['university_required', 'general_education'],
  },
};

// Module-level data store for PDF export
let _gradData    = null;
let _recordsData = [];

function bucketMeta(name) {
  return BUCKET_META[name] || { short: name, color: 'var(--text-muted)', types: [] };
}

function safePct(earned, total) {
  if (!total) return 100;
  return Math.min(100, Math.round((earned / total) * 100));
}

function barClass(pct, met) {
  if (met) return 'green';
  return pct >= 70 ? 'amber' : 'red';
}

// ── Progress circles ─────────────────────────────────────────────────────
function buildCircleCard(label, earned, total, color) {
  const pct       = safePct(earned, total);
  const remaining = Math.max(0, total - earned);
  return `
    <div class="card stat-card">
      <div style="color:var(--text-muted); margin-bottom:10px; font-weight:500;">${label}</div>
      <div class="progress-circle" style="--ring-color:${color}; --ring-pct:${pct}%;">
        <div class="inner">
          <div style="font-size:26px; font-weight:700; color:${color};">${earned}</div>
          <div style="font-size:12px; color:var(--text-muted);">/ ${total}</div>
        </div>
      </div>
      <div style="font-size:26px; font-weight:700; color:${color}; margin-top:10px;">${pct}%</div>
      <div style="color:var(--text-muted); font-size:13px;">${remaining} remaining</div>
    </div>`;
}

function buildOverallCard(earned, total) {
  const pct       = safePct(earned, total);
  const remaining = Math.max(0, total - earned);
  return `
    <div class="card stat-card">
      <div style="color:var(--text-muted); margin-bottom:10px; font-weight:500;">Overall Graduation Progress</div>
      <div class="progress-circle" style="--ring-color:var(--accent); --ring-pct:${pct}%;">
        <div class="inner">
          <div style="font-size:30px; font-weight:700; color:var(--accent);">${pct}%</div>
        </div>
      </div>
      <div style="margin-top:12px; font-size:16px; font-weight:600;">${earned} / ${total} credits</div>
      <div style="color:var(--text-muted); font-size:13px;">${remaining} credits left to graduate</div>
    </div>`;
}

function renderCircles(overall, buckets) {
  const order = ['Department Required Courses', 'Elective Courses', 'University Compulsory & General Education'];
  const byName = {};
  buckets.forEach(b => { byName[b.name] = b; });

  let html = buildOverallCard(overall.credits_earned, overall.total_required);
  order.forEach(name => {
    const b = byName[name];
    if (!b) return;
    const meta = bucketMeta(name);
    html += buildCircleCard(meta.short, b.earned_credits, b.required_credits || 1, meta.color);
  });
  document.getElementById('progress-grid').innerHTML = html;
}

// ── Eligibility banner ───────────────────────────────────────────────────
function renderEligibility(canGraduate, overall, blockingItems) {
  const banner = document.getElementById('elig-banner');
  const remaining = Math.max(0, overall.total_required - overall.credits_earned);

  if (canGraduate) {
    banner.className = 'elig-banner ok';
    banner.innerHTML = `
      <div class="elig-icon">&#10003;</div>
      <div>
        <div class="elig-title">Eligible to Graduate</div>
        <div class="elig-sub">All graduation requirements are met (${overall.credits_earned}/${overall.total_required} credits).</div>
      </div>`;
  } else {
    const blockNote = blockingItems && blockingItems.length
      ? ` &middot; ${blockingItems.length} item(s) need attention`
      : '';
    banner.className = 'elig-banner warn';
    banner.innerHTML = `
      <div class="elig-icon">&#9888;</div>
      <div>
        <div class="elig-title">Not Yet Eligible &mdash; ${remaining} credit(s) short</div>
        <div class="elig-sub">${overall.credits_earned}/${overall.total_required} credits earned${blockNote}. See "Credits You Still Need" below.</div>
      </div>`;
  }
}

// ── Course suggestions for a gap ─────────────────────────────────────────
function buildSuggestions(bucket, allCourses, takenCodes, gap) {
  if (gap <= 0) return [];

  const meta = bucketMeta(bucket.name);

  // Department Required: the audit already names the exact courses still owed,
  // which are rendered as missing-course chips — no separate suggestions needed.
  if (bucket.name === 'Department Required Courses') return [];

  // Credit-sum buckets: pull real catalog courses of the matching type(s),
  // excluding anything already taken or in progress.
  const seen = new Set();
  return (allCourses || [])
    .filter(c => meta.types.includes(c.type))
    .filter(c => !takenCodes.has(c.code))
    .filter(c => {
      if (seen.has(c.code)) return false;   // dedupe across semesters
      seen.add(c.code);
      return true;
    })
    .sort((a, b) => (a.grade_level || 9) - (b.grade_level || 9) || (a.credits || 0) - (b.credits || 0))
    .slice(0, 5)
    .map(c => ({ code: c.code, name: c.name, credits: c.credits }));
}

function suggestionsHtml(suggestions, gap) {
  if (!suggestions.length) return '';
  const chips = suggestions.map(s =>
    `<span class="suggest-chip" title="${s.name || ''} (${s.credits} cr)">&#43; ${s.code} &middot; ${s.name || ''} <em>(${s.credits} cr)</em></span>`
  ).join('');
  return `
    <div class="needed-suggest">
      <div class="needed-suggest-label">Suggested courses to fill this gap (${gap} cr remaining):</div>
      <div class="chip-row">${chips}</div>
    </div>`;
}

// ── "Credits You Still Need" section ─────────────────────────────────────
function missingChip(c) {
  const enrolled = c.status === 'enrolled';
  const cls  = enrolled ? 'enrolled' : 'missing';
  const icon = enrolled ? '&#9203;' : '&#10007;';
  return `<span class="miss-chip ${cls}" title="${c.name_en} (${c.credits} cr)">${icon} ${c.code} &middot; ${c.name_en} <em>(${c.credits} cr)</em></span>`;
}

// Mini progress card for each sub-requirement in University Compulsory & General Ed.
function subReqRow(s) {
  const ok  = s.met;
  const cls = ok ? 'sub-ok' : 'sub-miss';
  const icon = ok ? '&#10003;' : '&#10007;';

  // Bar percentage — credit-bearing items use credits, PE uses pass-count
  let barPct = 100;
  if (s.required_credits > 0) {
    barPct = Math.min(100, Math.round((s.earned_credits / s.required_credits) * 100));
  } else if (s.required_passes) {
    barPct = Math.min(100, Math.round((s.passes / s.required_passes) * 100));
  }

  // Right-side metric lines
  const lines = [];
  if (s.required_credits != null && s.required_credits > 0)
    lines.push(`${s.earned_credits} / ${s.required_credits} cr`);
  if (s.required_passes)
    lines.push(`${s.passes} / ${s.required_passes} passes`);
  if (s.required_categories)
    lines.push(`${s.categories} / ${s.required_categories} domains`);

  return `
    <div class="sub-req-row ${cls}">
      <span class="sub-req-icon">${icon}</span>
      <div class="sub-req-center">
        <span class="sub-req-label">${s.label}</span>
        <div class="sub-req-bar-track">
          <div class="sub-req-bar-fill" style="width:${barPct}%"></div>
        </div>
      </div>
      <span class="sub-req-meta">${lines.join('<br>')}</span>
    </div>`;
}

// `catalogPending` = the course catalog is still loading, so elective/gen-ed
// suggestions aren't ready yet and we show a "Loading suggestions…" hint instead.
function renderNeeded(buckets, blockingItems, allCourses, takenCodes, catalogPending) {
  const container = document.getElementById('needed-list');
  const order = ['Department Required Courses', 'Elective Courses', 'University Compulsory & General Education'];
  const byName = {};
  buckets.forEach(b => { byName[b.name] = b; });

  let html = '';

  order.forEach(name => {
    const b = byName[name];
    if (!b) return;
    const meta = bucketMeta(name);
    const pct  = safePct(b.earned_credits, b.required_credits);
    const gap  = Math.max(0, b.required_credits - b.earned_credits);
    // Trust the backend's per-bucket verdict when present: a category can be
    // "short" on a sub-requirement even when total credits look sufficient.
    const met  = (typeof b.passed === 'boolean') ? b.passed : (gap <= 0);

    const statusBadge = met
      ? '<span class="badge badge-green">&#10003; Met</span>'
      : (gap > 0
          ? `<span class="badge badge-amber">Short by ${gap} cr</span>`
          : '<span class="badge badge-amber">Incomplete</span>');

    // Structured sub-requirement checklist (University Compulsory & General Ed.).
    const subHtml = (b.sub_requirements || []).length
      ? `<div class="sub-req-list">${b.sub_requirements.map(subReqRow).join('')}</div>`
      : '';

    let body;
    if (met) {
      body = subHtml || '<div class="needed-empty">&#10003; All requirements in this category are met.</div>';
    } else if (subHtml) {
      body = subHtml;
    } else {
      const chips = (b.missing_courses || []).length
        ? `<div class="chip-row">${b.missing_courses.map(missingChip).join('')}</div>`
        : '';
      // Credit-sum buckets (elective / gen-ed) rely on the catalog for suggestions.
      const usesCatalog = meta.types.length > 0 && name !== 'Department Required Courses';
      let suggestBlock;
      if (catalogPending && usesCatalog) {
        suggestBlock = `
          <div class="needed-suggest">
            <div class="needed-suggest-label">Loading suggestions&hellip;</div>
          </div>`;
      } else {
        suggestBlock = suggestionsHtml(buildSuggestions(b, allCourses, takenCodes, gap), gap);
      }
      body = chips + suggestBlock;
      if (!body) body = `<div class="needed-empty">${gap} more credit(s) of ${meta.short.toLowerCase()} coursework required.</div>`;
    }

    html += `
      <div class="needed-card ${met ? 'met' : ''}">
        <div class="needed-head">
          <div class="needed-name" style="border-color:${meta.color}">${name}</div>
          <div class="needed-meta">
            <strong>${b.earned_credits}</strong> / ${b.required_credits} cr ${statusBadge}
          </div>
        </div>
        <div class="progress-wrap" style="margin:10px 0 14px;">
          <div class="progress-bar ${barClass(pct, met)}" style="width:${pct}%"></div>
        </div>
        ${body}
      </div>`;
  });

  if (blockingItems && blockingItems.length) {
    html += `
      <div class="needed-card blocking">
        <div class="needed-head"><div class="needed-name" style="border-color:#ef4444">&#9888; Needs Attention</div></div>
        <ul class="blocking-list">${blockingItems.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`;
  }

  container.innerHTML = html || '<div class="needed-empty">&#10003; You have met every graduation requirement.</div>';
}

// ── Course & Credit review tabs ──────────────────────────────────────────
function formatType(type) {
  const map = {
    required:            'Required',
    common_required:     'Common Required',
    elective:            'Elective',
    general_education:   'General Education',
    university_required: 'University Required',
  };
  return map[type] || type || '&#8212;';
}

// Colored category badge (shared palette with course_history02).
const CATEGORY_BADGE = {
  required:            'badge-required',
  common_required:     'badge-required',
  elective:            'badge-elective',
  university_required: 'badge-univ',
  general_education:   'badge-general',
};

function categoryBadge(type) {
  const cls = CATEGORY_BADGE[type] || 'badge-other';
  return `<span class="badge-type ${cls}">${formatType(type)}</span>`;
}

// All course records for the review list; the Category/Semester filters work off this.
let allRecords = [];

function semKey(c) {
  return `${c.academic_year}-${c.semester}`;
}

// Build the Semester <select> options from the distinct semesters in the records.
function populateSemesterFilter(records) {
  const sel = document.getElementById('sem-filter');
  if (!sel) return;
  const sems = [...new Set(records.map(semKey))].sort();
  sel.innerHTML = '<option value="all">All Semesters</option>' +
    sems.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Re-render the three tables applying the current Category + Semester filters.
function applyReviewFilters() {
  const cat = document.getElementById('cat-filter')?.value || 'all';
  const sem = document.getElementById('sem-filter')?.value || 'all';
  const filtered = allRecords.filter(c =>
    (cat === 'all' || c.type === cat) &&
    (sem === 'all' || semKey(c) === sem)
  );
  renderTables(filtered);
}

function renderTables(records) {
  const completed  = records.filter(c => c.pass_flag === true);
  const inProgress = records.filter(c => c.status === 'enrolled' && !c.pass_flag);
  const missing    = records.filter(c => !c.pass_flag && c.status !== 'enrolled');

  document.getElementById('completed-table').innerHTML = completed.map(c => `
    <tr>
      <td>${c.name_en}</td>
      <td>${categoryBadge(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td><strong>${c.grade != null ? c.grade : '&#8212;'}</strong></td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px;">No completed courses.</td></tr>';

  document.getElementById('progress-table').innerHTML = inProgress.map(c => `
    <tr>
      <td>${c.name_en}</td>
      <td>${categoryBadge(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td><span style="color:var(--amber);">&#9203; In Progress</span></td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px;">No courses in progress.</td></tr>';

  document.getElementById('missing-table').innerHTML = missing.map(c => `
    <tr>
      <td>${c.name_en}</td>
      <td>${categoryBadge(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td><span style="color:var(--red);">&#9888; ${c.status === 'failed' ? 'Failed' : 'Not Passed'}</span></td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px;">No failed courses.</td></tr>';
}

function switchTab(n) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === n));
  document.getElementById('tab-completed').style.display = n === 0 ? 'block' : 'none';
  document.getElementById('tab-progress').style.display  = n === 1 ? 'block' : 'none';
  document.getElementById('tab-missing').style.display   = n === 2 ? 'block' : 'none';
}

// ── PDF Export ───────────────────────────────────────────────────────────
function exportGradPDF() {
  if (!_gradData) return;
  const btn = document.getElementById('export-pdf-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  try {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W    = doc.internal.pageSize.getWidth();
    const grad = _gradData;
    const stu  = grad.student || {};
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    const C = {
      blue:   [30,  64, 175],
      green:  [22, 101,  52],
      amber:  [146, 64,  14],
      red:    [153, 27,  27],
      grey:   [100,116, 139],
      light:  [241,245, 249],
      white:  [255,255, 255],
    };

    let y = 0;

    // ── Header band ─────────────────────────────────────────────────────
    doc.setFillColor(...C.blue);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(15); doc.setFont(undefined, 'bold');
    doc.text('Graduation Audit Report', 14, 14);
    doc.setFontSize(9);  doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${today}`, W - 14, 14, { align: 'right' });
    y = 30;

    // ── Student info box ─────────────────────────────────────────────────
    doc.setFillColor(...C.light);
    doc.roundedRect(14, y, W - 28, 22, 3, 3, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(stu.name || '—', 20, y + 8);
    doc.setFontSize(9);  doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grey);
    doc.text(`Student ID: ${stu.student_id || '—'}`, 20, y + 15);
    doc.text(`Department: ${stu.department || '—'}`, W / 2, y + 15);
    y += 30;

    // ── Eligibility ──────────────────────────────────────────────────────
    const canGrad = grad.can_graduate;
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.setTextColor(...(canGrad ? C.green : C.amber));
    doc.text(canGrad ? '✓  Eligible to Graduate' : '✗  Not Yet Eligible to Graduate', 14, y);
    y += 7;
    doc.setFontSize(9);  doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grey);
    const ov = grad.overall || {};
    doc.text(
      `Overall: ${ov.credits_earned} / ${ov.total_required} credits  (${ov.percentage}%)` +
      (ov.credits_in_progress ? `   |   ${ov.credits_in_progress} credits in progress` : ''),
      14, y
    );
    y += 10;

    // ── Category summary table ────────────────────────────────────────────
    const buckets = grad.buckets || [];
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Category Summary', 14, y); y += 4;

    doc.autoTable({
      startY: y,
      head: [['Category', 'Required', 'Earned', 'Gap', 'Status']],
      body: buckets.map(b => {
        const gap = Math.max(0, b.required_credits - b.earned_credits);
        const met = (typeof b.passed === 'boolean') ? b.passed : gap === 0;
        return [
          b.name,
          `${b.required_credits} cr`,
          `${b.earned_credits} cr`,
          gap > 0 ? `-${gap} cr` : '—',
          met ? '✓ Met' : `Short ${gap} cr`,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: C.blue, textColor: C.white, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        4: { fontStyle: 'bold' },
      },
      didParseCell(data) {
        if (data.column.index === 4 && data.section === 'body') {
          const met = data.cell.raw.startsWith('✓');
          data.cell.styles.textColor = met ? C.green : C.amber;
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── University sub-requirements ───────────────────────────────────────
    const univBucket = buckets.find(b => b.name === 'University Compulsory & General Education');
    if (univBucket && (univBucket.sub_requirements || []).length) {
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('University Compulsory & General Education — Detail', 14, y); y += 4;

      doc.autoTable({
        startY: y,
        head: [['Requirement', 'Cr Required', 'Cr Earned', 'Passes', 'Domains', 'Status']],
        body: univBucket.sub_requirements.map(s => [
          s.label,
          s.required_credits != null ? `${s.required_credits}` : '—',
          s.earned_credits   != null ? `${s.earned_credits}`   : '—',
          s.required_passes  ? `${s.passes}/${s.required_passes}` : '—',
          s.required_categories ? `${s.categories}/${s.required_categories}` : '—',
          s.met ? '✓' : '✗',
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [71, 85, 105], textColor: C.white, fontStyle: 'bold' },
        columnStyles: { 5: { fontStyle: 'bold' } },
        didParseCell(data) {
          if (data.column.index === 5 && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === '✓' ? C.green : C.amber;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── Missing dept-required courses ─────────────────────────────────────
    const deptBucket = buckets.find(b => b.name === 'Department Required Courses');
    const missing = (deptBucket && deptBucket.missing_courses) || [];
    if (missing.length) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Department Required — Missing / In-Progress Courses', 14, y); y += 4;

      doc.autoTable({
        startY: y,
        head: [['Code', 'Course Name', 'Credits', 'Status']],
        body: missing.map(c => [
          c.code, c.name_en, `${c.credits} cr`,
          c.status === 'enrolled' ? 'In Progress' : c.status === 'not_enrolled' ? 'Not Taken' : c.status,
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [153, 27, 27], textColor: C.white, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 1: { cellWidth: 100 } },
        didParseCell(data) {
          if (data.column.index === 3 && data.section === 'body') {
            data.cell.styles.textColor =
              data.cell.raw === 'In Progress' ? C.amber : C.red;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── Blocking items ────────────────────────────────────────────────────
    const blocking = grad.blocking_items || [];
    if (blocking.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.red);
      doc.text('Items Requiring Attention', 14, y); y += 5;
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.grey);
      blocking.forEach(item => {
        doc.text(`• ${item}`, 18, y); y += 5;
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(...C.grey);
      doc.text(
        `Page ${i} / ${pages}   |   ${stu.name || ''} (${stu.student_id || ''})   |   Generated ${today}`,
        W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' }
      );
    }

    const sid = stu.student_id || 'unknown';
    doc.save(`GraduationAudit_${sid}_${today}.pdf`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Export PDF'; }
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await checkAuth();
  initLayout('graduation', 'Graduation Audit');

  const user      = getUser();
  const studentId = user?.student_id || '1111708';

  try {
    // Render the page from two fast single-query calls first, so it paints in one
    // round-trip. The course catalog (/api/academic/courses) is heavier and only
    // powers the elective/gen-ed suggestion chips, so it loads separately below.
    const [grad, recordsData] = await Promise.all([
      api.graduation(studentId),
      api.courseRecords(studentId),
    ]);

    const records    = recordsData.records || [];
    allRecords = records;
    // Codes the student has already attempted (passed, enrolled, or failed) — never re-suggest these.
    const takenCodes = new Set(records.map(r => r.code));

    document.getElementById('student-name').textContent = grad.student?.name || user?.name || 'Student';
    document.getElementById('student-dept').textContent = grad.student?.department || user?.department || '';

    _gradData    = grad;
    _recordsData = records;

    renderEligibility(grad.can_graduate, grad.overall, grad.blocking_items);
    renderCircles(grad.overall, grad.buckets);
    renderNeeded(grad.buckets, grad.blocking_items, [], takenCodes, /* catalogPending */ true);
    populateSemesterFilter(records);
    applyReviewFilters();

    const btn = document.getElementById('export-pdf-btn');
    if (btn) btn.disabled = false;

    document.getElementById('status-dot').className     = 'status-dot ok';
    document.getElementById('status-label').textContent = 'API Connected';

    // Background: load the catalog, then patch in the suggestion chips. A failure
    // here just leaves the "Loading suggestions…" hint replaced by nothing.
    api.courses()
      .then(catalog => {
        const allCourses = (catalog && catalog.courses) || [];
        renderNeeded(grad.buckets, grad.blocking_items, allCourses, takenCodes, /* catalogPending */ false);
      })
      .catch(err => {
        console.warn('Course catalog unavailable; suggestions omitted:', err);
        renderNeeded(grad.buckets, grad.blocking_items, [], takenCodes, /* catalogPending */ false);
      });
  } catch (err) {
    console.error('Graduation page error:', err);
    document.getElementById('status-dot').className     = 'status-dot err';
    document.getElementById('status-label').textContent = 'API Error';
    document.getElementById('progress-grid').innerHTML  =
      '<p style="color:var(--red);padding:16px;">Failed to load graduation data.</p>';
  }
});
