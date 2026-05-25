let currentSelectedEventId = null;
let currentRating = 0;
let registeredEvents = [];
let allLogs = [];

const REQUIRED_EVENT_HOURS = 18;
const REQUIRED_COURSE_HOURS = 18;

function setMessage(type, message) {
  const successBox = document.getElementById("success-message");
  const errorBox = document.getElementById("error-message");
  successBox.style.display = "none";
  errorBox.style.display = "none";

  const target = type === "success" ? successBox : errorBox;
  target.textContent = message;
  target.style.display = "block";
}

function setStars(score) {
  currentRating = score;
  document.querySelectorAll("#rating-group .star").forEach((star) => {
    const value = Number.parseInt(star.dataset.score, 10);
    star.classList.toggle("active", value <= score);
  });
}

function classifyLogGroup(event) {
  return event.service_hours_type === "活動" ? "event" : "course";
}

function updateStatsDisplay() {
  let eventHours = 0;
  let courseHours = 0;
  let totalRating = 0;
  let ratingCount = 0;

  allLogs.forEach((item) => {
    item.logs.forEach((log) => {
      if (classifyLogGroup(item.event) === "event") {
        eventHours += Number(log.service_hours || 0);
      } else {
        courseHours += Number(log.service_hours || 0);
      }

      if (log.rating > 0) {
        totalRating += Number(log.rating);
        ratingCount += 1;
      }
    });
  });

  const eventPercent = Math.min((eventHours / REQUIRED_EVENT_HOURS) * 100, 100);
  const coursePercent = Math.min((courseHours / REQUIRED_COURSE_HOURS) * 100, 100);
  const eventComplete = eventHours >= REQUIRED_EVENT_HOURS;
  const courseComplete = courseHours >= REQUIRED_COURSE_HOURS;

  document.getElementById("event-hours").textContent = eventHours.toFixed(1);
  document.getElementById("course-hours").textContent = courseHours.toFixed(1);
  document.getElementById("event-total").textContent = eventHours.toFixed(1);
  document.getElementById("course-total").textContent = courseHours.toFixed(1);

  const eventProgress = document.getElementById("event-progress");
  const courseProgress = document.getElementById("course-progress");
  eventProgress.style.width = `${eventPercent}%`;
  courseProgress.style.width = `${coursePercent}%`;
  eventProgress.className = `progress-fill${eventComplete ? " complete" : eventPercent >= 80 ? " warning" : ""}`;
  courseProgress.className = `progress-fill${courseComplete ? " complete" : coursePercent >= 80 ? " warning" : ""}`;

  document.querySelector("#event-stat-box .stat-box-sub").textContent = eventComplete ? "已達成活動時數門檻" : `完成 ${Math.round(eventPercent)}%`;
  document.querySelector("#course-stat-box .stat-box-sub").textContent = courseComplete ? "已達成課程時數門檻" : `完成 ${Math.round(coursePercent)}%`;

  const ratingContainer = document.getElementById("rating-stats-container");
  if (ratingCount > 0) {
    const average = (totalRating / ratingCount).toFixed(1);
    document.getElementById("avg-rating").textContent = average;
    document.getElementById("avg-rating-count").textContent = `共 ${ratingCount} 筆評分`;
    document.getElementById("avg-rating-stars").textContent = "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average));
    ratingContainer.style.display = "block";
  } else {
    ratingContainer.style.display = "none";
  }
}

async function loadAllLogs() {
  const promises = registeredEvents.map(async (registration) => {
    try {
      const response = await api.get(`/api/events/${registration.event.id}/logs`);
      return {
        event: registration.event,
        logs: response.data || [],
      };
    } catch {
      return {
        event: registration.event,
        logs: [],
      };
    }
  });

  allLogs = await Promise.all(promises);
}

