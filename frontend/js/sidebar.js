function initLayout(activeId, title) {
  const nav = [
    { id: "dashboard", label: "總覽儀表板", icon: "▣", href: "dashboard.html", section: "校園系統" },
    { id: "courses", label: "課程資訊", icon: "✦", href: "courses.html" },
    { id: "graduation", label: "畢業進度", icon: "◫", href: "graduation.html" },
    { id: "events-browse", label: "活動列表", icon: "◉", href: "events.html", section: "課外活動" },
    { id: "events-records", label: "報名紀錄", icon: "☰", href: "events-records.html" },
    { id: "events-logs", label: "活動心得", icon: "✎", href: "events-logs.html" },
    { id: "jobs", label: "職缺資訊", icon: "⌁", href: "jobs.html" },
    { id: "notifications", label: "通知中心", icon: "●", href: "notifications.html" },
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
