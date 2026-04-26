// notifications.js
const MOCK_NOTIFS = [
  { id:1, type:'enrollment',   title:'選課成功確認',   body:'資料結構 CS201 已完成選課，本學期已選 9 學分', is_read:false, created_at:'10分鐘前' },
  { id:2, type:'event',        title:'活動報名開放通知', body:'2025 校園徵才博覽會（5/10）現已開放報名，剩餘 247 個名額', is_read:false, created_at:'1小時前' },
  { id:3, type:'job',          title:'工讀職缺通知',   body:'圖書館助理職缺已開放申請，薪資 $180/小時', is_read:true, created_at:'昨天' },
  { id:4, type:'graduation',   title:'畢業學分提醒',   body:'距離畢業尚缺 12 學分必修，請注意選課規劃', is_read:true, created_at:'3天前' },
];

let notifs = [];

function render(list) {
  const container = document.getElementById('notif-list');
  if (!list.length) { container.innerHTML = '<div class="empty">沒有通知</div>'; return; }
  container.innerHTML = list.map(n => `
    <div class="notif-item" id="notif-${n.id}">
      <div class="notif-dot ${n.is_read ? 'read' : ''}"></div>
      <div style="flex:1">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <span class="notif-time">${n.created_at}</span>
        ${!n.is_read ? `<span class="card-action" onclick="markRead(${n.id})">標為已讀</span>` : ''}
      </div>
    </div>
  `).join('');
}

function markRead(id) {
  // TODO: 串接 PATCH /api/notification/{id}/read
  const n = notifs.find(x => x.id === id);
  if (n) { n.is_read = true; render(notifs); }
}

function markAllRead() {
  notifs.forEach(n => n.is_read = true);
  render(notifs);
}

window.addEventListener('load', async () => {
  initLayout('notifications', '通知中心');
  try {
    const data = await api.notifications();
    notifs = data.notifications || MOCK_NOTIFS;
  } catch {
    notifs = MOCK_NOTIFS;
  }
  render(notifs);
});
