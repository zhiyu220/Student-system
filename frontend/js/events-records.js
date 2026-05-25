function setPageState(mode, message = "") {
  document.getElementById("loading-indicator").style.display = mode === "loading" ? "block" : "none";
  document.getElementById("error-state").style.display = mode === "error" ? "block" : "none";
  document.getElementById("empty-state").style.display = mode === "empty" ? "block" : "none";
  document.getElementById("records-container").style.display = mode === "ready" ? "flex" : "none";

  if (mode === "error") {
    document.getElementById("error-text").textContent = message;
  }
}

function getStatusClass(status) {
  if (status === "已報名") return "status-registered";
  if (status === "候補中") return "status-waitlist";
  return "status-cancelled";
}

function escapeAttribute(text) {
  return String(text).replace(/'/g, "\\'");
}

function renderCustomFields(customFields) {
  if (!Array.isArray(customFields) || !customFields.length) {
    return "";
  }

  return customFields
    .filter((field) => field && field.value)
    .map((field) => `${field.label}：${field.value}`)
    .join("<br>");
}

function renderRegistrations(registrations) {
  const container = document.getElementById("records-container");

  if (!registrations.length) {
    setPageState("empty");
    return;
  }

  container.innerHTML = registrations
    .map((registration) => {
      const event = registration.event;
      const registeredAt = new Date(registration.registered_at);
      const eventStart = new Date(event.start_at);
      const eventEnd = new Date(event.end_at);
      const isPast = new Date() > eventStart;
      const customFieldMarkup = renderCustomFields(registration.custom_fields);

      return `
        <article class="record-card">
          <div>
            <div class="record-title">${event.title}</div>
            <div class="record-meta">
              <span class="record-meta-item">${event.category}</span>
              <span class="record-meta-item">${event.service_hours_type} ${event.service_hours} 小時</span>
              <span class="record-meta-item">${event.organizer}</span>
            </div>
            <div class="record-detail">
              活動時間：${eventStart.toLocaleDateString("zh-TW")} ${eventStart.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} - ${eventEnd.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}<br>
              活動地點：${event.location}<br>
              報名時間：${registeredAt.toLocaleDateString("zh-TW")} ${registeredAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}<br>
              學號：${registration.student_id || "未提供"}<br>
              系級：${registration.class_info || "未提供"}<br>
              名額狀態：${event.slots_info}
              ${customFieldMarkup ? `<br>${customFieldMarkup}` : ""}
            </div>
          </div>
          <div class="record-side">
            <span class="status-badge ${getStatusClass(registration.status)}">${registration.status}</span>
            <div class="record-note">
              ${registration.register_notes ? `備註：${registration.register_notes}` : "尚未填寫報名備註。"}
            </div>
            ${isPast ? `<button class="btn btn-primary" onclick="goToLogs('${escapeAttribute(event.id)}')">填寫心得</button>` : ""}
            <button class="btn btn-ghost" onclick="viewEventDetail('${escapeAttribute(event.id)}')">查看活動</button>
          </div>
        </article>
      `;
    })
    .join("");

  setPageState("ready");
}

async function loadRegistrations() {
  setPageState("loading");

  try {
    const response = await api.get("/api/events/registrations");
    if (response.code !== 0) {
      throw new Error(response.message || "API 回傳失敗");
    }

    renderRegistrations(response.data || []);
  } catch (error) {
    setPageState("error", error.message || "無法取得報名紀錄");
  }
}

function goToLogs(eventId) {
  sessionStorage.setItem("selectedEventId", eventId);
  window.location.href = "events-logs.html";
}

function viewEventDetail(eventId) {
  sessionStorage.setItem("eventDetailToOpen", eventId);
  window.location.href = "events.html";
}

window.addEventListener("load", async () => {
  await checkAuth();
  initLayout("events-records", "報名紀錄");
  loadRegistrations();
});
