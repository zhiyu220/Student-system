// courses.js
const MOCK = [
  { id:1, code:'CS101', name:'程式設計概論', credits:3, instructor:'陳教授', semester:'2025-1' },
  { id:2, code:'CS201', name:'資料結構',     credits:3, instructor:'陳教授', semester:'2025-1' },
  { id:3, code:'CS301', name:'作業系統',     credits:3, instructor:'林教授', semester:'2025-1' },
  { id:4, code:'CS401', name:'計算機網路',   credits:3, instructor:'王教授', semester:'2025-1' },
  { id:5, code:'GE101', name:'邏輯思維',     credits:2, instructor:'張教授', semester:'2025-1' },
];

let allCourses = [];

async function loadCourses() {
  try {
    const data = await api.courses();
    allCourses = data.courses || MOCK;
  } catch {
    allCourses = MOCK;
    document.getElementById('mock-notice').classList.add('show');
  }
  render(allCourses);
}

function render(list) {
  const tbody = document.getElementById('courses-body');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">查無課程</td></tr>'; return; }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><span class="mono" style="font-size:12px">${c.code}</span></td>
      <td>${c.name}</td>
      <td>${c.credits}</td>
      <td>${c.instructor || '—'}</td>
      <td>${c.semester}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="enroll(${c.id},'${c.name}')">選課</button>
      </td>
    </tr>
  `).join('');
}

function filterCourses() {
  const q = document.getElementById('search').value.toLowerCase();
  render(allCourses.filter(c =>
    c.name.includes(q) || c.code.toLowerCase().includes(q) || (c.instructor||'').includes(q)
  ));
}

function enroll(id, name) {
  // TODO: 串接 POST /api/academic/enrollments
  alert(`已送出選課申請：${name}`);
}

window.addEventListener('load', () => {
  initLayout('courses', '課程選課');
  loadCourses();
});
