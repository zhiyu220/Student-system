// events.js
const MOCK_EVENTS = [
  { id:1, title:'校園徵才博覽會', location:'學生活動中心', start_at:'2025-05-10 09:00', end_at:'17:00', max_participants:300, registered:53,  color:'#4f6ef7' },
  { id:2, title:'AI 技術研討會',  location:'資工系館 B101', start_at:'2025-05-15 14:00', end_at:'17:00', max_participants:80,  registered:72,  color:'#0f6e56' },
  { id:3, title:'期末成果展',     location:'展覽館一樓',   start_at:'2025-05-20 10:00', end_at:'16:00', max_participants:null, registered:0,   color:'#854f0b' },
];

function render(events) {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = events.map(e => {
    const remaining = e.max_participants ? e.max_participants - e.registered : null;
    const spotsText = remaining !== null ? `剩餘名額：<b>${remaining}</b> / ${e.max_participants}` : '無人數上限';
    const almostFull = remaining !== null && remaining < 20;
    return `
      <div class="event-card">
        <div class="event-header" style="background:${e.color}">
          <div class="event-date mono">${e.start_at}</div>
          <div class="event-name">${e.title}</div>
        </div>
        <div class="event-body">
          <div class="event-detail">📍 ${e.location}</div>
          <div class="event-detail">🕘 ${e.start_at.split(' ')[1]} – ${e.end_at}</div>
        </div>
        <div class="event-footer">
          <div class="event-spots ${almostFull ? 'badge-red' : ''}" style="${almostFull ? 'color:#991b1b;font-weight:600' : ''}">${spotsText}</div>
          <button class="btn btn-primary btn-sm" style="background:${e.color}" onclick="register(${e.id},'${e.title}')">報名</button>
        </div>
      </div>
    `;
  }).join('');
}

function register(id, title) {
  // TODO: 串接 POST /api/events/{id}/register
  alert(`已送出報名申請：${title}`);
}

window.addEventListener('load', () => {
  initLayout('events', '活動資訊');
  // TODO: 串接 GET /api/events
  render(MOCK_EVENTS);
});
