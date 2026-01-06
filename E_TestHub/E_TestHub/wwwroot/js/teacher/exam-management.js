// Teacher Exam Management - API integration and UI rendering
const EXAM_API_BASE_URL = 'http://localhost:3000/api';

let examsCache = [];
let filteredExams = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeExamManagement();
});

function initializeExamManagement() {
    attachEventHandlers();
    loadTeacherExams();
}

function attachEventHandlers() {
    const searchInput = document.getElementById('examSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleTableSearch);
    }

    const modalInput = document.getElementById('modalSearchInput');
    if (modalInput) {
        modalInput.addEventListener('input', handleModalSearch);
    }

    const searchModal = document.getElementById('searchModal');
    if (searchModal) {
        searchModal.addEventListener('click', (event) => {
            if (event.target === searchModal) {
                closeSearchModal();
            }
        });
    }

    const viewMoreBtn = document.querySelector('.dashboard-view-more-btn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', (event) => {
            event.preventDefault();
            document.getElementById('all-exams')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUserId() {
    try {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return null;
        const user = JSON.parse(rawUser);
        return normalizeId(user?.id || user?._id || user?.userId);
    } catch (error) {
        console.error('Không thể đọc thông tin người dùng.', error);
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

async function loadTeacherExams() {
    try {
        setLoadingState();
        const exams = await fetchTeacherExams();
        examsCache = exams;
        filteredExams = exams;
        renderExamDashboard(exams);
    } catch (error) {
        console.error('Không thể tải danh sách đề thi:', error);
        renderErrorState(error?.message || 'Không thể tải danh sách đề thi.');
    }
}

async function fetchTeacherExams() {
    const token = getToken();
    if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
    }

    const response = await fetch(`${EXAM_API_BASE_URL}/exams`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        let message = 'Không thể tải danh sách đề thi.';
        try {
            const errorPayload = await response.json();
            message = errorPayload?.message || message;
        } catch (err) {
            // ignore
        }
        throw new Error(message);
    }

    const payload = await response.json();
    const examsRaw = unwrapListResponse(payload);
    const teacherId = getCurrentUserId();

    return examsRaw
        .map(normalizeExam)
        .filter(exam => !teacherId || exam.teacherId === teacherId);
}

async function deleteExamById(examId) {
    const token = getToken();
    if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
    }

    const normalizedId = normalizeId(examId);
    if (!normalizedId) {
        throw new Error('ID đề thi không hợp lệ.');
    }

    const response = await fetch(`${EXAM_API_BASE_URL}/exams/${normalizedId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        let message = 'Không thể xóa đề thi.';
        try {
            const errorPayload = await response.json();
            message = errorPayload?.message || message;
        } catch (err) {
            // ignore parse error
        }
        throw new Error(message);
    }

    // Return response payload if any (some APIs may respond with deleted doc)
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}

function unwrapListResponse(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;

    const candidateKeys = ['data', 'items', 'results', 'list', 'value'];
    for (const key of candidateKeys) {
        if (Array.isArray(payload[key])) {
            return payload[key];
        }
    }

    if (payload.data && typeof payload.data === 'object') {
        for (const key of candidateKeys) {
            if (Array.isArray(payload.data[key])) {
                return payload.data[key];
            }
        }
    }

    return [];
}

function normalizeExam(raw) {
    const teacherId = normalizeId(raw.teacherId || raw.teacher?._id || raw.teacher);

    const classDocs = Array.isArray(raw.classIds) ? raw.classIds : [];
    const classes = classDocs.map(cls => ({
        id: normalizeId(cls._id || cls.id || cls),
        code: cls.classCode || cls.code || cls.name || 'N/A',
        name: cls.name || cls.classCode || 'Không xác định',
        students: Array.isArray(cls.students) ? cls.students : []
    }));

    const questionCount = Array.isArray(raw.questions)
        ? raw.questions.length
        : Array.isArray(raw.questionIds)
            ? raw.questionIds.length
            : 0;

    const submissionsCount = Array.isArray(raw.submissions)
        ? raw.submissions.length
        : Number(raw.submissionCount || raw.submissionsCount || 0);

    const duration = Number(raw.duration || raw.timeLimit || 0);
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
    const openAt = raw.openAt || raw.startTime || raw.availableFrom;
    const closeAt = raw.closeAt || raw.endTime || raw.availableTo;

    const status = computeExamStatus({
        isPublished: raw.isPublished,
        openAt,
        closeAt
    });

    return {
        id: normalizeId(raw._id || raw.id),
        title: raw.title || raw.name || 'Không có tiêu đề',
        description: raw.description || '',
        teacherId,
        classes,
        questionCount,
        duration,
        createdAt,
        openAt: openAt ? new Date(openAt) : null,
        closeAt: closeAt ? new Date(closeAt) : null,
        status,
        submissionsCount
    };
}

function computeExamStatus({ isPublished, openAt, closeAt }) {
    if (!isPublished) {
        return { label: 'Nháp', badgeClass: 'status-draft' };
    }

    const now = new Date();
    const open = openAt ? new Date(openAt) : null;
    const close = closeAt ? new Date(closeAt) : null;

    if (open && now < open) {
        return { label: 'Sắp diễn ra', badgeClass: 'status-upcoming' };
    }

    if (close && now > close) {
        return { label: 'Đã kết thúc', badgeClass: 'status-completed' };
    }

    return { label: 'Đang diễn ra', badgeClass: 'status-active' };
}

function setLoadingState() {
    const recentList = document.getElementById('recentExamsList');
    if (recentList) {
        recentList.innerHTML = '<li class="dashboard-item-empty">Đang tải dữ liệu...</li>';
    }

    const tableBody = document.getElementById('examTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr class="exam-table-empty"><td colspan="6" style="text-align: center; padding: 35px; color: #6c757d;">Đang tải danh sách đề thi...</td></tr>';
    }
}

function renderErrorState(message) {
    const recentList = document.getElementById('recentExamsList');
    if (recentList) {
        recentList.innerHTML = `<li class="dashboard-item-empty" style="color: #dc3545;">${message}</li>`;
    }

    const tableBody = document.getElementById('examTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr class="exam-table-empty"><td colspan="6" style="text-align: center; padding: 35px; color: #dc3545;">${message}</td></tr>`;
    }
}

function renderExamDashboard(exams) {
    renderRecentExams(exams);
    renderExamStats(exams);
    renderExamTable(exams);
    renderSearchResults(exams);
}

function renderRecentExams(exams) {
    const recentList = document.getElementById('recentExamsList');
    if (!recentList) return;

    if (!Array.isArray(exams) || exams.length === 0) {
        recentList.innerHTML = '<li class="dashboard-item-empty">Bạn chưa có đề thi nào. Hãy bắt đầu với "Tạo đề thi mới".</li>';
        return;
    }

    const sorted = [...exams]
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, 3);

    recentList.innerHTML = sorted.map(exam => `
        <li class="dashboard-item">
            <div class="dashboard-item-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="dashboard-item-content">
                <h4 class="dashboard-item-title">${escapeHtml(exam.title)}</h4>
                <p class="dashboard-item-subtitle">${exam.questionCount} câu hỏi • ${formatDuration(exam.duration)}</p>
                <p class="dashboard-item-subtitle">Tạo ngày: ${formatDate(exam.createdAt)}</p>
            </div>
            <div class="dashboard-item-actions">
                <button class="dashboard-item-action-btn" title="Xem chi tiết" onclick="viewExam('${exam.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="dashboard-item-action-btn" title="Chỉnh sửa" onclick="editExam('${exam.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </li>
    `).join('');
}

function renderExamStats(exams) {
    const totalExamsEl = document.getElementById('totalExamsStat');
    const ongoingExamsEl = document.getElementById('ongoingExamsStat');
    const submittedEl = document.getElementById('submittedExamsStat');
    const studentsEl = document.getElementById('studentsStat');

    if (!Array.isArray(exams)) exams = [];

    const total = exams.length;
    const ongoing = exams.filter(exam => exam.status.label === 'Đang diễn ra').length;
    const submitted = exams.reduce((sum, exam) => sum + (exam.submissionsCount || 0), 0);

    const studentIds = new Set();
    exams.forEach(exam => {
        exam.classes.forEach(cls => {
            (cls.students || []).forEach(student => {
                const id = normalizeId(student?.studentId || student);
                if (id) studentIds.add(id);
            });
        });
    });

    const students = studentIds.size;

    if (totalExamsEl) totalExamsEl.textContent = formatNumber(total);
    if (ongoingExamsEl) ongoingExamsEl.textContent = formatNumber(ongoing);
    if (submittedEl) submittedEl.textContent = formatNumber(submitted);
    if (studentsEl) studentsEl.textContent = formatNumber(students);
}

function renderExamTable(exams) {
    const tableBody = document.getElementById('examTableBody');
    if (!tableBody) return;

    if (!Array.isArray(exams) || exams.length === 0) {
        tableBody.innerHTML = '<tr class="exam-table-empty"><td colspan="6" style="text-align: center; padding: 35px; color: #6c757d;">Chưa có đề thi nào.</td></tr>';
        return;
    }

    tableBody.innerHTML = exams.map(exam => {
        const classes = exam.classes.length
            ? exam.classes.map(cls => escapeHtml(cls.code || cls.name)).join(', ')
            : '—';

        return `
            <tr data-exam-id="${exam.id}" data-exam-title="${escapeHtml(exam.title.toLowerCase())}">
                <td>
                    <div class="exam-table-name-cell">
                        <i class="fas fa-file-alt"></i>
                        <span>${escapeHtml(exam.title)}</span>
                    </div>
                </td>
                <td>${exam.questionCount}</td>
                <td>${formatDuration(exam.duration)}</td>
                <td>${classes}</td>
                <td><span class="exam-status-badge ${exam.status.badgeClass}">${exam.status.label}</span></td>
                <td>
                    <div class="exam-table-actions">
                        <button title="Xem chi tiết" onclick="viewExam('${exam.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button title="Chỉnh sửa" onclick="editExam('${exam.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button title="Xóa" onclick="deleteExam('${exam.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderSearchResults(exams) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    if (!Array.isArray(exams) || exams.length === 0) {
        resultsContainer.innerHTML = '<p class="search-placeholder">Nhập để tìm kiếm...</p>';
        return;
    }

    resultsContainer.dataset.exams = JSON.stringify(exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        questionCount: exam.questionCount,
        duration: exam.duration
    })));
}

function handleTableSearch(event) {
    const searchTerm = (event.target.value || '').toLowerCase();
    filteredExams = examsCache.filter(exam => exam.title.toLowerCase().includes(searchTerm));
    renderExamTable(filteredExams);
}

function handleModalSearch(event) {
    const searchTerm = (event.target.value || '').toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    const rawData = resultsContainer.dataset.exams;
    const exams = rawData ? JSON.parse(rawData) : [];

    if (!searchTerm) {
        resultsContainer.innerHTML = '<p class="search-placeholder">Nhập để tìm kiếm...</p>';
        return;
    }

    const filtered = exams.filter(exam => exam.title.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p class="search-placeholder">Không tìm thấy kết quả</p>';
        return;
    }

    resultsContainer.innerHTML = filtered.map(exam => `
        <button class="search-result-item" onclick="viewExam('${exam.id}')">
            <i class="fas fa-file-alt"></i>
            <div>
                <h4>${escapeHtml(exam.title)}</h4>
                <p>${exam.questionCount} câu hỏi • ${formatDuration(exam.duration)}</p>
            </div>
        </button>
    `).join('');
}

function formatDuration(duration) {
    if (!duration || Number.isNaN(duration)) {
        return '—';
    }
    return `${duration} phút`;
}

function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatNumber(value) {
    try {
        return new Intl.NumberFormat('vi-VN').format(value || 0);
    } catch (error) {
        return value?.toString?.() || '0';
    }
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

// Modal helpers (exposed globally because of inline attributes)
window.openSearchModal = function openSearchModal() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('modalSearchInput')?.focus();
};

window.closeSearchModal = function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;
    modal.style.display = 'none';
    const input = document.getElementById('modalSearchInput');
    const resultsContainer = document.getElementById('searchResults');
    if (input) input.value = '';
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p class="search-placeholder">Nhập để tìm kiếm...</p>';
    }
};

// Placeholder actions (should be replaced with actual routing)
window.viewExam = function viewExam(examId) {
    if (!examId) return;
    alert('Tính năng xem chi tiết đang được phát triển. Exam ID: ' + examId);
};

window.editExam = function editExam(examId) {
    if (!examId) return;
    alert('Tính năng chỉnh sửa đang được phát triển. Exam ID: ' + examId);
};

window.deleteExam = async function deleteExam(examId) {
    if (!examId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return;

    try {
        await deleteExamById(examId);
        alert('Đã xóa đề thi thành công.');
        // Reload exams to reflect latest data
        await loadTeacherExams();
    } catch (error) {
        console.error('Không thể xóa đề thi:', error);
        alert(error?.message || 'Không thể xóa đề thi. Vui lòng thử lại.');
    }
};
