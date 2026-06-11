// graduation.js — connects to GET /api/graduation/{student_id}

const CIRCUMFERENCE = 2 * Math.PI * 46; // r=46

function setRing(pct) {
  const offset = CIRCUMFERENCE * (1 - Math.min(pct, 100) / 100);
  const arc = document.getElementById('ring-arc');
  if (!arc) return;
  arc.style.strokeDasharray  = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  arc.style.strokeDashoffset = offset;
  arc.style.stroke = pct >= 100 ? '#22C55E' : pct >= 80 ? '#4E6CF0' : '#F59E0B';
}

function renderOverall(overall, canGraduate, blockingItems, student, capstoneTrack) {
  const pct = overall.percentage;
  setRing(pct);
  document.getElementById('ring-pct').textContent       = `${pct}%`;
  document.getElementById('credits-earned').textContent  = overall.credits_earned;
  document.getElementById('credits-required').textContent = overall.total_required;
  document.getElementById('credits-progress').textContent = overall.credits_in_progress;
  document.getElementById('capstone-track').textContent  = capstoneTrack ? `Track ${capstoneTrack}` : '—';

  document.getElementById('student-name').textContent = student.name;
  document.getElementById('student-dept').textContent  = student.department;

  const badge = document.getElementById('grad-badge');
  if (canGraduate) {
    badge.textContent = 'Eligible';
    badge.className   = 'badge badge-green';
  } else {
    badge.textContent = 'Not Yet Eligible';
    badge.className   = 'badge badge-amber';
  }

  if (blockingItems.length > 0) {
    document.getElementById('blocking-row').style.display = 'flex';
    document.getElementById('blocking-list').innerHTML = blockingItems
      .map(item => `<li>${item}</li>`)
      .join('');
  }
}

function renderBuckets(buckets) {
  const tbody = document.getElementById('grad-table');
  tbody.innerHTML = buckets.map(b => {
    const pct    = b.required_credits > 0 ? Math.min(100, Math.round(b.earned_credits / b.required_credits * 100)) : 100;
    const done   = b.earned_credits >= b.required_credits;
    const barCls = done ? 'green' : pct >= 70 ? 'amber' : 'red';
    const statusBadge = done
      ? '<span class="badge badge-green">✓ Met</span>'
      : `<span class="badge badge-amber">Short by ${b.required_credits - b.earned_credits}</span>`;

    const missingHtml = b.missing_courses.length === 0
      ? '<span style="color:var(--text-muted);font-size:12px">—</span>'
      : b.missing_courses.map(c => {
          const cls = c.status === 'enrolled' ? 'enrolled' : '';
          const icon = c.status === 'enrolled' ? '⏳' : '✗';
          return `<span class="missing-chip ${cls}" title="${c.name_en} (${c.credits} cr)">${icon} ${c.code}</span>`;
        }).join('');

    return `
      <tr>
        <td style="font-weight:600">${b.name}</td>
        <td style="font-weight:700;font-size:16px">${b.earned_credits}</td>
        <td style="color:var(--text-muted)">${b.required_credits}</td>
        <td>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${pct}%</div>
          <div class="mini-progress"><div class="mini-bar ${barCls}" style="width:${pct}%"></div></div>
        </td>
        <td>${statusBadge}</td>
        <td style="max-width:280px">${missingHtml}</td>
      </tr>`;
  }).join('');
}

window.addEventListener('load', async () => {
  await checkAuth();
  initLayout('graduation', 'Graduation Audit');

  const user = getUser();
  const studentId = user?.student_id || '1111708';

  try {
    const data = await api.graduation(studentId);
    renderOverall(data.overall, data.can_graduate, data.blocking_items, data.student, data.capstone_track);
    renderBuckets(data.buckets);

    document.getElementById('status-dot').className    = 'status-dot ok';
    document.getElementById('status-label').textContent = 'API Connected';
  } catch (err) {
    console.error('Graduation API error:', err);
    document.getElementById('status-dot').className    = 'status-dot err';
    document.getElementById('status-label').textContent = 'API Error';
    document.getElementById('grad-table').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px;color:#dc2626">Failed to load graduation data.</td></tr>';
  }
});
