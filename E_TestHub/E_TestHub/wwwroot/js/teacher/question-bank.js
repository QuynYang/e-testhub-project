/**
 * Question Bank - Tab-based View with Pagination
 * Modern approach: organized by subject with pagination
 */

// Global state
let currentSubject = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let allQuestions = [];
let subjectSummaries = [];
let subjectClasses = [];

// Demo data - thay thế bằng API call trong production
const demoQuestions = [
    // Xác suất thống kê (60 questions - showing 10 samples)
    {id: 1, subject: 'xstk', subjectName: 'Xác suất thống kê', title: 'Cho biến ngẫu nhiên X có phân phối chuẩn N(5, 4). Tính P(3 < X < 7)?', options: {A: '0.6826', B: '0.6827', C: '0.6828', D: '0.6829'}, correct: 'B', date: '15/09/2025', usedCount: 3},
    {id: 2, subject: 'xstk', subjectName: 'Xác suất thống kê', title: 'Giả sử X ~ Binomial(n=10, p=0.3). Tính E(X)?', options: {A: '2', B: '3', C: '4', D: '5'}, correct: 'B', date: '14/09/2025', usedCount: 5},
    {id: 3, subject: 'xstk', subjectName: 'Xác suất thống kê', title: 'Trong phân phối Poisson với λ=4, tính P(X=2)?', options: {A: '0.1465', B: '0.1953', C: '0.2240', D: '0.2653'}, correct: 'A', date: '13/09/2025', usedCount: 2},
    {id: 4, subject: 'xstk', subjectName: 'Xác suất thống kê', title: 'Tính phương sai của biến ngẫu nhiên X ~ U(0, 10)?', options: {A: '8.33', B: '10', C: '12.5', D: '16.67'}, correct: 'A', date: '12/09/2025', usedCount: 4},
    {id: 5, subject: 'xstk', subjectName: 'Xác suất thống kê', title: 'Cho X, Y độc lập và X ~ N(2,1), Y ~ N(3,2). Tính E(X+Y)?', options: {A: '3', B: '4', C: '5', D: '6'}, correct: 'C', date: '11/09/2025', usedCount: 1},
    
    // Đại số tuyến tính (40 questions - showing 8 samples)
    {id: 6, subject: 'dstt', subjectName: 'Đại số tuyến tính', title: 'Cho ma trận A = [[1, 2], [3, 4]]. Tính định thức của ma trận A?', options: {A: '-1', B: '-2', C: '2', D: '1'}, correct: 'B', date: '10/09/2025', usedCount: 5},
    {id: 7, subject: 'dstt', subjectName: 'Đại số tuyến tính', title: 'Tìm hạng của ma trận [[1, 2, 3], [2, 4, 6], [3, 6, 9]]?', options: {A: '0', B: '1', C: '2', D: '3'}, correct: 'B', date: '09/09/2025', usedCount: 3},
    {id: 8, subject: 'dstt', subjectName: 'Đại số tuyến tính', title: 'Cho vector v=(1,2,3). Tính độ dài của vector v?', options: {A: '√14', B: '√12', C: '√10', D: '6'}, correct: 'A', date: '08/09/2025', usedCount: 7},
    {id: 9, subject: 'dstt', subjectName: 'Đại số tuyến tính', title: 'Tích vô hướng của (1,2) và (3,4) là?', options: {A: '9', B: '10', C: '11', D: '12'}, correct: 'C', date: '07/09/2025', usedCount: 2},
    
    // Giải tích 1 (30 questions - showing 6 samples)
    {id: 10, subject: 'giai-tich', subjectName: 'Giải tích 1', title: 'Tính đạo hàm của hàm số f(x) = x² + 3x - 2 tại điểm x = 2?', options: {A: '5', B: '7', C: '9', D: '11'}, correct: 'B', date: '05/09/2025', usedCount: 8},
    {id: 11, subject: 'giai-tich', subjectName: 'Giải tích 1', title: 'Tính tích phân ∫₀¹ x² dx?', options: {A: '1/2', B: '1/3', C: '1/4', D: '1/5'}, correct: 'B', date: '04/09/2025', usedCount: 6},
    {id: 12, subject: 'giai-tich', subjectName: 'Giải tích 1', title: 'Giới hạn lim(x→0) (sin x)/x = ?', options: {A: '0', B: '1', C: '∞', D: 'không tồn tại'}, correct: 'B', date: '03/09/2025', usedCount: 9},
    
    // Toán rời rạc (15 questions - showing 4 samples)
    {id: 13, subject: 'toan-roi-rac', subjectName: 'Toán rời rạc', title: 'Có bao nhiêu cách sắp xếp 5 người ngồi vào một bàn tròn?', options: {A: '120', B: '24', C: '60', D: '12'}, correct: 'B', date: '01/09/2025', usedCount: 2},
    {id: 14, subject: 'toan-roi-rac', subjectName: 'Toán rời rạc', title: 'Tìm số cách chọn 3 người từ 10 người?', options: {A: '90', B: '100', C: '120', D: '720'}, correct: 'C', date: '31/08/2025', usedCount: 4},
];

