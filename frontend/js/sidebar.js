const NAV_SECTIONS = [
  {
    section: "主選單",
    items: [
      { id: "dashboard",      label: "儀表板",  icon: "📊", href: "dashboard.html",      files: ["dashboard.html"],      title: "儀表板" },
      { id: "course-history", label: "修課紀錄", icon: "📜", href: "course_history02.html", files: ["course_history02.html"], title: "修課紀錄" },
      { id: "graduation",     label: "畢業審核", icon: "🎓", href: "graduation.html",     files: ["graduation.html"],     title: "畢業審核" },
      { id: "notifications",  label: "通知中心", icon: "🔔", href: "notifications.html",  files: ["notifications.html"],  title: "通知中心" },
    ],
  },

  {
    section: "StuPilot",
    items: [
      { id: "academic-progress", label: "Academic Progress",     icon: "📖", href: "academic-progress.html", files: ["academic-progress.html"], title: "Academic Progress" },
      { id: "performance",       label: "Performance Analytics", icon: "📈", href: "performance.html",        files: ["performance.html"],        title: "Performance Analytics" },
      { id: "course-map",        label: "Course Map",            icon: "🗺",  href: "course-map.html",         files: ["course-map.html"],         title: "Course Map" },
      { id: "course-planning",   label: "Course Planning",       icon: "📆", href: "course-planning.html",    files: ["course-planning.html"],    title: "Course Planning" },
      { id: "grade-inquiry",     label: "Grade Inquiry",         icon: "🔍", href: "grade-inquiry.html",      files: ["grade-inquiry.html"],      title: "Grade Inquiry" },
      { id: "settings",          label: "Settings",              icon: "⚙️", href: "settings.html",           files: ["settings.html"],           title: "Settings" },
      { id: "help",              label: "Help Center",           icon: "❓", href: "help-center.html",        files: ["help-center.html"],        title: "Help Center" },
      { id: "data-admin",        label: "Data Admin",            icon: "🗄", href: "data-admin.html",         files: ["data-admin.html"],         title: "Data Admin" },
    ],
  },
];

const SECONDARY_ROUTES = [];

const LEGACY_ROUTE_ALIASES = {};

// ── 路由查找表（檔名 → routeId）────────────────────────────────────────
const PAGE_TO_ROUTE = (() => {
  const map = {};

  // 展開所有可見路由（含子分類）
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.children) {
        for (const child of item.children) {
          child.files.forEach((f) => (map[f] = child.id));
        }
      } else {
        item.files.forEach((f) => (map[f] = item.id));
      }
    }
  }

  // 次頁面
  for (const route of SECONDARY_ROUTES) {
    route.files.forEach((f) => (map[f] = route.id));
  }

  return map;
})();

// 所有路由的平鋪查找表（id → route）
const ROUTE_BY_ID = (() => {
  const map = {};

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.children) {
        item.children.forEach((c) => (map[c.id] = c));
      } else {
        map[item.id] = item;
      }
    }
  }

  for (const route of SECONDARY_ROUTES) {
    map[route.id] = route;
  }

  return map;
})();

// ── 輔助函式 ──────────────────────────────────────────────────────────
function getCurrentFileName() {
  const path = window.location.pathname || "";
  return path.split("/").pop() || "";
}

function resolveActiveRoute(explicitId) {
  const normalized = LEGACY_ROUTE_ALIASES[explicitId] || explicitId;
  if (normalized && ROUTE_BY_ID[normalized]) return normalized;

  const currentFile = getCurrentFileName();
  return PAGE_TO_ROUTE[currentFile] || "";
}

function resolveTitle(activeId, explicitTitle) {
  if (explicitTitle) return explicitTitle;
  const route = ROUTE_BY_ID[activeId];
  return route ? route.title : "";
}

// 若 activeId 是某個 group 的子項目，回傳 groupId（用於展開該群組）
function resolveActiveGroupId(activeId) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.children) {
        const hit = item.children.some((c) => c.id === activeId);
        if (hit) return item.id;
      }
    }
  }

  // 次頁面：透過 parentId 找到所屬群組
  const secondary = SECONDARY_ROUTES.find((r) => r.id === activeId);
  if (secondary) return resolveActiveGroupId(secondary.parentId);

  return null;
}

function getAppVersionLabel() {
  return "AI Smart Student Platform";
}

