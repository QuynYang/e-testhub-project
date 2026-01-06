// Teacher Dashboard API integration
const DASHBOARD_API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        setTeachingClassesLoading();
        setRecentExamsLoading();

        const [classes, exams] = await Promise.all([
            fetchTeachingClasses(),
            fetchTeacherExams()
        ]);

        renderTeachingClasses(classes);
        renderRecentExams(exams);
    } catch (error) {
        console.error('Không thể tải dữ liệu dashboard:', error);
        renderTeachingClassesError(error?.message || 'Không thể tải danh sách lớp.');
        renderRecentExamsError(error?.message || 'Không thể tải danh sách kỳ thi.');
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user ? (user.id || user._id || user.userId) : null;
    } catch (error) {
        console.error('Không thể đọc thông tin người dùng từ localStorage:', error);
        return null;
    }
}

function normalizeId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
        const nested = value.id || value._id || value.value;
        if (nested) return nested.toString();
        if (typeof value.toString === 'function') {
            const str = value.toString();
            if (str && str !== '[object Object]') return str;
        }
    }
    return null;
}

async function fetchTeachingClasses() {
    const token = getToken();
    if (!token) {
        throw new Error('Không tìm thấy token xác thực.');
    }

    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('Không tìm thấy ID giáo viên.');
    }

    const response = await fetch(`${DASHBOARD_API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        let message = 'Không thể tải thông tin giáo viên.';
        try {
            const errorPayload = await response.json();
            message = errorPayload?.message || message;
        } catch (err) {
            // ignore
        }
        throw new Error(message);
    }

    const teacher = await response.json();
    const teachingSubjects = teacher?.teachingSubjects || teacher?.classes || [];

    const classIds = teachingSubjects
        .map(item => normalizeId(item?.classId || item?.class || item))
        .filter(Boolean);

    if (!classIds.length) {
        return [];
    }

    const classesResponse = await fetch(`${DASHBOARD_API_BASE_URL}/classes`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!classesResponse.ok) {
        let message = 'Không thể tải danh sách lớp.';
        try {
            const errorPayload = await classesResponse.json();
            message = errorPayload?.message || message;
        } catch (err) {
            // ignore
        }
        throw new Error(message);
    }

    const classesPayload = await classesResponse.json();
    const classesList = unwrapListResponse(classesPayload);

    return classesList
        .map(cls => normalizeClass(cls))
        .filter(cls => classIds.includes(cls.id));
}

function normalizeClass(raw) {
    return {
        id: normalizeId(raw._id || raw.id || raw),
        code: raw.classCode || raw.code || raw.name || 'Không xác định',
        name: raw.name || raw.classCode || 'Không xác định',
        students: Array.isArray(raw.students) ? raw.students.length : Number(raw.studentCount || 0),
        academicYear: formatAcademicYear(raw.academicYear)
    };
}

function formatAcademicYear(value) {
    if (!value) return '—';
    if (typeof value === 'string') {
        if (value.includes(' - ')) return value;
        if (value.includes('-')) return value.replace('-', ' - ');
        return value;
    }
    if (typeof value === 'object' && value.startYear && value.endYear) {
        return `${value.startYear} - ${value.endYear}`;
    }
    return value.toString();
}

async function fetchTeacherExams() {
    const token = getToken();
    if (!token) {
        throw new Error('Không tìm thấy token xác thực.');
    }

    const response = await fetch(`${DASHBOARD_API_BASE_URL}/exams`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        let message = 'Không thể tải danh sách kỳ thi.';
        try {
            const errorPayload = await response.json();
            message = errorPayload?.message || message;
        } catch (err) {
            // ignore
        }
        throw new Error(message);
    }

    const payload = await response.json();
    const exams = unwrapListResponse(payload).map(normalizeExam);
    const teacherId = normalizeId(getCurrentUserId());

    return exams.filter(exam => !teacherId || exam.teacherId === teacherId);
}

function normalizeExam(raw) {
    return {
        id: normalizeId(raw._id || raw.id),
        title: raw.title || raw.name || 'Không có tiêu đề',
        questionCount: Array.isArray(raw.questions) ? raw.questions.length : Array.isArray(raw.questionIds) ? raw.questionIds.length : 0,
        duration: Number(raw.duration || raw.timeLimit || 0),
        createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
        openAt: raw.openAt ? new Date(raw.openAt) : null,
        teacherId: normalizeId(raw.teacherId || raw.teacher?._id || raw.teacher),
        classes: Array.isArray(raw.classIds) ? raw.classIds.map(cls => normalizeClass(cls)) : []
    };
}

function unwrapListResponse(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    const keys = ['data', 'items', 'results', 'list', 'value'];
    for (const key of keys) {
        if (Array.isArray(payload[key])) {
            return payload[key];
        }
    }
    if (payload.data && typeof payload.data === 'object') {
        for (const key of keys) {
            if (Array.isArray(payload.data[key])) {
                return payload.data[key];
            }
        }
    }
    return [];
}

function setTeachingClassesLoading() {
    const list = document.getElementById('teachingClassesList');
    if (list) {
        list.innerHTML = '<li class="dashboard-item-empty">Đang tải dữ liệu lớp...</li>';
    }
}

function renderTeachingClasses(classes) {
    const list = document.getElementById('teachingClassesList');
    if (!list) return;

    if (!Array.isArray(classes) || classes.length === 0) {
        list.innerHTML = '<li class="dashboard-item-empty">Bạn chưa được phân công lớp nào.</li>';
        return;
    }

    list.innerHTML = classes.map(cls => `
        <li class="dashboard-item">
            <div class="dashboard-item-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="dashboard-item-content">
                <h4 class="dashboard-item-title">${escapeHtml(cls.code)}</h4>
                <p class="dashboard-item-subtitle">${cls.students} sinh viên</p>
                <p class="dashboard-item-subtitle">Khóa: ${escapeHtml(cls.academicYear || '—')}</p>
            </div>
        </li>
    `).join('');
}

function renderTeachingClassesError(message) {
    const list = document.getElementById('teachingClassesList');
    if (!list) return;
    list.innerHTML = `<li class="dashboard-item-empty" style="color: #dc3545;">${escapeHtml(message)}</li>`;
}

function setRecentExamsLoading() {
    const list = document.getElementById('recentExamsList');
    if (list) {
        list.innerHTML = '<li class="dashboard-item-empty">Đang tải dữ liệu kỳ thi...</li>';
    }
}

function renderRecentExams(exams) {
    const list = document.getElementById('recentExamsList');
    if (!list) return;

    if (!Array.isArray(exams) || exams.length === 0) {
        list.innerHTML = '<li class="dashboard-item-empty">Bạn chưa tạo kỳ thi nào.</li>';
        return;
    }

    const sorted = [...exams]
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, 3);

    list.innerHTML = sorted.map(exam => `
        <li class="dashboard-item">
            <div class="dashboard-item-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="dashboard-item-content">
                <h4 class="dashboard-item-title">${escapeHtml(exam.title)}</h4>
                <p class="dashboard-item-subtitle">${formatDate(exam.createdAt || exam.openAt)}</p>
                <p class="dashboard-item-subtitle">Thời gian làm bài: ${formatDuration(exam.duration)}</p>
            </div>
        </li>
    `).join('');
}

function renderRecentExamsError(message) {
    const list = document.getElementById('recentExamsList');
    if (!list) return;
    list.innerHTML = `<li class="dashboard-item-empty" style="color: #dc3545;">${escapeHtml(message)}</li>`;
}

function formatDate(date) {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDuration(duration) {
    if (!duration || Number.isNaN(duration)) {
        return '—';
    }
    return `${duration} phút`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
