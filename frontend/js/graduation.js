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

// ── Progress circles (dashboard-style donuts) ────────────────────────────
function buildDonutCol(label, earned, total, colorKey) {
  const pct       = safePct(earned, total);
  const remaining = Math.max(0, total - earned);
  return `
    <div class="donut-col">
      <div class="donut-title"><i class="ti ti-book ${colorKey}"></i> ${label}</div>
      <div class="donut donut-${colorKey}" style="--pct: ${pct};">
        <div class="donut-inner">
          <div class="donut-frac"><span class="num">${earned}</span><span class="den">/ ${total}</span></div>
          <div class="donut-sub">credits</div>
        </div>
      </div>
      <div class="donut-pct ${colorKey}-text">${pct}%</div>
      <div class="donut-remain">${remaining} credits remaining</div>
    </div>`;
}

function buildOverallDonut(earned, total) {
  const pct       = safePct(earned, total);
  const remaining = Math.max(0, total - earned);
  return `
    <div class="donut-col donut-col-big">
      <div class="donut-title"><i class="ti ti-book green"></i> Overall Graduation Progress</div>
      <div class="donut donut-green donut-large" style="--pct: ${pct};">
        <div class="donut-inner">
          <div class="donut-big-pct">${pct}%</div>
          <div class="donut-sub">Completed ${earned} / ${total} credits</div>
        </div>
      </div>
      <div class="grad-pill">${remaining} credits left to graduate!</div>
    </div>`;
}

function renderCircles(overall, buckets) {
  const byName = {};
  buckets.forEach(b => { byName[b.name] = b; });

  const req     = byName['Department Required Courses'];
  const elec    = byName['Elective Courses'];
  const genEd   = byName['University Compulsory & General Education'];

  let html = '';
  if (req)   html += buildDonutCol('Required Credits', req.earned_credits, req.required_credits || 1, 'blue');
  html += buildOverallDonut(overall.credits_earned, overall.total_required);
  if (elec)  html += buildDonutCol('Elective Credits', elec.earned_credits, elec.required_credits || 1, 'purple');
  if (genEd) html += buildDonutCol('General Education Credits', genEd.earned_credits, genEd.required_credits || 1, 'orange');

  document.getElementById('progress-grid').innerHTML = html;
}

// Pill style category badge (dashboard look)
const CATEGORY_PILL = {
  required:            { cls: 'pill-blue',   label: 'Required' },
  common_required:     { cls: 'pill-blue',   label: 'Common Required' },
  elective:            { cls: 'pill-purple', label: 'Elective' },
  university_required: { cls: 'pill-orange', label: 'University Required' },
  general_education:   { cls: 'pill-orange', label: 'General Ed.' },
};
function categoryPill(type) {
  const m = CATEGORY_PILL[type] || { cls: 'pill-blue', label: type || '—' };
  return `<span class="pill ${m.cls}">${m.label}</span>`;
}