function escapeAttribute(text) {
  return String(text).replace(/'/g, "\\'");
}

function renderSelectableEvents() {
  const list = document.getElementById("events-fill-list");

  list.innerHTML = registeredEvents
    .map((registration) => {
      const event = registration.event;
      const logItem = allLogs.find((item) => item.event.id === event.id);
      const hasSubmitted = (logItem?.logs?.length || 0) > 0;

      return `
        <article class="event-item" onclick="selectEventToLog('${escapeAttribute(event.id)}')">
          <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
            <div>
              <div class="event-item-name">${event.title}</div>
              <div class="event-item-meta">
                ${event.organizer}<br>
                ${event.location}<br>
                ${new Date(event.start_at).toLocaleDateString("zh-TW")} ${new Date(event.start_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span class="status-badge ${hasSubmitted ? "status-done" : "status-pending"}">${hasSubmitted ? "已提交心得" : "尚未提交"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadRegisteredEvents() {
  document.getElementById("loading-fill").style.display = "block";
  document.getElementById("fill-empty").style.display = "none";

  try {
    const response = await api.get("/api/events/registrations");
    if (response.code !== 0) {
      throw new Error(response.message || "無法取得報名紀錄");
    }

    registeredEvents = (response.data || []).filter((registration) => new Date() > new Date(registration.event.start_at));
    await loadAllLogs();
    updateStatsDisplay();

    if (!registeredEvents.length) {
      document.getElementById("events-fill-list").innerHTML = "";
      document.getElementById("fill-empty").style.display = "block";
      return;
    }

    renderSelectableEvents();
  } catch (error) {
    document.getElementById("events-fill-list").innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
  } finally {
    document.getElementById("loading-fill").style.display = "none";
  }
}

function selectEventToLog(eventId) {
  currentSelectedEventId = eventId;
  const event = registeredEvents.find((item) => item.event.id === eventId)?.event;
  if (!event) return;

  document.getElementById("form-event-title").textContent = event.title;
  document.getElementById("form-event-meta").textContent =
    `${event.organizer}｜${event.location}｜${new Date(event.start_at).toLocaleDateString("zh-TW")} ${new Date(event.start_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
  document.getElementById("form-section").style.display = "block";
  document.getElementById("log-form").reset();
  setStars(0);
  document.getElementById("success-message").style.display = "none";
  document.getElementById("error-message").style.display = "none";
}

function closeForm() {
  currentSelectedEventId = null;
  setStars(0);
  document.getElementById("form-section").style.display = "none";
}

async function submitLog(event) {
  event.preventDefault();

  if (!currentSelectedEventId) {
    setMessage("error", "請先選擇一場活動。");
    return;
  }

  const content = document.getElementById("content").value.trim();
  const serviceHours = Number.parseFloat(document.getElementById("service-hours").value || "0");

  if (!content) {
    setMessage("error", "請填寫心得內容。");
    return;
  }

  try {
    const response = await api.post(`/api/events/${currentSelectedEventId}/logs`, {
      content,
      service_hours: Number.isNaN(serviceHours) ? 0 : serviceHours,
      rating: currentRating,
    });

    if (response.code !== 0) {
      throw new Error(response.message || "提交失敗");
    }

    setMessage("success", "心得已送出。");
    closeForm();
    await loadRegisteredEvents();
    if (document.getElementById("view-logs").classList.contains("active")) {
      await loadEventLogs();
    }
  } catch (error) {
    setMessage("error", `提交失敗：${error.message}`);
  }
}

async function loadEventLogs() {
  document.getElementById("loading-logs").style.display = "block";
  document.getElementById("logs-empty").style.display = "none";
  document.getElementById("logs-container").innerHTML = "";

  try {
    const response = await api.get("/api/events/registrations");
    if (response.code !== 0) {
      throw new Error(response.message || "無法取得紀錄");
    }

    const logsByEvent = await Promise.all(
      (response.data || []).map(async (registration) => {
        try {
          const logResponse = await api.get(`/api/events/${registration.event.id}/logs`);
          return {
            event: registration.event,
            logs: logResponse.data || [],
          };
        } catch {
          return { event: registration.event, logs: [] };
        }
      })
    );

    const filtered = logsByEvent.filter((item) => item.logs.length > 0);
    if (!filtered.length) {
      document.getElementById("logs-empty").style.display = "block";
      return;
    }

    renderEventLogs(filtered);
  } catch (error) {
    document.getElementById("logs-container").innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
  } finally {
    document.getElementById("loading-logs").style.display = "none";
  }
}

function renderEventLogs(logGroups) {
  const container = document.getElementById("logs-container");
  container.innerHTML = logGroups
    .map((group) => {
      const entries = group.logs
        .map((log) => {
          const submittedAt = new Date(log.submitted_at);
          return `
            <div class="log-entry">
              <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                <div style="font-size:12px; color:var(--text-muted);">
                  送出時間：${submittedAt.toLocaleDateString("zh-TW")} ${submittedAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style="color:#f59e0b;">${log.rating > 0 ? "★".repeat(log.rating) + "☆".repeat(5 - log.rating) : "未評分"}</div>
              </div>
              <div style="margin-top:10px; line-height:1.8; white-space:pre-wrap;">${escapeHtml(log.content)}</div>
              <div style="margin-top:10px; color:var(--text-muted); font-size:13px;">認列時數：${log.service_hours || 0} 小時</div>
            </div>
          `;
        })
        .join("");

      return `
        <article class="log-card">
          <div class="log-card-title">${group.event.title}</div>
          <div style="color:var(--text-muted); font-size:13px; margin-bottom:10px;">${group.event.organizer}｜${group.event.location}</div>
          ${entries}
        </article>
      `;
    })
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });

  if (tabName === "view-logs") {
    loadEventLogs();
  }
}

function toggleStats() {
  document.getElementById("stats-content").classList.toggle("expanded");
  document.getElementById("stats-toggle").classList.toggle("expanded");
}

window.addEventListener("load", async () => {
  await checkAuth();
  initLayout("events-logs", "活動心得");
  loadRegisteredEvents();

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll("#rating-group .star").forEach((star) => {
    star.addEventListener("click", () => setStars(Number.parseInt(star.dataset.score, 10)));
  });

  document.getElementById("log-form").addEventListener("submit", submitLog);
});