function sanitizeSubjectId(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
        if (value.id || value._id) {
            return (value.id || value._id).toString();
        }
        if (value.value) {
            return value.value.toString();
        }
        if (typeof value.toString === 'function') {
            const asString = value.toString();
            if (asString && asString !== '[object Object]') {
                return asString;
            }
        }
    }
    return null;
}

function buildSubjectSummaries(questions = [], classes = []) {
    const summariesMap = new Map();
    const order = [];
    const classNameLookup = new Map();

    (classes || []).forEach(cls => {
        const id = sanitizeSubjectId(cls?.id || cls?._id);
        if (!id) return;
        const name = cls?.name || cls?.classCode || cls?.title || 'Không xác định';
        classNameLookup.set(id, name);
        if (!summariesMap.has(id)) {
            summariesMap.set(id, { id, name, count: 0 });
            order.push(id);
        } else {
            const existing = summariesMap.get(id);
            existing.name = name;
        }
    });

    (questions || []).forEach(question => {
        const subjectId = sanitizeSubjectId(question?.subjectId ?? question?.subject);
        if (!subjectId) return;

        if (!summariesMap.has(subjectId)) {
            order.push(subjectId);
            summariesMap.set(subjectId, {
                id: subjectId,
                name: question.subjectName || classNameLookup.get(subjectId) || 'Không xác định',
                count: 0
            });
        }

        const entry = summariesMap.get(subjectId);
        entry.name = question.subjectName || entry.name || classNameLookup.get(subjectId) || 'Không xác định';
        entry.count += 1;
    });

    return order.map(id => summariesMap.get(id));
}

function formatNumberLocal(value) {
    try {
        return new Intl.NumberFormat('vi-VN').format(value || 0);
    } catch (error) {
        return value?.toString?.() ?? '0';
    }
}

function createSubjectChip(subjectId, subjectName, count, isActive) {
    const chip = document.createElement('button');
    chip.className = `subject-chip${isActive ? ' active' : ''}`;
    chip.dataset.subject = subjectId;
    chip.innerHTML = `
        <span class="chip-label">${subjectName}</span>
        <span class="chip-badge">${formatNumberLocal(count)}</span>
    `;
    chip.addEventListener('click', () => switchSubjectTab(subjectId));
    return chip;
}

function renderSubjectChips(summaries) {
    const container = document.getElementById('subjectChipsContainer');
    if (!container) return;

    container.innerHTML = '';

    const totalCount = allQuestions.length;
    const allChip = createSubjectChip('all', 'Tất cả', totalCount, currentSubject === 'all');
    container.appendChild(allChip);

    (summaries || []).forEach(item => {
        const chip = createSubjectChip(item.id, item.name || 'Không xác định', item.count || 0, currentSubject === item.id);
        container.appendChild(chip);
    });

    if (!container.querySelector('.subject-chip.active')) {
        allChip.classList.add('active');
        currentSubject = 'all';
    }

    if (summaries && summaries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'subject-chips-empty';
        empty.textContent = 'Chưa có dữ liệu câu hỏi.';
        container.appendChild(empty);
    }
}

