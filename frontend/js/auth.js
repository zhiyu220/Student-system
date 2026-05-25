// ── Auth helpers（所有需要登入的頁面引入）────────────────────────────

async function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const user = await api.me();
    saveUser(user);
    const page = window.location.pathname.split('/').pop();
    if (user.must_change_password && page !== 'change-password.html') {
      window.location.href = 'change-password.html';
    }
  } catch {
    clearToken();
    clearUser();
    window.location.href = 'login.html';
  }
}

async function logout() {
  try { await api.logout(); } catch { /* ignore */ }
  clearToken();
  clearUser();
  window.location.href = 'login.html';
}