// ── Sidebar HTML 產生器 ────────────────────────────────────────────────
function buildSidebarHTML(activeId, activeGroupId, appVersionLabel) {
  const NAV_ITEMS = [
    { id: "dashboard",         label: "Dashboard",             icon: "ti-layout-dashboard", href: "dashboard.html" },
    { id: "academic-progress", label: "Academic Progress",     icon: "ti-books",             href: "academic-progress.html" },
    { id: "graduation",        label: "Graduation Audit",      icon: "ti-certificate",       href: "graduation.html" },
    { id: "course-history",    label: "Course History",        icon: "ti-list-details",      href: "course_history02.html" },
    { id: "performance",       label: "Performance Analytics", icon: "ti-chart-line",        href: "performance.html" },
    { id: "course-map",        label: "Course Map",            icon: "ti-map-2",             href: "course-map.html" },
    { id: "course-planning",   label: "Course Planning",       icon: "ti-calendar-plus",     href: "course-planning.html" },
    { id: "grade-inquiry",     label: "Grade Inquiry",         icon: "ti-clipboard-text",    href: "grade-inquiry.html" },
    { id: "notifications",     label: "Smart Notifications",   icon: "ti-bell",              href: "notifications.html", badge: 3 },
    { id: "settings",          label: "Settings",              icon: "ti-settings",          href: "settings.html" },
    { id: "help",              label: "Help Center",           icon: "ti-help-circle",       href: "help-center.html" },
    { id: "data-admin",        label: "Data Admin",            icon: "ti-database",          href: "data-admin.html" },
  ];

  const navHTML = NAV_ITEMS.map(({ id, label, icon, href, badge }) => {
    const isActive = id === activeId;
    const badgeHTML = badge ? `<span class="nav-badge-red">${badge}</span>` : "";
    return `
      <a class="nav-item${isActive ? " active" : ""}" href="${href}">
        <i class="ti ${icon}" style="font-size:16px;width:18px;text-align:center;flex-shrink:0;" aria-hidden="true"></i>
        ${label}
        ${badgeHTML}
      </a>`;
  }).join("");

  return `
    <div class="sidebar-logo">
      <div class="logo-brand">
        <div class="logo-icon"><i class="ti ti-school" style="font-size:18px;" aria-hidden="true"></i></div>
        <div class="logo-text-group">
          <div class="logo-text">StuPilot</div>
          <div class="logo-sub">${appVersionLabel}</div>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav" aria-label="主選單">
      ${navHTML}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar-outline">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <div class="user-details">
          <div class="user-name">${(typeof getUser === 'function' && getUser()?.name) || 'Student'}</div>
          <div class="user-id">ID: ${(typeof getUser === 'function' && getUser()?.student_id) || '—'}</div>
          <div class="user-dept">${(typeof getUser === 'function' && getUser()?.role) || ''}</div>
        </div>
      </div>
      <button class="sidebar-logout" onclick="if(typeof logout==='function')logout()">
        <i class="ti ti-logout" style="font-size:16px;" aria-hidden="true"></i>
        Log Out
      </button>
    </div>`;
}

// ── 群組展開 / 收合事件 ───────────────────────────────────────────────
function bindGroupToggles() {
  document.querySelectorAll(".group-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.group;
      const group = document.getElementById(`group-${groupId}`);
      const isOpen = btn.classList.contains("open");

      btn.classList.toggle("open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      group.style.display = isOpen ? "none" : "block";
    });
  });
}

// ── 主初始化函式 ──────────────────────────────────────────────────────
// 用法：
//   initLayout("dashboard")            → 指定 routeId
//   initLayout("events-browse", "活動列表") → 指定 routeId + 覆蓋標題
//   initLayout("活動列表")              → 向下相容：傳標題字串也能運作
function initLayout(activeIdOrTitle, maybeTitle) {
  const activeId = resolveActiveRoute(maybeTitle ? activeIdOrTitle : "");
  const title = resolveTitle(activeId, maybeTitle || activeIdOrTitle);
  const activeGroupId = resolveActiveGroupId(activeId);
  const appVersionLabel = getAppVersionLabel();

  const sidebarEl = document.querySelector(".sidebar");
  if (sidebarEl) {
    sidebarEl.innerHTML = buildSidebarHTML(activeId, activeGroupId, appVersionLabel);
    bindGroupToggles();
  }

  const topbarTitle = document.querySelector(".topbar-title");
  if (topbarTitle) topbarTitle.textContent = title;

  checkApiStatus();
  initSidebarToggle();
}

// ── API 狀態檢查 ───────────────────────────────────────────────────────
async function checkApiStatus() {
  const dot = document.getElementById("status-dot");
  const label = document.getElementById("status-label");
  if (!dot || !label) return;

  try {
    const data = await api.health();          // 現在回傳 { status, app_name, version }
    dot.className = "status-dot ok";
    label.textContent = "API 正常";

    // 用後端版本號更新 sidebar logo
    const logoSub = document.querySelector(".logo-sub");
    if (logoSub && data.version) {
      logoSub.textContent = `${data.app_name || "StuPilot"} v${data.version}`;
    }
  } catch {
    dot.className = "status-dot err";
    label.textContent = "API 未連線";
  }
}

// sidebar收合邏輯
function initSidebarToggle() {
  const btn = document.getElementById("sidebar-toggle");
  const layout = document.querySelector(".layout");
  if (!btn || !layout) return;

  // 還原上次狀態
  const collapsed = localStorage.getItem("sidebar-collapsed") === "true";
  layout.classList.toggle("sidebar-collapsed", collapsed);

  btn.addEventListener("click", () => {
    const isNowCollapsed = layout.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sidebar-collapsed", isNowCollapsed);
  });
}