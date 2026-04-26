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
        <div class="user-avatar">王</div>
        <div>
          <div class="user-name">王小明</div>
          <div class="user-role">學號 S001 · 資工系</div>
        </div>
      </div>
    </div>
  `;

  document.querySelector('.sidebar').innerHTML = sidebarHTML;
  document.querySelector('.topbar-title').textContent = title;

  // API 狀態燈
  checkApiStatus();
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
