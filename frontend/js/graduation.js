// graduation.js
const MOCK_REQS = [
  { category: '必修', earned: 60, required: 72 },
  { category: '選修', earned: 18, required: 20 },
  { category: '通識', earned: 16, required: 16 },
  { category: '體育', earned: 4,  required: 4  },
];

function render(reqs) {
  const tbody = document.getElementById('grad-table');
  tbody.innerHTML = reqs.map(r => {
    const pct = Math.min(100, Math.round(r.earned / r.required * 100));
    const done = r.earned >= r.required;
    const colorClass = done ? 'green' : (pct >= 80 ? 'amber' : 'red');
    return `
      <tr>
        <td>${r.category}</td>
        <td><b>${r.earned}</b></td>
        <td>${r.required}</td>
        <td>
          <div class="progress-wrap" style="width:100px">
            <div class="progress-bar ${colorClass}" style="width:${pct}%"></div>
          </div>
        </td>
        <td><span class="badge ${done ? 'badge-green' : 'badge-amber'}">${done ? '✓ 達標' : `差 ${r.required - r.earned}`}</span></td>
      </tr>
    `;
  }).join('');
}

window.addEventListener('load', () => {
  initLayout('graduation', '畢業審核');
  // TODO: 串接 GET /api/academic/students/{id}/graduation
  render(MOCK_REQS);
});
