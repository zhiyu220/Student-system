// ── 前端共用設定 ──
const APP_CONFIG = Object.freeze({
  appName: "Smart Campus",
  version: "0.1.1",
  apiBaseUrl: "",
});

// ── API client（所有頁面共用，請勿修改）──
function resolveApiBase() {
  const fromConfig = (APP_CONFIG.apiBaseUrl || "").trim();
  if (fromConfig) return fromConfig;

  const fromStorage = (window.localStorage.getItem("API_BASE_URL") || "").trim();
  if (fromStorage) return fromStorage;

  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isFileProtocol = window.location.protocol === "file:";
  if (isLocalHost || isFileProtocol) {
    return "http://localhost:8000";
  }

  return "https://student-system.zeabur.app";
}

const API_BASE = resolveApiBase();

const api = {
  async get(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  health:           () => api.get('/api/health'),
  courses:          () => api.get('/api/academic/courses'),
  schedule:         (id) => api.get(`/api/academic/students/${id}/schedule`),
  notifications:    () => api.get('/api/notification/'),
  recommendations:  (id) => api.get(`/api/ai/recommendations/${id}`),
};
