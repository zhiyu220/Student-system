// ── API client（所有頁面共用，請勿修改）──
const API_BASE = 'http://localhost:8000';

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