function renderSubjectDistribution(summaries) {
    const container = document.getElementById('subjectDistributionContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!summaries || summaries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'subject-distribution-empty';
        empty.textContent = 'Chưa có dữ liệu câu hỏi.';
        container.appendChild(empty);
        return;
    }

    const totalCount = summaries.reduce((sum, item) => sum + (item.count || 0), 0);

    summaries.forEach(item => {
        const percent = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
        const row = document.createElement('div');
        row.className = 'subject-bar-item';
        row.innerHTML = `
            <div class="subject-bar-info">
                <span class="subject-name">${item.name || 'Không xác định'}</span>
                <span class="subject-count">${formatNumberLocal(item.count || 0)} câu hỏi</span>
            </div>
            <div class="subject-bar-progress">
                <div class="subject-bar-fill" style="width: ${percent}%"></div>
            </div>
        `;
        container.appendChild(row);
    });
}
 
// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (Array.isArray(window.questionBankData) && window.questionBankData.length > 0) {
        allQuestions = window.questionBankData;
    } else {
        allQuestions = demoQuestions;
    }

    if (Array.isArray(window.questionBankClasses) && window.questionBankClasses.length > 0) {
        subjectClasses = window.questionBankClasses;
    }

    subjectSummaries = buildSubjectSummaries(allQuestions, subjectClasses);
    renderSubjectChips(subjectSummaries);
    renderSubjectDistribution(subjectSummaries);
    loadQuestions();
});
 
// Allow external scripts to update question bank data dynamically
window.updateQuestionBankData = function(data, metadata = {}) {
    if (!Array.isArray(data)) {
        console.warn('updateQuestionBankData expected an array, received:', data);
        return;
    }
 
    if (Array.isArray(metadata.classes)) {
        subjectClasses = metadata.classes;
        window.questionBankClasses = metadata.classes;
    }

    window.questionBankData = data;
    allQuestions = data;
    subjectSummaries = buildSubjectSummaries(allQuestions, subjectClasses);

    if (currentSubject !== 'all') {
        const hasCurrent = subjectSummaries.some(item => item.id === currentSubject);
        if (!hasCurrent) {
            currentSubject = 'all';
            currentPage = 1;
        }
    }

    renderSubjectChips(subjectSummaries);
    renderSubjectDistribution(subjectSummaries);
    loadQuestions();
};
 
/**
 * Switch subject tab
 */
function switchSubjectTab(subject) {
    const clickedChip = document.querySelector(`.subject-chip[data-subject="${subject}"]`);
 
    if (!clickedChip && subject !== 'all') {
        console.warn('Không tìm thấy chip cho môn học:', subject);
        return;
    }

    // If clicking the active chip, deactivate it and show all
    if (clickedChip && clickedChip.classList.contains('active') && subject !== 'all') {
        currentSubject = 'all';
        currentPage = 1;
 
        // Remove all active states
        document.querySelectorAll('.subject-chip').forEach(chip => {
            chip.classList.remove('active');
        });
 
        // Activate "Tất cả" chip
        const allChip = document.querySelector('[data-subject="all"]');
        if (allChip) {
            allChip.classList.add('active');
        }
 
        loadQuestions();
        return;
    }
    
    // Normal behavior: switch to clicked subject
    currentSubject = subject;
    currentPage = 1;
    
    // Update active chip
    document.querySelectorAll('.subject-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    if (clickedChip) {
        clickedChip.classList.add('active');
    } else {
        const allChip = document.querySelector('[data-subject="all"]');
        if (allChip) {
            allChip.classList.add('active');
        }
    }
 
    loadQuestions();
}

/**
 * Change items per page
 */
function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    currentPage = 1;
    loadQuestions();
}

/**
 * Go to specific page
 */
