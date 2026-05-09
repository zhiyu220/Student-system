function initLayout(activeId, title) {
  const nav = [
    { id: 'dashboard',     label: '儀表板',   icon: '⊞', href: 'dashboard.html',     section: '主選單' },
    { id: 'courses',       label: '課程選課', icon: '📚', href: 'courses.html' },
    { id: 'history',       label: '修課紀錄', icon: '📜', href: 'course_history02.html'},
    { id: 'graduation',    label: '畢業審核', icon: '🎓', href: 'graduation.html' },
    { id: 'events',        label: '活動資訊', icon: '📅', href: 'events.html',         section: '校園生活' },
    { id: 'jobs',          label: '工讀資訊', icon: '💼', href: 'jobs.html' },
    { id: 'notifications', label: '通知中心', icon: '🔔', href: 'notifications.html' },
  ];

  document.querySelector(".sidebar").innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-text">智慧校園系統</div>
      <div class="logo-sub">Smart Campus v0.1</div>
    </div>
    <nav class="sidebar-nav">
      ${nav.map((item) => `
        ${item.section ? `<div class="nav-section">${item.section}</div>` : ""}
        <a class="nav-item ${item.id === activeId ? "active" : ""}" href="${item.href}">
          <span class="icon">${item.icon}</span>${item.label}
        </a>
      `).join("")}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">林</div>
        <div>
          <div class="user-name">示範學生</div>
          <div class="user-role">學號 S001｜資訊工程學系</div>
        </div>
      </div>
    </div>
  `;

  document.querySelector(".topbar-title").textContent = title;
  checkApiStatus();
}

async function checkApiStatus() {
  const dot = document.getElementById("status-dot");
  const label = document.getElementById("status-label");

  try {
    await api.health();
    dot.className = "status-dot ok";
    label.textContent = "API 正常";
  } catch {
    dot.className = "status-dot err";
    label.textContent = "API 異常";
  }
}
