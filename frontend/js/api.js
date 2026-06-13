// ── 前端共用設定 ──
const APP_CONFIG = Object.freeze({
  appName: "StuPilot",
  version: "0.1.2",
  apiBaseUrl: "",
});

// ── Token / User 管理 ────────────────────────────────────────────────
function saveToken(token) { localStorage.setItem('auth_token', token); }
function getToken()       { return localStorage.getItem('auth_token'); }
function clearToken()     { localStorage.removeItem('auth_token'); }
function saveUser(user)   { localStorage.setItem('auth_user', JSON.stringify(user)); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
}
function clearUser()      { localStorage.removeItem('auth_user'); }

// ── API Base URL ─────────────────────────────────────────────────────
function resolveApiBase() {
  const fromConfig = (APP_CONFIG.apiBaseUrl || "").trim();
  if (fromConfig) return fromConfig;

  const fromStorage = (window.localStorage.getItem("API_BASE_URL") || "").trim();
  if (fromStorage) return fromStorage;

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isFile  = window.location.protocol === "file:";
  if (isLocal || isFile) return "http://localhost:8000";

  return "https://student-system.zeabur.app";
}

const API_BASE = resolveApiBase();

// ── API client ───────────────────────────────────────────────────────
const api = {
  async get(path) {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(API_BASE + path, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async put(path, body) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async post(path, body) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Existing endpoints ─────────────────────────────────────────────
  health:          () => api.get('/api/health'),
  courses:         () => api.get('/api/academic/courses'),
  schedule:        (id) => api.get(`/api/academic/students/${id}/schedule`),
  notifications:   () => api.get('/api/notification/'),
  recommendations: (id) => api.get(`/api/ai/recommendations/${id}`),

  // ── Auth endpoints ─────────────────────────────────────────────────
  login:          (student_id, password) => api.post('/api/auth/login', { student_id, password }),
  logout:         ()                     => api.post('/api/auth/logout', {}),
  me:             ()                     => api.get('/api/auth/me'),
  changePassword: (old_password, new_password) =>
    api.post('/api/auth/change-password', { old_password, new_password }),

  // ── Academic endpoints ─────────────────────────────────────────────
  courseRecords: (id) => api.get(`/api/course-records/${id}`),
  graduation:    (id) => api.get(`/api/graduation/${id}`),
  performance:   (id) => api.get(`/api/academic/students/${id}/performance`),

  // ── Admin / data-review endpoints ──────────────────────────────────
  adminEnrollments:  () => api.get('/api/admin/enrollments'),
  adminCourses:      () => api.get('/api/admin/courses'),
  adminUsers:        () => api.get('/api/admin/users'),
  adminDepartments:  () => api.get('/api/admin/departments'),

  adminUpdateEnrollment:  (id, d) => api.put(`/api/admin/enrollments/${id}`, d),
  adminUpdateCourse:      (id, d) => api.put(`/api/admin/courses/${id}`,     d),
  adminUpdateUser:        (id, d) => api.put(`/api/admin/users/${id}`,       d),
  adminUpdateDepartment:  (id, d) => api.put(`/api/admin/departments/${id}`, d),

  adminCreateEnrollment:  (d)  => api.post('/api/admin/enrollments',        d),
  adminCreateCourse:      (d)  => api.post('/api/admin/courses',            d),
  adminCreateUser:        (d)  => api.post('/api/admin/users',              d),
  adminCreateDepartment:  (d)  => api.post('/api/admin/departments',        d),

  adminDeleteEnrollment:  (id) => api.delete(`/api/admin/enrollments/${id}`),
  adminDeleteCourse:      (id) => api.delete(`/api/admin/courses/${id}`),
  adminDeleteUser:        (id) => api.delete(`/api/admin/users/${id}`),
  adminDeleteDepartment:  (id) => api.delete(`/api/admin/departments/${id}`),
};

// extend api with delete method
api.delete = async function(path) {
  const token = getToken();
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(API_BASE + path, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