function goToPage(page) {
    currentPage = page;
    loadQuestions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load and display questions based on current filters
 */
function loadQuestions() {
    // Filter questions by subject
    const currentSubjectKey = sanitizeSubjectId(currentSubject);
    let filteredQuestions = currentSubject === 'all' 
        ? allQuestions 
        : allQuestions.filter(q => {
            const questionSubject = sanitizeSubjectId(q?.subjectId ?? q?.subject);
            return questionSubject === currentSubjectKey;
        });
    
    const totalQuestions = filteredQuestions.length;
    const totalPages = Math.ceil(totalQuestions / itemsPerPage);
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalQuestions);
    const questionsToShow = filteredQuestions.slice(startIndex, endIndex);
    
    // Update UI
    displayQuestions(questionsToShow);
    updatePaginationInfo(startIndex + 1, endIndex, totalQuestions);
    generatePaginationButtons(totalPages);
    
    // Show empty state if no questions
    const emptyState = document.getElementById('emptyState');
    const questionList = document.getElementById('questionListContainer');
    if (totalQuestions === 0) {
        emptyState.style.display = 'block';
        questionList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        questionList.style.display = 'grid';
    }
}

/**
 * Display questions in the container
 */
function displayQuestions(questions) {
    const container = document.getElementById('questionListContainer');
    
    if (questions.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = questions.map(q => `
        <div class="question-card" data-subject="${q.subject}">
            <div class="question-card-header">
                <div class="question-card-badge">
                    <i class="fas fa-book"></i>
                    <span>${q.subjectName}</span>
                </div>
                <div class="question-card-actions">
                    <button class="question-action-btn" title="Xem chi tiết" onclick="viewQuestion(${q.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="question-action-btn" title="Chỉnh sửa" onclick="editQuestion(${q.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="question-action-btn btn-delete" title="Xóa" onclick="deleteQuestion(${q.id}, this)">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="question-card-body">
                <h4 class="question-title">${q.title}</h4>
                <div class="question-options">
                    ${Object.entries(q.options).map(([key, value]) => `
                        <div class="question-option ${key === q.correct ? 'correct' : ''}">${key}. ${value}</div>
                    `).join('')}
                </div>
            </div>
            <div class="question-card-footer">
                <span class="question-meta"><i class="fas fa-calendar"></i> ${q.date}</span>
                <span class="question-meta"><i class="fas fa-check-circle"></i> Đã dùng ${q.usedCount} lần</span>
            </div>
        </div>
    `).join('');
}

/**
 * Update pagination info text
 */
function updatePaginationInfo(from, to, total) {
    document.getElementById('showingFrom').textContent = from;
    document.getElementById('showingTo').textContent = to;
    document.getElementById('totalQuestions').textContent = total;
}

/**
 * Generate pagination buttons
 */
function generatePaginationButtons(totalPages) {
    const container = document.getElementById('paginationButtons');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let buttons = [];
    
    // Previous button
    buttons.push(`
        <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `);
    
    // Page numbers with smart truncation
    if (totalPages <= 7) {
        // Show all pages if 7 or less
        for (let i = 1; i <= totalPages; i++) {
            buttons.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `);
        }
    } else {
        // Show first page
        buttons.push(`
            <button class="pagination-btn ${currentPage === 1 ? 'active' : ''}" onclick="goToPage(1)">1</button>
        `);
        
        // Show dots or pages around current page
        if (currentPage > 3) {
            buttons.push('<span class="pagination-dots">...</span>');
        }
        
        // Show pages around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) {
            buttons.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `);
        }
        
        // Show dots or last page
        if (currentPage < totalPages - 2) {
            buttons.push('<span class="pagination-dots">...</span>');
        }
        
        buttons.push(`
            <button class="pagination-btn ${currentPage === totalPages ? 'active' : ''}" onclick="goToPage(${totalPages})">
                ${totalPages}
            </button>
        `);
    }
    
    // Next button
    buttons.push(`
        <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `);
    
    container.innerHTML = buttons.join('');
}