// Pill from a bucket name (for the missing-side table)
function bucketPill(bucketName) {
  if (bucketName === 'Department Required Courses')
    return `<span class="pill pill-blue">Required</span>`;
  if (bucketName === 'Elective Courses')
    return `<span class="pill pill-purple">Elective</span>`;
  if (bucketName === 'University Compulsory & General Education')
    return `<span class="pill pill-orange">General Ed.</span>`;
  return `<span class="pill pill-blue">—</span>`;
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

// Side table on the Completed tab — populated from buckets' missing_courses.
let _bucketsForMissing = [];
let _missingExpanded = false;
const MISSING_PREVIEW = 6;
function renderMissingSide() {
  const tbody = document.getElementById('missing-side-table');
  if (!tbody) return;
  const rows = [];
  _bucketsForMissing.forEach(b => {
    (b.missing_courses || []).forEach(c => {
      if (c.status === 'enrolled') return; // skip in-progress
      rows.push({ bucket: b.name, code: c.code, name: c.name_en, credits: c.credits });
    });
  });
  const shown = _missingExpanded ? rows : rows.slice(0, MISSING_PREVIEW);
  tbody.innerHTML = shown.map(r => `
    <tr>
      <td class="red-text">${r.name}</td>
      <td>${bucketPill(r.bucket)}</td>
      <td>${r.credits}</td>
    </tr>`).join('') ||
    '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px;">No missing courses.</td></tr>';

  const link = document.getElementById('missing-side-toggle');
  if (link) {
    if (rows.length <= MISSING_PREVIEW) {
      link.style.display = 'none';
    } else {
      link.style.display = '';
      link.textContent = _missingExpanded
        ? 'Show fewer ↑'
        : `View more missing courses (${rows.length - MISSING_PREVIEW}) →`;
    }
  }
}
function toggleMissingSide() {
  _missingExpanded = !_missingExpanded;
  renderMissingSide();
}

let _completedExpanded = false;
const COMPLETED_PREVIEW = 6;
let _completedRows = [];
function renderCompletedSide() {
  const tbody = document.getElementById('completed-table');
  if (!tbody) return;
  const shown = _completedExpanded ? _completedRows : _completedRows.slice(0, COMPLETED_PREVIEW);
  tbody.innerHTML = shown.map(c => `
    <tr>
      <td>${c.name_en}</td>
      <td>${categoryPill(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td class="grade">${c.grade != null ? c.grade : '&#8212;'}</td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No completed courses.</td></tr>';

  const link = document.getElementById('completed-side-toggle');
  if (link) {
    if (_completedRows.length <= COMPLETED_PREVIEW) {
      link.style.display = 'none';
    } else {
      link.style.display = '';
      link.textContent = _completedExpanded
        ? 'Show fewer ↑'
        : `View all completed courses (${_completedRows.length}) →`;
    }
  }
}
function toggleCompletedSide() {
  _completedExpanded = !_completedExpanded;
  renderCompletedSide();
}

function renderTables(records) {
  const completed  = records.filter(c => c.pass_flag === true);
  const inProgress = records.filter(c => c.status === 'enrolled' && !c.pass_flag);
  const missing    = records.filter(c => !c.pass_flag && c.status !== 'enrolled');

  _completedRows = completed;
  renderCompletedSide();

  renderMissingSide();

  document.getElementById('progress-table').innerHTML = inProgress.map(c => `
    <tr>
      <td>${c.name_en}</td>
      <td>${categoryPill(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td><span style="color:#f59e0b;">&#9203; In Progress</span></td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No courses in progress.</td></tr>';

  document.getElementById('missing-table').innerHTML = missing.map(c => `
    <tr>
      <td class="red-text">${c.name_en}</td>
      <td>${categoryPill(c.type)}</td>
      <td>${c.credits}</td>
      <td>${c.academic_year}-${c.semester}</td>
      <td><span style="color:#ef4444;">&#9888; ${c.status === 'failed' ? 'Failed' : 'Not Passed'}</span></td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No failed courses.</td></tr>';
}

function switchTab(n) {
  document.querySelectorAll('#grad-tabs .dash-tab').forEach((t, i) => t.classList.toggle('active', i === n));
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
    const H    = doc.internal.pageSize.getHeight();
    const grad = _gradData;
    const stu  = grad.student || {};
    const today = new Date().toLocaleDateString('en-CA');

    // ── Palette (matches webpage) ────────────────────────────────────────
    const C = {
      ink:    [15,  23,  42],
      sub:    [100, 116, 139],
      hairline:[226, 232, 240],
      panel:  [248, 250, 252],
      white:  [255, 255, 255],
      blue:   [59,  130, 246],
      blueBg: [239, 246, 255],
      green:  [16,  185, 129],
      greenBg:[236, 253, 245],
      purple: [139,  92, 246],
      purpleBg:[245, 243, 255],
      orange: [245, 158,  11],
      orangeBg:[255, 251, 235],
      red:    [239,  68,  68],
      redBg:  [254, 226, 226],
      track:  [241, 245, 249],
    };

    // ── Helpers ──────────────────────────────────────────────────────────
    const setFill   = (rgb) => doc.setFillColor(...rgb);
    const setStroke = (rgb) => doc.setDrawColor(...rgb);
    const setText   = (rgb) => doc.setTextColor(...rgb);
    const text      = (s, x, y, opts) => doc.text(String(s), x, y, opts);

    // Approximate a donut ring by stacking many thin filled sectors (triangles).
    function drawDonut(cx, cy, rOuter, rInner, pct, fg, bg) {
      pct = Math.max(0, Math.min(100, pct));
      const segs = 96;
      const drawArc = (fromDeg, toDeg, rgb) => {
        setFill(rgb);
        const step = (toDeg - fromDeg) / segs;
        if (step === 0) return;
        for (let i = 0; i < segs; i++) {
          const a1 = (fromDeg + i * step) * Math.PI / 180;
          const a2 = (fromDeg + (i + 1) * step) * Math.PI / 180;
          const x1o = cx + rOuter * Math.cos(a1), y1o = cy + rOuter * Math.sin(a1);
          const x2o = cx + rOuter * Math.cos(a2), y2o = cy + rOuter * Math.sin(a2);
          const x1i = cx + rInner * Math.cos(a1), y1i = cy + rInner * Math.sin(a1);
          const x2i = cx + rInner * Math.cos(a2), y2i = cy + rInner * Math.sin(a2);
          // Two triangles per segment to form a quad.
          doc.triangle(x1o, y1o, x2o, y2o, x2i, y2i, 'F');
          doc.triangle(x1o, y1o, x2i, y2i, x1i, y1i, 'F');
        }
      };
      const endDeg = -90 + (pct * 360 / 100);
      drawArc(-90, 360 - 90, bg);
      if (pct > 0) drawArc(-90, endDeg, fg);
    }

    // Rounded status pill
    function pill(label, x, y, bgRgb, textRgb) {
      doc.setFontSize(8); doc.setFont(undefined, 'bold');
      const w = doc.getTextWidth(label) + 6;
      const h = 5;
      setFill(bgRgb);
      doc.roundedRect(x, y - h + 1, w, h, 1.2, 1.2, 'F');
      setText(textRgb);
      text(label, x + 3, y - 0.7);
      return w;
    }

    // ── Header ───────────────────────────────────────────────────────────
    setFill(C.ink);
    doc.rect(0, 0, W, 26, 'F');
    setText(C.white);
    doc.setFontSize(16); doc.setFont(undefined, 'bold');
    text('StuPilot', 14, 12);
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    setText([148, 163, 184]);
    text('AI Smart Student Platform', 14, 17);
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    setText(C.white);
    text('Graduation Audit Report', W - 14, 12, { align: 'right' });
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    setText([148, 163, 184]);
    text(`Generated ${today}`, W - 14, 17, { align: 'right' });
    let y = 36;

    // ── Student card ─────────────────────────────────────────────────────
    setFill(C.panel);
    doc.roundedRect(14, y, W - 28, 22, 3, 3, 'F');
    // avatar circle
    setFill(C.blue);
    doc.circle(24, y + 11, 6, 'F');
    setText(C.white);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    text((stu.name || '?').charAt(0).toUpperCase(), 24, y + 13, { align: 'center' });
    // info
    setText(C.ink);
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    text(stu.name || '—', 34, y + 9);
    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    setText(C.sub);
    text(`ID: ${stu.student_id || '—'}`, 34, y + 15);
    text(stu.department || '', 70, y + 15);
    // eligibility pill on the right
    const canGrad = grad.can_graduate;
    const pillLabel = canGrad ? 'Eligible to Graduate' : 'Not Yet Eligible';
    const pillBg    = canGrad ? C.greenBg : C.orangeBg;
    const pillFg    = canGrad ? C.green   : C.orange;
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    const pw = doc.getTextWidth(pillLabel) + 8;
    setFill(pillBg);
    doc.roundedRect(W - 14 - pw, y + 7, pw, 8, 2, 2, 'F');
    setText(pillFg);
    text(pillLabel, W - 14 - pw / 2, y + 12.5, { align: 'center' });
    y += 30;

    // ── Donut row (4 cards) ──────────────────────────────────────────────
    const ov = grad.overall || {};
    const buckets = grad.buckets || [];
    const byName = {};
    buckets.forEach(b => { byName[b.name] = b; });
    const reqB  = byName['Department Required Courses'];
    const elecB = byName['Elective Courses'];
    const genB  = byName['University Compulsory & General Education'];

    function donutCard(x, w, title, earned, total, fg, fgBg) {
      const cardH = 56;
      setFill(C.white); setStroke(C.hairline); doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w, cardH, 3, 3, 'FD');
      // title
      setText(C.sub);
      doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
      text(title, x + w / 2, y + 7, { align: 'center' });
      // donut
      const pct = total ? Math.min(100, Math.round((earned / total) * 100)) : 0;
      drawDonut(x + w / 2, y + 26, 11, 7.5, pct, fg, C.track);
      setText(fg);
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      text(`${pct}%`, x + w / 2, y + 28, { align: 'center' });
      // fraction
      setText(C.ink);
      doc.setFontSize(9); doc.setFont(undefined, 'bold');
      text(`${earned} / ${total}`, x + w / 2, y + 44, { align: 'center' });
      setText(C.sub);
      doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
      text(`${Math.max(0, total - earned)} credits remaining`, x + w / 2, y + 50, { align: 'center' });
    }

    const cardGap = 4;
    const cardW   = (W - 28 - cardGap * 3) / 4;
    let cx = 14;
    donutCard(cx, cardW, 'Required',     reqB?.earned_credits ?? 0, reqB?.required_credits ?? 0, C.blue,   C.blueBg);  cx += cardW + cardGap;
    donutCard(cx, cardW, 'Overall',      ov.credits_earned ?? 0,    ov.total_required ?? 0,      C.green,  C.greenBg); cx += cardW + cardGap;
    donutCard(cx, cardW, 'Elective',     elecB?.earned_credits ?? 0, elecB?.required_credits ?? 0, C.purple, C.purpleBg); cx += cardW + cardGap;
    donutCard(cx, cardW, 'General Ed.',  genB?.earned_credits ?? 0, genB?.required_credits ?? 0, C.orange, C.orangeBg);
    y += 56 + 8;

    // ── Category Summary table ───────────────────────────────────────────
    setText(C.ink); doc.setFontSize(11); doc.setFont(undefined, 'bold');
    text('Category Summary', 14, y); y += 4;

    doc.autoTable({
      startY: y,
      head: [['Category', 'Required', 'Earned', 'Gap', 'Status']],
      body: buckets.map(b => {
        const gap = Math.max(0, b.required_credits - b.earned_credits);
        const met = (typeof b.passed === 'boolean') ? b.passed : gap === 0;
        return [b.name, `${b.required_credits} cr`, `${b.earned_credits} cr`, gap > 0 ? `${gap} cr` : '—', met ? 'Met' : `Short ${gap} cr`];
      }),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3.2, lineColor: C.hairline, lineWidth: 0.1, textColor: C.ink },
      headStyles: { fillColor: C.panel, textColor: C.sub, fontStyle: 'bold', fontSize: 8.5, lineWidth: { bottom: 0.3 }, lineColor: C.hairline },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell(d) {
        if (d.column.index === 4 && d.section === 'body') {
          d.cell.styles.textColor = d.cell.raw === 'Met' ? C.green : C.orange;
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── University sub-requirements ──────────────────────────────────────
    const univBucket = buckets.find(b => b.name === 'University Compulsory & General Education');
    if (univBucket && (univBucket.sub_requirements || []).length) {
      if (y > 230) { doc.addPage(); y = 20; }
      setText(C.ink); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      text('University Compulsory & General Education — Detail', 14, y); y += 4;

      doc.autoTable({
        startY: y,
        head: [['Requirement', 'Required', 'Earned', 'Passes', 'Domains', 'Status']],
        body: univBucket.sub_requirements.map(s => [
          s.label,
          s.required_credits != null ? `${s.required_credits}` : '—',
          s.earned_credits   != null ? `${s.earned_credits}`   : '—',
          s.required_passes  ? `${s.passes}/${s.required_passes}` : '—',
          s.required_categories ? `${s.categories}/${s.required_categories}` : '—',
          s.met ? 'Met' : 'Short',
        ]),
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3, lineColor: C.hairline, lineWidth: 0.1, textColor: C.ink },
        headStyles: { fillColor: C.panel, textColor: C.sub, fontStyle: 'bold', fontSize: 8.5, lineWidth: { bottom: 0.3 }, lineColor: C.hairline },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        columnStyles: {
          1: { halign: 'right' }, 2: { halign: 'right' },
          3: { halign: 'right' }, 4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell(d) {
          if (d.column.index === 5 && d.section === 'body') {
            d.cell.styles.textColor = d.cell.raw === 'Met' ? C.green : C.orange;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ── Missing dept-required courses ────────────────────────────────────
    const deptBucket = buckets.find(b => b.name === 'Department Required Courses');
    const missing = (deptBucket && deptBucket.missing_courses) || [];
    if (missing.length) {
      if (y > 230) { doc.addPage(); y = 20; }
      setText(C.ink); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      text('Outstanding Required Courses', 14, y); y += 4;

      doc.autoTable({
        startY: y,
        head: [['Code', 'Course', 'Credits', 'Status']],
        body: missing.map(c => [
          c.code, c.name_en, `${c.credits} cr`,
          c.status === 'enrolled' ? 'In Progress' : c.status === 'not_enrolled' ? 'Not Taken' : c.status,
        ]),
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3, lineColor: C.hairline, lineWidth: 0.1, textColor: C.ink },
        headStyles: { fillColor: C.panel, textColor: C.sub, fontStyle: 'bold', fontSize: 8.5, lineWidth: { bottom: 0.3 }, lineColor: C.hairline },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell(d) {
          if (d.column.index === 3 && d.section === 'body') {
            d.cell.styles.textColor = d.cell.raw === 'In Progress' ? C.orange : C.red;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ── Blocking items ───────────────────────────────────────────────────
    const blocking = grad.blocking_items || [];
    if (blocking.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      setFill(C.redBg);
      doc.roundedRect(14, y, W - 28, 8 + blocking.length * 5, 3, 3, 'F');
      setText(C.red); doc.setFontSize(10); doc.setFont(undefined, 'bold');
      text('Items Requiring Attention', 18, y + 6);
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      let by = y + 12;
      blocking.forEach(item => {
        text(`•  ${item}`, 20, by); by += 5;
      });
    }

    // ── Footer ───────────────────────────────────────────────────────────
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setStroke(C.hairline); doc.setLineWidth(0.2);
      doc.line(14, H - 12, W - 14, H - 12);
      doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); setText(C.sub);
      text(`${stu.name || ''} · ${stu.student_id || ''}`, 14, H - 7);
      text(`Page ${i} / ${pages}`, W / 2, H - 7, { align: 'center' });
      text(`StuPilot · Generated ${today}`, W - 14, H - 7, { align: 'right' });
    }

    const sid = stu.student_id || 'unknown';
    doc.save(`GraduationAudit_${sid}_${today}.pdf`);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-download"></i> Export PDF'; }
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
    const deptEl = document.getElementById('student-dept');
    if (deptEl) deptEl.textContent = grad.student?.department || user?.department || '';

    _gradData    = grad;
    _recordsData = records;

    _bucketsForMissing = grad.buckets || [];
    renderEligibility(grad.can_graduate, grad.overall, grad.blocking_items);
    renderCircles(grad.overall, grad.buckets);
    populateSemesterFilter(records);
    applyReviewFilters();

    const btn = document.getElementById('export-pdf-btn');
    if (btn) btn.disabled = false;

    document.getElementById('status-dot').className     = 'status-dot ok';
    document.getElementById('status-label').textContent = 'API Connected';

  } catch (err) {
    console.error('Graduation page error:', err);
    document.getElementById('status-dot').className     = 'status-dot err';
    document.getElementById('status-label').textContent = 'API Error';
    document.getElementById('progress-grid').innerHTML  =
      '<p style="color:var(--red);padding:16px;">Failed to load graduation data.</p>';
  }
});
