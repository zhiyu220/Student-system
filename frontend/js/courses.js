// courses.js

let allCourses = [];

async function loadCourses() {
  try {
    const data = await api.courses();
    allCourses = data.courses || [];
    
    if (allCourses.length === 0) {
      document.getElementById('mock-notice')?.classList.remove('show');
    }
  } catch (error) {
    console.error('Failed to load courses:', error);
    allCourses = [];
    // 顯示錯誤提示，但不使用 mock data
    const notice = document.getElementById('mock-notice');
    if (notice) {
      notice.textContent = '無法加載課程資料，請稍後重試';
      notice.classList.add('show');
    }
  }
  render(allCourses);
}

function render(list) {
  const tbody = document.getElementById('courses-body');
  if (!list.length) { 
    tbody.innerHTML = '<tr><td colspan="6" class="empty">查無課程</td></tr>'; 
    return; 
  }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><span class="mono" style="font-size:12px">${c.code || '—'}</span></td>
      <td>${c.name}</td>
      <td>${c.credits || '—'}</td>
      <td>${c.instructor || '—'}</td>
      <td>${c.semester ? `${c.academic_year}-${c.semester}` : '—'}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="enroll('${c.id}','${c.name}')">選課</button>
      </td>
    </tr>
  `).join('');
}

function filterCourses() {
  const q = document.getElementById('search').value.toLowerCase();
  render(allCourses.filter(c =>
    c.name.toLowerCase().includes(q) || 
    (c.code || '').toLowerCase().includes(q) || 
    (c.instructor || '').toLowerCase().includes(q)
  ));
}

function enroll(courseId, courseName) {
  // TODO: 串接 POST /api/course-selection/select
  alert(`已送出選課申請：${courseName}`);
}

window.addEventListener('load', () => {
  initLayout('courses', '課程選課');
  loadCourses();
});

