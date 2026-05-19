const NAV_SECTIONS = [
  {
    section: "主選單",
    items: [
      {
        id: "dashboard",
        label: "儀表板",
        icon: "📊",
        href: "dashboard.html",
        files: ["dashboard.html"],
        title: "儀表板",
      },
    ],
  },

  {
    section: "學業管理",
    items: [
      {
        id: "courses",
        label: "課程選課",
        icon: "📚",
        href: "courses.html",
        files: ["courses.html"],
        title: "課程選課",
      },
      {
        id: "course-history",
        label: "修課紀錄",
        icon: "📜",
        href: "course_history02.html",
        files: ["course_history02.html"],
        title: "修課紀錄",
      },
      {
        id: "graduation",
        label: "畢業審核",
        icon: "🎓",
        href: "graduation.html",
        files: ["graduation.html"],
        title: "畢業審核",
      },
    ],
  },

  {
    section: "校園生活",
    items: [
      {
        id: "events",
        label: "活動管理",
        icon: "📅",
        children: [
          {
            id: "events-browse",
            label: "活動列表",
            icon: "📋",
            href: "events.html",
            files: ["events.html", "events-browse.html"],
            title: "活動列表",
          },
          {
            id: "events-records",
            label: "報名紀錄",
            icon: "✅",
            href: "events-records.html",
            files: ["events-records.html"],
            title: "報名紀錄",
          },
          {
            id: "events-logs",
            label: "活動心得",
            icon: "✏️",
            href: "events-logs.html",
            files: ["events-logs.html"],
            title: "活動心得",
          },
        ],
      },
      {
        id: "jobs",
        label: "工讀資訊",
        icon: "💼",
        href: "jobs.html",
        files: ["jobs.html"],
        title: "工讀資訊",
      },
    ],
  },

  {
    section: "系統",
    items: [
      {
        id: "notifications",
        label: "通知中心",
        icon: "🔔",
        href: "notifications.html",
        files: ["notifications.html"],
        title: "通知中心",
        badge: null,
      },
    ],
  },
];

// 次頁面：不顯示在 sidebar，但需要能正確解析 activeId / title
// 從活動列表進入的 detail / register 頁面
const SECONDARY_ROUTES = [
  {
    id: "events-detail",
    files: ["events-detail.html"],
    title: "活動詳細",
    parentId: "events-browse",
  },
  {
    id: "events-register",
    files: ["events-register.html"],
    title: "活動報名",
    parentId: "events-browse",
  },
];

// 舊路由別名（向下相容）
const LEGACY_ROUTE_ALIASES = {
  events: "events-browse",
};

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
  return "Smart Campus"; 
}

// ── Sidebar HTML 產生器 ────────────────────────────────────────────────
function buildSidebarHTML(activeId, activeGroupId, appVersionLabel) {
  const sectionBlocks = NAV_SECTIONS.map(({ section, items }) => {
    const itemsHTML = items.map((item) => {
      if (item.children) {
        // 母分類（可展開群組）
        const isOpen = item.id === activeGroupId;
        const childrenHTML = item.children.map((child) => {
          const isActive = child.id === activeId;
          return `
            <a class="nav-item sub-item${isActive ? " active" : ""}" href="${child.href}">
              <span class="icon" aria-hidden="true">${child.icon}</span>
              ${child.label}
            </a>`;
        }).join("");

        return `
          <button class="group-toggle${isOpen ? " open" : ""}" aria-expanded="${isOpen}" data-group="${item.id}">
            <span class="icon" aria-hidden="true">${item.icon}</span>
            <span>${item.label}</span>
            <span class="toggle-icon" aria-hidden="true">▼</span>
          </button>
          <div class="sub-group" id="group-${item.id}" style="display:${isOpen ? "block" : "none"}">
            ${childrenHTML}
          </div>`;
      }

      // 一般項目
      const isActive = item.id === activeId;
      const badgeHTML = item.badge ? `<span class="nav-badge">${item.badge}</span>` : "";
      return `
        <a class="nav-item${isActive ? " active" : ""}" href="${item.href}">
          <span class="icon" aria-hidden="true">${item.icon}</span>
          ${item.label}
          ${badgeHTML}
        </a>`;
    }).join("");

    return `
      <div class="nav-section">${section}</div>
      ${itemsHTML}`;
  }).join("");

  return `
    <div class="sidebar-logo">
      <div class="logo-text">校園智慧系統</div>
      <div class="logo-sub">${appVersionLabel}</div>
    </div>
    <nav class="sidebar-nav" aria-label="主選單">
      ${sectionBlocks}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar" id="user-avatar">王</div>
        <div>
          <div class="user-name" id="user-name">王小明</div>
          <div class="user-role" id="user-role">學號 S001 · 資工系</div>
        </div>
      </div>
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

// ── 更新用戶資訊 ────────────────────────────────────────────────────────
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
      logoSub.textContent = `${data.app_name || "Smart Campus"} v${data.version}`;
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