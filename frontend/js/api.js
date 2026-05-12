// ── API client（所有頁面共用）──
// 支持本地開發和線上部署
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://student-system.zeabur.app';

const api = {
  async get(path) {
    const res = await fetch(API_BASE + path, {
      headers: api.getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...api.getAuthHeaders()
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },
  health:           () => api.get('/api/health'),
  courses:          () => api.get('/api/academic/courses'),
  schedule:         (id) => api.get(`/api/academic/students/${id}/schedule`),
  notifications:    () => api.get('/api/notification/'),
  recommendations:  (id) => api.get(`/api/ai/recommendations/${id}`),
};

// 認證模組
const auth = {
  token: localStorage.getItem('auth_token'),
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  mustChangePassword: localStorage.getItem('auth_must_change_password') === 'true',

  isLoggedIn() {
    return this.token !== null && !this.mustChangePassword;
  },

  getUser() {
    return this.user;
  },

  async login(studentId, password) {
    try {
      const response = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '登入失敗');
      }

      const data = await response.json();
      
      // 保存 token 和用戶資訊
      this.token = data.token;
      this.user = data.user;
      this.mustChangePassword = data.must_change_password;

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      if (data.must_change_password) {
        localStorage.setItem('auth_must_change_password', 'true');
      } else {
        localStorage.removeItem('auth_must_change_password');
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  logout() {
    this.token = null;
    this.user = null;
    this.mustChangePassword = false;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_must_change_password');
  },

  async changePassword(password, confirmPassword) {
    try {
      const response = await fetch(API_BASE + '/api/auth/change-password?token=' + encodeURIComponent(this.token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm_password: confirmPassword })
      });

      if (!response.ok) {
        throw new Error('密碼修改失敗');
      }

      const data = await response.json();
      this.token = data.token;
      this.mustChangePassword = false;
      localStorage.setItem('auth_token', data.token);
      localStorage.removeItem('auth_must_change_password');
      return true;
    } catch (error) {
      throw error;
    }
  }
};

