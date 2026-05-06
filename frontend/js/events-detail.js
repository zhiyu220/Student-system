let currentEventId = null;
let currentEvent = null;

function formatDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateText = start.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const startTime = start.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  return {
    dateText,
    startTime,
    endTime,
    fullText: `${dateText} ${startTime} - ${endTime}`,
  };
}

function setLoadingState(state) {
  const loading = document.getElementById("loading-state");
  const error = document.getElementById("error-state");
  const content = document.getElementById("detail-content");
  
  if (state === "loading") {
    loading.style.display = "block";
    error.style.display = "none";
    content.style.display = "none";
  } else if (state === "error") {
    loading.style.display = "none";
    error.style.display = "block";
    content.style.display = "none";
  } else if (state === "ready") {
    loading.style.display = "none";
    error.style.display = "none";
    content.style.display = "block";
  }
}

function renderEventDetail(event) {
  currentEvent = event;

  // Hero 部分
  document.getElementById("detail-title").textContent = event.title;
  document.getElementById("detail-organizer-meta").textContent = event.organizer;
  
  const dateRange = formatDateRange(event.start_at, event.end_at);
  document.getElementById("detail-time-meta").textContent = dateRange.fullText;
  document.getElementById("detail-service-meta").textContent = `${event.service_hours_type} ${event.service_hours} 小時`;

  // 基本信息
  document.getElementById("detail-datetime").textContent = dateRange.fullText;
  document.getElementById("detail-organizer").textContent = event.organizer;
  document.getElementById("detail-location").textContent = event.location || "-";
  document.getElementById("detail-service").textContent = `${event.service_hours_type} - ${event.service_hours} 小時`;

  // 活動說明
  document.getElementById("detail-summary").textContent = event.summary || event.description;
  document.getElementById("detail-description").textContent = event.description || "暫無詳細說明";

  // 報名信息
  document.getElementById("detail-registered").textContent = event.registered || 0;
  
  if (event.max_participants) {
    document.getElementById("detail-max").textContent = event.max_participants;
    const available = Math.max(0, event.max_participants - (event.registered || 0));
    document.getElementById("detail-available").textContent = available;
    
    // 顯示進度條
    const progressContainer = document.getElementById("detail-progress-container");
    progressContainer.style.display = "block";
    const percentage = (event.registered / event.max_participants) * 100;
    document.getElementById("detail-progress-fill").style.width = percentage + "%";
    document.getElementById("detail-progress-text").textContent = `${event.registered}/${event.max_participants}`;
  } else {
    document.getElementById("detail-max").textContent = "無限制";
    document.getElementById("detail-available").textContent = "無限制";
    document.getElementById("detail-progress-container").style.display = "none";
  }

  // 標籤
  if (event.tags && event.tags.length > 0) {
    document.getElementById("tags-section").style.display = "block";
    document.getElementById("detail-tags").innerHTML = event.tags
      .map(tag => `<span class="tag">${tag}</span>`)
      .join("");
  } else {
    document.getElementById("tags-section").style.display = "none";
  }

  // 報名按鈕狀態
  const registerBtn = document.getElementById("detail-register-btn");
  if (event.is_registered) {
    registerBtn.textContent = "已報名";
    registerBtn.disabled = true;
  } else if (event.status === "已額滿") {
    registerBtn.textContent = event.is_waitlist_allowed ? "加入候補" : "已額滿";
    registerBtn.disabled = !event.is_waitlist_allowed;
  } else if (event.status === "候補中") {
    registerBtn.textContent = "加入候補";
  } else {
    registerBtn.textContent = "立即報名";
    registerBtn.disabled = false;
  }

  setLoadingState("ready");
}

async function loadEventDetail() {
  setLoadingState("loading");

  try {
    currentEventId = sessionStorage.getItem("viewEventId");
    if (!currentEventId) {
      throw new Error("無效的活動ID");
    }

    const response = await api.get(`/api/events/${currentEventId}`);
    if (response.code !== 0) {
      throw new Error(response.message || "無法取得活動資料");
    }

    renderEventDetail(response.data);
  } catch (error) {
    setLoadingState("error");
    document.getElementById("error-text").textContent = error.message || "載入失敗，請稍後重試";
  }
}

function registerFromDetail() {
  if (!currentEventId || !currentEvent) return;
  
  sessionStorage.setItem("pendingEventId", currentEventId);
  sessionStorage.setItem("pendingEventTitle", currentEvent.title);
  window.location.href = "events-register.html";
}

window.addEventListener("load", () => {
  initLayout("events-detail", "活動詳細");
  loadEventDetail();
});
