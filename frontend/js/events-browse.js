let allEvents = [];
let currentFilters = {
  q: "",
  organizer: "",
  serviceType: "",
  status: "",
  sortBy: "start_at",
  sortOrder: "asc",
};

function getStatusBadgeClass(event) {
  if (event.is_registered) return "badge-registered";
  if (event.status === "可報名") return "badge-open";
  if (event.status === "候補中") return "badge-waitlist";
  return "badge-full";
}

function getDisplayStatus(event) {
  return event.is_registered ? "已報名" : event.status;
}

function formatDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateText = start.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", weekday: "short" });
  const startTime = start.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  return {
    dateText,
    startTime,
    endTime,
    fullText: `${start.toLocaleDateString("zh-TW")} ${startTime} - ${endTime}`,
  };
}

function setLoadingState(mode, message = "") {
  document.getElementById("loading-state").style.display = mode === "loading" ? "block" : "none";
  document.getElementById("error-state").style.display = mode === "error" ? "block" : "none";
  document.getElementById("empty-state").style.display = mode === "empty" ? "block" : "none";
  document.getElementById("events-list").style.display = mode === "ready" ? "block" : "none";

  if (mode === "error") {
    document.getElementById("error-text").textContent = message;
  }
}

function populateFilterOptions(filters) {
  const organizerFilter = document.getElementById("organizer-filter");
  const serviceTypeFilter = document.getElementById("service-type-filter");
  const statusFilter = document.getElementById("status-filter");

  organizerFilter.innerHTML = '<option value="">全部單位</option>';
  serviceTypeFilter.innerHTML = '<option value="">全部類別</option>';
  statusFilter.innerHTML = '<option value="">全部狀態</option>';

  filters.organizers.forEach((item) => {
    organizerFilter.insertAdjacentHTML("beforeend", `<option value="${item}">${item}</option>`);
  });
  filters.service_types.forEach((item) => {
    serviceTypeFilter.insertAdjacentHTML("beforeend", `<option value="${item}">${item}</option>`);
  });
  filters.statuses.forEach((item) => {
    statusFilter.insertAdjacentHTML("beforeend", `<option value="${item}">${item}</option>`);
  });
}

function updateResultsMeta(events) {
  const sortText = {
    "start_at:asc": "依活動時間由近到遠",
    "start_at:desc": "依活動時間由遠到近",
    "created_at:desc": "依建立時間最新優先",
    "registered:desc": "依報名人數最多優先",
  }[`${currentFilters.sortBy}:${currentFilters.sortOrder}`] || "依預設排序";

  document.getElementById("results-meta").textContent = `共 ${events.length} 筆活動，${sortText}`;
}

function buildQueryString() {
  const params = new URLSearchParams();
  if (currentFilters.q) params.append("q", currentFilters.q);
  if (currentFilters.organizer) params.append("organizer", currentFilters.organizer);
  if (currentFilters.serviceType) params.append("service_type", currentFilters.serviceType);
  if (currentFilters.status) params.append("status", currentFilters.status);
  params.append("sort_by", currentFilters.sortBy);
  params.append("sort_order", currentFilters.sortOrder);
  return params.toString();
}

function renderEvents(events) {
  const rowsContainer = document.getElementById("events-rows");

  if (!events.length) {
    setLoadingState("empty");
    updateResultsMeta(events);
    return;
  }

  rowsContainer.innerHTML = events
    .map((event) => {
      const dateRange = formatDateRange(event.start_at, event.end_at);
      const registerDisabled = event.is_registered || event.status === "已額滿";
      const registerLabel = event.is_registered ? "已報名" : event.status === "候補中" ? "加入候補" : "立即報名";
      
      let statusClass = "open";
      let statusText = "可報名";
      if (event.is_registered) {
        statusClass = "registered";
        statusText = "已報名";
      } else if (event.status === "候補中") {
        statusClass = "waitlist";
        statusText = "候補中";
      } else if (event.status === "已額滿") {
        statusClass = "full";
        statusText = "已額滿";
      }

      return `
        <div class="event-row" onclick="goToEventDetail('${escapeAttribute(event.id)}')">
          <div class="event-col event-col-time">
            <div class="event-col-time">${dateRange.dateText}</div>
            <div class="event-col-time-main">${dateRange.startTime}</div>
          </div>
          <div class="event-col event-col-title" title="${event.title}">
            ${event.title}
          </div>
          <div class="event-col event-col-organizer" title="${event.organizer}">
            ${event.organizer}
          </div>
          <div class="event-col event-col-service">
            ${event.service_hours} h
          </div>
          <div class="event-col event-col-status">
            <span class="status-dot ${statusClass}"></span>
            <span>${statusText}</span>
          </div>
          <div class="event-col event-col-action" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="goToRegister('${escapeAttribute(event.id)}', '${escapeAttribute(event.title)}')" ${registerDisabled ? "disabled" : ""}>${registerLabel}</button>
          </div>
        </div>
      `;
    })
    .join("");

  document.getElementById("events-list").style.display = "block";
  setLoadingState("ready");
  updateResultsMeta(events);
}

function goToEventDetail(eventId) {
  sessionStorage.setItem("viewEventId", eventId);
  window.location.href = "events-detail.html";
}

async function loadEvents() {
  setLoadingState("loading");

  try {
    const response = await api.get(`/api/events?${buildQueryString()}`);
    if (response.code !== 0) {
      throw new Error(response.message || "API 回傳格式錯誤");
    }

    allEvents = response.data || [];
    populateFilterOptions(response.filters);
    syncFilterSelection();
    renderEvents(allEvents);
  } catch (error) {
    setLoadingState("error", error.message || "無法取得活動資料");
  }
}

function syncFilterSelection() {
  document.getElementById("search-input").value = currentFilters.q;
  document.getElementById("organizer-filter").value = currentFilters.organizer;
  document.getElementById("service-type-filter").value = currentFilters.serviceType;
  document.getElementById("status-filter").value = currentFilters.status;
  document.getElementById("sort-filter").value = `${currentFilters.sortBy}:${currentFilters.sortOrder}`;
}

function applyFilters() {
  currentFilters.q = document.getElementById("search-input").value.trim();
  currentFilters.organizer = document.getElementById("organizer-filter").value;
  currentFilters.serviceType = document.getElementById("service-type-filter").value;
  currentFilters.status = document.getElementById("status-filter").value;

  const [sortBy, sortOrder] = document.getElementById("sort-filter").value.split(":");
  currentFilters.sortBy = sortBy;
  currentFilters.sortOrder = sortOrder;

  loadEvents();
}

function resetFilters() {
  currentFilters = {
    q: "",
    organizer: "",
    serviceType: "",
    status: "",
    sortBy: "start_at",
    sortOrder: "asc",
  };
  syncFilterSelection();
  loadEvents();
}

function goToRegister(id, title) {
  sessionStorage.setItem("pendingEventId", id);
  sessionStorage.setItem("pendingEventTitle", title);
  window.location.href = "events-register.html";
}

function escapeAttribute(text) {
  return String(text).replace(/'/g, "\\'");
}

window.addEventListener("load", async () => {
  await checkAuth();
  initLayout("events-browse", "活動列表");

  document.getElementById("apply-button").addEventListener("click", applyFilters);
  document.getElementById("reset-button").addEventListener("click", resetFilters);
  document.getElementById("search-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyFilters();
    }
  });

  loadEvents();
});
