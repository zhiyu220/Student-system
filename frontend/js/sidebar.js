// ── Sidebar & Topbar（所有頁面共用，請勿修改）──
function initLayout(activeId, title) {
  const nav = [
    { id: 'dashboard',     label: '儀表板',   icon: '⊞', href: 'dashboard.html',     section: '主選單' },
    { id: 'courses',       label: '課程選課', icon: '📚', href: 'courses.html' },
    { id: 'graduation',    label: '畢業審核', icon: '🎓', href: 'graduation.html' },
    { id: 'events',        label: '活動資訊', icon: '📅', href: 'events.html',         section: '校園生活' },
    { id: 'jobs',          label: '工讀資訊', icon: '💼', href: 'jobs.html' },
    { id: 'notifications', label: '通知中心', icon: '🔔', href: 'notifications.html' },
  ];

  const sidebarHTML = `
    <div class="sidebar-logo">
      <div class="logo-text">校園智慧系統</div>
      <div class="logo-sub">Smart Campus v0.1</div>
    </div>
    <nav class="sidebar-nav">
      ${nav.map(item => `
        ${item.section ? `<div class="nav-section">${item.section}</div>` : ''}
        <a class="nav-item ${item.id === activeId ? 'active' : ''}" href="${item.href}">
          <span class="icon">${item.icon}</span>${item.label}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar" id="user-avatar">王</div>
        <div>
          <div class="user-name" id="user-name">王小明</div>
          <div class="user-role" id="user-role">學號 S001 · 資工系</div>
        </div>
      </div>
      <button class="btn-logout" id="logout-btn" title="登出">🚪</button>
    </div>
  `;

  document.querySelector('.sidebar').innerHTML = sidebarHTML;
  document.querySelector('.topbar-title').textContent = title;

  // 更新用戶資訊
  updateUserInfo();

  // 登出按鈕事件
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('確定要登出嗎？')) {
      auth.logout();
      window.location.href = 'login.html';
    }
  });

  // API 狀態燈
  checkApiStatus();
}

function updateUserInfo() {
  const user = auth.getUser();
  if (user) {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const role = document.getElementById('user-role');
    
    avatar.textContent = user.name.charAt(0);
    name.textContent = user.name;
    role.textContent = `學號 ${user.student_id} · ${user.department}`;
  }
}

async function checkApiStatus() {
  const dot   = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  try {
    await api.health();
    dot.className = 'status-dot ok';
    label.textContent = 'API 正常';
  } catch {
    dot.className = 'status-dot err';
    label.textContent = 'API 未連線';
  }
}
