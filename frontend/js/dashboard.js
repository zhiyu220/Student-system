// dashboard.js — StuPilot redesigned dashboard
window.addEventListener('load', async () => {
  if (typeof checkAuth === 'function') {
    try { await checkAuth(); } catch (e) {}
  }
  if (typeof initLayout === 'function') {
    initLayout('dashboard', 'Dashboard');
  }

  // Personalize greeting if a logged in user is available
  try {
    const u = (typeof getUser === 'function') ? getUser() : null;
    if (u && u.name) {
      const el = document.getElementById('dash-username');
      if (el) el.textContent = u.name;
    }
  } catch (e) {}

  // Simple tab toggle
  const tabs = document.querySelectorAll('#dash-tabs .dash-tab');
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
    });
  });
});
