// dashboard.js
const MOCK_COURSES = [
  { name: '程式設計概論', credits: 3, instructor: '陳教授' },
  { name: '資料結構',     credits: 3, instructor: '陳教授' },
  { name: '作業系統',     credits: 3, instructor: '林教授' },
];

async function loadDashCourses() {
  const tbody = document.getElementById('dash-courses');
  try {
    const data = await api.courses();
    const courses = (data.courses || MOCK_COURSES).slice(0, 3);
    renderCourses(tbody, courses);
  } catch {
    renderCourses(tbody, MOCK_COURSES);
  }
}

function renderCourses(tbody, courses) {
  tbody.innerHTML = courses.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.credits}</td>
      <td>${c.instructor || '—'}</td>
      <td><span class="badge badge-blue">已選</span></td>
    </tr>
  `).join('');
}

window.addEventListener('load', () => {
  initLayout('dashboard', '儀表板');
  loadDashCourses();
});
