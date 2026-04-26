// jobs.js
const MOCK_JOBS = [
  { id:1, title:'圖書館助理',     location:'圖書館二樓', hourly_wage:180, hours:'每週 10–15 小時', status:'open',   description:'協助館員整理書籍、讀者服務及資料輸入等工作。' },
  { id:2, title:'學生宿舍管理員', location:'第三宿舍',   hourly_wage:190, hours:'每週 8 小時',     status:'open',   description:'負責宿舍門禁管理、訪客登記及緊急事件處理。' },
  { id:3, title:'餐廳服務人員',   location:'第一餐廳',   hourly_wage:168, hours:'每週 12 小時',   status:'closing', description:'餐廳午餐及晚餐時段服務，包含備餐、收餐及清潔。' },
];

const STATUS_MAP = {
  open:    { label: '招募中',   cls: 'badge-green' },
  closing: { label: '即將截止', cls: 'badge-amber' },
  filled:  { label: '已額滿',   cls: 'badge-red'   },
};

function render(jobs) {
  const list = document.getElementById('jobs-list');
  list.innerHTML = jobs.map(j => {
    const s = STATUS_MAP[j.status] || STATUS_MAP.open;
    return `
      <div class="job-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="job-title">${j.title}</div>
          <span class="badge ${s.cls}">${s.label}</span>
        </div>
        <div class="job-meta">
          <div class="job-meta-item">📍 ${j.location}</div>
          <div class="job-meta-item">💰 $${j.hourly_wage} / 小時</div>
          <div class="job-meta-item">⏱ ${j.hours}</div>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">${j.description}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="apply(${j.id},'${j.title}')">申請</button>
          <button class="btn btn-ghost btn-sm">查看詳情</button>
        </div>
      </div>
    `;
  }).join('');
}

function apply(id, title) {
  // TODO: 串接 POST /api/jobs/{id}/apply
  alert(`已送出申請：${title}`);
}

window.addEventListener('load', () => {
  initLayout('jobs', '工讀資訊');
  // TODO: 串接 GET /api/jobs
  render(MOCK_JOBS);
});
