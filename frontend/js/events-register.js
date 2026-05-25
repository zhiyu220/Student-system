let currentEventId = null;
let eventDetails = null;

function formatDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleDateString("zh-TW")} ${start.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function showMessage(type, message) {
  const errorBox = document.getElementById("error-message");
  const successBox = document.getElementById("success-message");
  errorBox.style.display = "none";
  successBox.style.display = "none";

  const target = type === "error" ? errorBox : successBox;
  target.textContent = message;
  target.style.display = "block";
}

function renderCustomField(field) {
  const fieldId = `custom-field-${field.key}`;
  const requiredMark = field.required ? " *" : "";

  if (field.type === "boolean") {
    return `
      <div class="form-group" data-custom-field="${field.key}" style="grid-column: 1 / -1;">
        <label class="form-label" for="${fieldId}">${field.label}${requiredMark}</label>
        <select id="${fieldId}" class="form-select" data-field-key="${field.key}" data-field-label="${field.label}" data-field-type="${field.type}" ${field.required ? "required" : ""}>
          <option value="">請選擇</option>
          <option value="是">是</option>
          <option value="否">否</option>
        </select>
      </div>
    `;
  }

  return `
    <div class="form-group" data-custom-field="${field.key}">
      <label class="form-label" for="${fieldId}">${field.label}${requiredMark}</label>
      <input id="${fieldId}" class="form-input" type="text" placeholder="${field.placeholder || `請輸入${field.label}`}" data-field-key="${field.key}" data-field-label="${field.label}" data-field-type="${field.type || "text"}" ${field.required ? "required" : ""}>
    </div>
  `;
}

function renderCustomFields(config) {
  const container = document.getElementById("custom-fields-container");
  const emptyState = document.getElementById("custom-fields-empty");
  const fields = Array.isArray(config) ? config : [];

  if (!fields.length) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = fields.map(renderCustomField).join("");
}

function fillCurrentUserProfile(profile) {
  if (!profile) return;

  if (!document.getElementById("attendee-name").value && profile.name) {
    document.getElementById("attendee-name").value = profile.name;
  }
  if (!document.getElementById("attendee-phone").value && profile.phone) {
    document.getElementById("attendee-phone").value = profile.phone;
  }
  if (profile.student_id) {
    document.getElementById("student-id").value = profile.student_id;
  }
  if (profile.class_info) {
    document.getElementById("class-info").value = profile.class_info;
  }
}

function displayEventInfo() {
  if (!eventDetails) return;

  document.getElementById("event-title").textContent = eventDetails.title;
  document.getElementById("event-category").textContent = eventDetails.category;
  document.getElementById("event-service").textContent = `${eventDetails.service_hours_type} ${eventDetails.service_hours} 小時`;
  document.getElementById("event-status").textContent = eventDetails.is_registered ? "已報名" : eventDetails.status;
  document.getElementById("event-time").textContent = formatDateRange(eventDetails.start_at, eventDetails.end_at);
  document.getElementById("event-location").textContent = eventDetails.location;
  document.getElementById("event-organizer").textContent = eventDetails.organizer;
  document.getElementById("event-slots").textContent = eventDetails.slots_info;
  document.getElementById("event-description").textContent = eventDetails.description;

  fillCurrentUserProfile(eventDetails.current_user);
  renderCustomFields(eventDetails.registration_form_config);
}

async function loadEventDetails() {
  const eventId = sessionStorage.getItem("pendingEventId");
  if (!eventId) {
    window.location.href = "events.html";
    return;
  }

  currentEventId = eventId;

  try {
    const response = await api.get(`/api/events/${currentEventId}`);
    if (response.code !== 0) {
      throw new Error(response.message || "無法取得活動資料");
    }

    eventDetails = response.data;
    displayEventInfo();
  } catch (error) {
    showMessage("error", `活動資料載入失敗：${error.message}`);
  }
}

function collectCustomFields() {
  return Array.from(document.querySelectorAll("[data-custom-field]"))
    .map((group) => {
      const input = group.querySelector("[data-field-key]");
      if (!input) return null;

      return {
        key: input.dataset.fieldKey,
        label: input.dataset.fieldLabel,
        type: input.dataset.fieldType || "text",
        value: input.value.trim(),
      };
    })
    .filter(Boolean);
}

async function submitRegistration(payload) {
  const loading = document.getElementById("loading-indicator");
  const submitButton = document.getElementById("submit-btn");
  const formActions = document.getElementById("form-actions");

  loading.style.display = "block";
  submitButton.disabled = true;

  try {
    const response = await api.post(`/api/events/${currentEventId}/register`, payload);

    if (response.code !== 0) {
      throw new Error(response.message || "報名失敗");
    }

    const registrationStatus = response.data?.is_waitlist ? "已加入候補名單" : "報名成功";
    showMessage("success", `${registrationStatus}，即將跳轉至報名紀錄。`);
    formActions.style.display = "none";
    document.getElementById("register-form").style.pointerEvents = "none";
    document.getElementById("register-form").style.opacity = "0.6";
    sessionStorage.removeItem("pendingEventId");
    sessionStorage.removeItem("pendingEventTitle");

    setTimeout(() => {
      window.location.href = "events-records.html";
    }, 1500);
  } catch (error) {
    showMessage("error", `報名失敗：${error.message}`);
    submitButton.disabled = false;
  } finally {
    loading.style.display = "none";
  }
}

function goBack() {
  window.location.href = "events.html";
}

window.addEventListener("load", async () => {
  await checkAuth();
  initLayout("events-browse", "活動報名");
  loadEventDetails();

  document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentEventId) {
      showMessage("error", "找不到要報名的活動。");
      return;
    }

    const attendeeName = document.getElementById("attendee-name").value.trim();
    const attendeePhone = document.getElementById("attendee-phone").value.trim();
    const studentId = document.getElementById("student-id").value.trim();
    const classInfo = document.getElementById("class-info").value.trim();
    const registerNotes = document.getElementById("register-notes").value.trim();
    const agreeTerms = document.getElementById("agree-terms").checked;

    if (!attendeeName) {
      showMessage("error", "請輸入姓名。");
      return;
    }

    if (!attendeePhone) {
      showMessage("error", "請輸入聯絡電話。");
      return;
    }

    if (!studentId) {
      showMessage("error", "請輸入學號。");
      return;
    }

    if (!classInfo) {
      showMessage("error", "請輸入系級。");
      return;
    }

    if (!agreeTerms) {
      showMessage("error", "請先勾選同意事項。");
      return;
    }

    await submitRegistration({
      attendee_name: attendeeName,
      attendee_phone: attendeePhone,
      student_id: studentId,
      class_info: classInfo,
      register_notes: registerNotes,
      custom_fields: collectCustomFields(),
    });
  });
});
