// Question Bank API Integration
const API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// Cache for teacher classes to avoid repeated API calls
let teacherClassesCache = null;

// Import modal state
const questionImportState = {
    classId: '',
    file: null,
    fileName: '',
    parsedQuestions: [],
    previewRows: [],
    errors: [],
    isPreviewing: false,
    isImporting: false
};

// Get current user ID from localStorage
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? (user.id || user._id) : null;
}

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

function normalizeId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'object') {
        return value._id || value.id || value.value || value.toString?.() || null;
    }
    return null;
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

    // Some APIs return { data: { docs: [] } }
    if (payload.data && typeof payload.data === 'object') {
        const nestedCandidates = ['results', 'items', 'docs', 'data'];
        for (const nestedKey of nestedCandidates) {
            if (Array.isArray(payload.data[nestedKey])) {
                return payload.data[nestedKey];
            }
        }
    }

    return Array.isArray(payload.data) ? payload.data : (Array.isArray(payload.value) ? payload.value : []);
}

function unwrapSingleResponse(payload) {
    if (!payload) return payload;
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return payload.data;
    }
    if (payload.result && typeof payload.result === 'object') {
        return payload.result;
    }
    if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
        return payload.value;
    }
    return payload;
}

// Load current teacher data from API
async function loadCurrentTeacher() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
        }

        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải thông tin giáo viên.');
        }

        const payload = await response.json();
        return unwrapSingleResponse(payload);
    } catch (error) {
        console.error('Error loading teacher:', error);
        throw error;
    }
}

// Load all classes from API
async function loadAllClasses() {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const response = await fetch(`${API_BASE_URL}/classes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải danh sách lớp học.');
        }

        const payload = await response.json();
        return unwrapListResponse(payload);
    } catch (error) {
        console.error('Error loading classes:', error);
        throw error;
    }
}

async function getClassById(classId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const response = await fetch(`${API_BASE_URL}/classes/${classId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải thông tin lớp học.');
        }

        const payload = await response.json();
        return unwrapSingleResponse(payload);
    } catch (error) {
        console.error(`Error getting class ${classId}:`, error);
        throw error;
    }
}

// Get course info by ID
async function getCourseInfo(courseId) {
    try {
        const token = getToken();
        if (!token) {
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Could not fetch course ${courseId}`);
            return null;
        }

        const payload = await response.json();
        return unwrapSingleResponse(payload);
    } catch (error) {
        console.error(`Error fetching course ${courseId}:`, error);
        return null;
    }
}

// Load classes that the teacher is teaching (used as subjects in Question Bank)
async function loadTeacherClassesForDropdown() {
    try {
        // Load current teacher to get teachingSubjects
        const teacher = await loadCurrentTeacher();
        const teachingSubjectsRaw = teacher.teachingSubjects || [];
        const teachingSubjects = teachingSubjectsRaw
            .map(item => normalizeId(item?.classId || item?.class || item))
            .filter(Boolean)
            .map(id => id.toString());

        const teachingSubjectSet = new Set(teachingSubjects);
        
        if (teachingSubjects.length === 0) {
            console.log('Teacher has no assigned classes');
            return [];
        }

        // Load all classes
        const allClassesRaw = await loadAllClasses();
        const allClasses = unwrapListResponse(allClassesRaw) || allClassesRaw || [];
        
        // Filter classes that are in teachingSubjects and map to dropdown-friendly objects
        const teacherClasses = (allClasses || []).filter(cls => {
            const explicitId = cls?._id || cls?.id;
            const fallbackId = normalizeId(cls);
            const classId = explicitId || fallbackId;
            const classIdStr = classId ? classId.toString() : null;
            return classIdStr ? teachingSubjectSet.has(classIdStr) : false;
        }).map(cls => ({
            id: (cls._id || cls.id || normalizeId(cls) || '').toString(),
            // Prefer classCode, fallback to name
            name: cls.classCode || cls.name || 'N/A',
            code: cls.classCode || cls.name || '',
            raw: cls
        }));

        // Remove duplicates by id
        const uniqueClasses = teacherClasses.filter(
            (c, idx, arr) => idx === arr.findIndex(x => x.id === c.id)
        );

        teacherClassesCache = uniqueClasses;

        return uniqueClasses;
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        teacherClassesCache = [];
        return [];
    }
}

async function getTeacherClassesWithCache() {
    if (Array.isArray(teacherClassesCache) && teacherClassesCache.length > 0) {
        return teacherClassesCache;
    }

    return await loadTeacherClassesForDropdown();
}

// Populate subject dropdown (now populates with classes)
async function populateSubjectDropdown() {
    const subjectSelect = document.getElementById('batchQuestionSubject');
    if (!subjectSelect) return;

    // Clear existing options except the first one
    while (subjectSelect.options.length > 1) {
        subjectSelect.remove(1);
    }

    // Show loading state
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Đang tải lớp học...';
    subjectSelect.appendChild(loadingOption);

    try {
        // Load classes taught by teacher
        const classes = await getTeacherClassesWithCache();

        // Remove loading option
        if (subjectSelect.options.length > 1) {
            subjectSelect.remove(1);
        }

        // Populate dropdown
        if (classes.length === 0) {
            const noSubjectOption = document.createElement('option');
            noSubjectOption.value = '';
            noSubjectOption.textContent = 'Không có lớp học nào';
            subjectSelect.appendChild(noSubjectOption);
        } else {
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id; // classId
                option.textContent = cls.name; // classCode/name
                option.dataset.subjectName = cls.name; // for display in batch list
                subjectSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating class dropdown:', error);
        // Remove loading option
        if (subjectSelect.options.length > 1) {
            subjectSelect.remove(1);
        }
        // Add error option
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Không thể tải lớp học';
        subjectSelect.appendChild(errorOption);
    }
}

/**
 * ------------------------------
 *  Import questions modal helpers
 * ------------------------------
 */

function getImportElements() {
    return {
        modal: document.getElementById('importQuestionModal'),
        classSelect: document.getElementById('importClassSelect'),
        fileInput: document.getElementById('questionImportFile'),
        selectedFileName: document.getElementById('selectedImportFileName'),
        previewButton: document.getElementById('previewImportButton'),
        confirmButton: document.getElementById('confirmImportButton'),
        statusMessage: document.getElementById('importStatusMessage'),
        previewContainer: document.getElementById('importPreviewContainer'),
        previewSummary: document.getElementById('importPreviewSummary'),
        previewErrors: document.getElementById('importPreviewErrors'),
        previewBody: document.getElementById('importPreviewTableBody')
    };
}

function resetQuestionImportState() {
    questionImportState.classId = '';
    questionImportState.file = null;
    questionImportState.fileName = '';
    questionImportState.parsedQuestions = [];
    questionImportState.previewRows = [];
    questionImportState.errors = [];
    questionImportState.isPreviewing = false;
    questionImportState.isImporting = false;

    const {
        classSelect,
        fileInput,
        selectedFileName,
        previewContainer,
        previewBody,
        previewSummary,
        previewErrors,
        statusMessage
    } = getImportElements();

    if (classSelect) classSelect.value = '';
    if (fileInput) fileInput.value = '';
    if (selectedFileName) selectedFileName.textContent = 'Chưa chọn file';
    if (previewBody) {
        previewBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:24px;">Chưa có dữ liệu xem trước.</td>
            </tr>
        `;
    }
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewSummary) previewSummary.textContent = '';
    if (previewErrors) previewErrors.innerHTML = '';
    if (statusMessage) {
        statusMessage.style.display = 'none';
        statusMessage.textContent = '';
        statusMessage.className = 'import-status-message';
    }

    updateImportButtonsState();
}

async function populateImportClassDropdown() {
    const { classSelect } = getImportElements();
    if (!classSelect) return;

    while (classSelect.options.length > 1) {
        classSelect.remove(1);
    }

    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Đang tải lớp học...';
    classSelect.appendChild(loadingOption);

    try {
        const classes = await getTeacherClassesWithCache();
        if (classSelect.options.length > 1) {
            classSelect.remove(1);
        }

        if (classes.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Không có lớp học nào';
            classSelect.appendChild(emptyOption);
            return;
        }

        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            classSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading classes for import modal:', error);
        if (classSelect.options.length > 1) {
            classSelect.remove(1);
        }
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Không thể tải lớp học';
        classSelect.appendChild(errorOption);
    }
}

function openImportQuestionsModal() {
    const { modal } = getImportElements();
    if (!modal) return;

    resetQuestionImportState();
    populateImportClassDropdown();
    modal.style.display = 'flex';
}

function closeImportQuestionsModal(forceClose = false) {
    const { modal } = getImportElements();
    if (!modal) return;

    const hasPendingData =
        questionImportState.file ||
        questionImportState.previewRows.length > 0 ||
        questionImportState.parsedQuestions.length > 0;

    if (hasPendingData && !forceClose) {
        const confirmClose = confirm('Dữ liệu import sẽ bị xóa. Bạn có chắc muốn đóng?');
        if (!confirmClose) return;
    }

    modal.style.display = 'none';
    resetQuestionImportState();
}

function triggerImportFilePicker() {
    const { fileInput } = getImportElements();
    if (fileInput) {
        fileInput.click();
    }
}

function handleImportFileChange(event) {
    const file = event?.target?.files?.[0] || null;
    const { selectedFileName } = getImportElements();

    questionImportState.file = file;
    questionImportState.fileName = file ? file.name : '';

    if (selectedFileName) {
        selectedFileName.textContent = file ? file.name : 'Chưa chọn file';
    }

    updateImportButtonsState();
}

function updateImportButtonsState() {
    const { previewButton, confirmButton } = getImportElements();
    const canPreview =
        !!questionImportState.classId &&
        !!questionImportState.file &&
        !questionImportState.isPreviewing;

    if (previewButton) {
        previewButton.disabled = !canPreview;
    }

    updateConfirmButtonState(confirmButton);
}

function hasBlockingImportErrors() {
    const hasValidRow = questionImportState.previewRows.some(row => row.isValid !== false);
    const topLevelErrors = (questionImportState.errors || []).some(err => {
        const severity = (err?.severity || err?.level || 'error').toString().toLowerCase();
        return severity === 'error';
    });

    if (hasValidRow) {
        return false;
    }

    if (questionImportState.previewRows.length === 0) {
        return topLevelErrors;
    }

    return true;
}

function updateConfirmButtonState(buttonOverride) {
    const confirmButton = buttonOverride || getImportElements().confirmButton;
    if (!confirmButton) return;

    const hasValidRows = questionImportState.previewRows.some(
        row => row.isValid !== false && row.payload
    );
    const canConfirm =
        !!questionImportState.classId &&
        hasValidRows &&
        !questionImportState.isImporting;

    confirmButton.disabled = !canConfirm;
}

function sanitizeCellValue(cell) {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number') return cell.toString();
    return cell.toString().trim();
}

function isEmptyRow(row) {
    if (!row) return true;
    return row.every(cell => !sanitizeCellValue(cell));
}

function getRowText(row) {
    if (!row) return '';
    return row
        .map(cell => sanitizeCellValue(cell))
        .filter(Boolean)
        .join(' ')
        .trim();
}

function stripOptionLabel(value) {
    if (!value) return '';
    return value.replace(/^[A-D]\s*[\.\)]?\s*/i, '').trim();
}

function findXMarkerIndex(row) {
    if (!Array.isArray(row)) return -1;
    return row.findIndex(cell => sanitizeCellValue(cell).toLowerCase() === 'x');
}

function groupRowsIntoBlocks(rows) {
    const blocks = [];
    let current = [];

    (rows || []).forEach(row => {
        if (isEmptyRow(row)) {
            if (current.length > 0) {
                blocks.push(current);
                current = [];
            }
        } else {
            current.push(row);
        }
    });

    if (current.length > 0) {
        blocks.push(current);
    }

    return blocks;
}

function detectCorrectAnswer(block, optionRowCount) {
    const optionLetters = ['A', 'B', 'C', 'D'];

    // Strategy 1: look for 'x' marker directly on option rows
    let optionIndex = 0;
    for (let i = 1; i < block.length && optionIndex < optionLetters.length; i++) {
        const row = block[i];
        if (isEmptyRow(row)) continue;

        const hasMarker = row.some(cell => sanitizeCellValue(cell).toLowerCase() === 'x');
        if (hasMarker) {
            return optionLetters[optionIndex];
        }

        optionIndex++;
    }

    // Strategy 2: look for dedicated marker rows (e.g., row with only x in a column)
    for (const row of block.slice(optionRowCount + 1)) {
        const markerIndex = findXMarkerIndex(row);
        if (markerIndex >= 0 && markerIndex < optionLetters.length) {
            return optionLetters[markerIndex];
        }
    }

    return null;
}

function buildPreviewRowsFromBlocks(blocks) {
    const optionLetters = ['A', 'B', 'C', 'D'];

    return blocks.map((block, blockIndex) => {
        const options = { A: '', B: '', C: '', D: '' };
        const messages = [];

        const questionText = getRowText(block[0]);
        if (!questionText) {
            messages.push('Thiếu nội dung câu hỏi.');
        }

        let optionIndex = 0;
        for (let i = 1; i < block.length && optionIndex < optionLetters.length; i++) {
            const row = block[i];
            if (isEmptyRow(row)) continue;
            const rowText = stripOptionLabel(getRowText(row));
            if (!rowText) continue;
            const letter = optionLetters[optionIndex];
            options[letter] = rowText;
            optionIndex++;
        }

        if (optionIndex < optionLetters.length) {
            messages.push('Cần đủ 4 đáp án A, B, C, D cho mỗi câu hỏi.');
        }

        const correctAnswer = detectCorrectAnswer(block, optionIndex);
        if (!correctAnswer) {
            messages.push('Chưa xác định đáp án đúng. Vui lòng đặt "x" tại cột tương ứng.');
        }

        const isValid = Boolean(
            questionText &&
            optionIndex === optionLetters.length &&
            correctAnswer
        );

        return {
            index: blockIndex + 1,
            content: questionText,
            options,
            correctAnswer,
            message: messages.join(' '),
            isValid,
            payload: isValid
                ? {
                      content: questionText,
                      answerA: options.A,
                      answerB: options.B,
                      answerC: options.C,
                      answerD: options.D,
                      correctAnswer
                  }
                : null
        };
    });
}

// Load XLSX library dynamically if not already loaded
async function ensureXLSXLibrary() {
    // Check if already loaded
    if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') {
        return true;
    }

    // Wait a bit for script to load (in case it's still loading)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check again
    if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') {
        return true;
    }

    // Try to load dynamically
    return new Promise((resolve, reject) => {
        // Check if script tag already exists
        const existingScript = document.querySelector('script[src*="xlsx"]');
        if (existingScript) {
            // Script exists but not loaded yet, wait for it
            existingScript.addEventListener('load', () => {
                if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') {
                    resolve(true);
                } else {
                    reject(new Error('XLSX script loaded but library not available'));
                }
            });
            existingScript.addEventListener('error', () => {
                reject(new Error('Failed to load XLSX script'));
            });
            // Wait up to 5 seconds
            setTimeout(() => {
                if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') {
                    resolve(true);
                } else {
                    reject(new Error('XLSX library timeout'));
                }
            }, 5000);
        } else {
            // Create and load script
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') {
                    resolve(true);
                } else {
                    reject(new Error('XLSX script loaded but library not available'));
                }
            };
            script.onerror = () => {
                reject(new Error('Failed to load XLSX library from CDN'));
            };
            document.head.appendChild(script);
        }
    });
}

async function readWorksheetRowsFromFile(file) {
    const extension = (file.name.split('.').pop() || '').toLowerCase();

    if (extension === 'csv' || extension === 'txt') {
        const text = await file.text();
        return text
            .split(/\r?\n/)
            .map(line => line.split(/,|\t|;/).map(cell => cell.trim()));
    }

    // Ensure XLSX library is loaded
    try {
        await ensureXLSXLibrary();
    } catch (error) {
        console.error('Error loading XLSX library:', error);
        const errorMsg = 'Không thể tải thư viện đọc Excel. Vui lòng:\n' +
            '1. Kiểm tra kết nối internet\n' +
            '2. Tải lại trang (F5 hoặc Ctrl+R)\n' +
            '3. Hoặc chuyển file sang định dạng CSV và thử lại';
        throw new Error(errorMsg);
    }

    // Verify XLSX is available
    if (typeof XLSX === 'undefined' || typeof XLSX.read !== 'function') {
        throw new Error('Thư viện XLSX không khả dụng sau khi tải. Vui lòng thử chuyển file sang CSV.');
    }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('File Excel không có sheet nào.');
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
            throw new Error('Không thể đọc sheet đầu tiên từ file Excel.');
        }
        
        return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    } catch (error) {
        console.error('Error reading Excel file:', error);
        if (error.message.includes('XLSX') || error.message.includes('library')) {
            throw error;
        }
        throw new Error('Không thể đọc file Excel: ' + (error.message || 'Lỗi không xác định') + '. Vui lòng kiểm tra định dạng file hoặc thử chuyển sang CSV.');
    }
}

async function generatePreviewFromFile(file) {
    const rows = await readWorksheetRowsFromFile(file);
    const filteredRows = rows.filter((row, index) => {
        if (index === 0) {
            const headerText = getRowText(row).toLowerCase();
            return !(
                headerText.includes('câu hỏi') &&
                headerText.includes('a') &&
                headerText.includes('b')
            );
        }
        return true;
    });

    const blocks = groupRowsIntoBlocks(filteredRows);
    return buildPreviewRowsFromBlocks(blocks);
}

function setButtonLoading(button, isLoading, loadingLabel) {
    if (!button) return { restore: () => {} };
    const originalText = button.innerHTML;
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingLabel || 'Đang xử lý...'}`;
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
    return {
        restore: () => {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    };
}

function showImportStatus(message, type = 'info') {
    const { statusMessage } = getImportElements();
    if (!statusMessage) return;

    const typeClass = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
    }[type] || 'info';

    statusMessage.textContent = message;
    statusMessage.className = `import-status-message ${typeClass}`;
    statusMessage.style.display = message ? 'block' : 'none';
}

function safeText(value) {
    if (value === null || value === undefined) return '';
    return value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderImportPreview(rows, errors = []) {
    const {
        previewContainer,
        previewSummary,
        previewErrors,
        previewBody
    } = getImportElements();

    if (!previewContainer || !previewBody) {
        return;
    }

    if ((!rows || rows.length === 0) && (!errors || errors.length === 0)) {
        previewContainer.style.display = 'none';
        previewBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:24px;">Chưa có dữ liệu xem trước.</td>
            </tr>
        `;
        updateConfirmButtonState();
        return;
    }

    const validCount = rows.filter(row => row.isValid !== false).length;
    const invalidCount = rows.length - validCount;
    const summaryText = `Có ${rows.length} câu hỏi, ${validCount} hợp lệ, ${invalidCount} lỗi.`;

    if (previewSummary) {
        previewSummary.textContent = summaryText;
    }

    if (previewErrors) {
        if (errors && errors.length > 0) {
            previewErrors.innerHTML = errors
                .map(err => {
                    const line = err?.line || err?.row || err?.index;
                    const prefix = line ? `Dòng ${line}: ` : '';
                    const message = err?.message || err?.error || safeText(err);
                    return `<div class="import-error-item">${prefix}${safeText(message)}</div>`;
                })
                .join('');
        } else {
            previewErrors.innerHTML = '';
        }
    }

    if (rows.length === 0) {
        previewBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:24px;">Không tìm thấy câu hỏi hợp lệ trong file.</td>
            </tr>
        `;
    } else {
        previewBody.innerHTML = rows
            .map((row, idx) => {
                const statusClass = row.isValid === false ? 'status-error' : 'status-success';
                const statusText = row.isValid === false ? 'Lỗi' : 'Hợp lệ';
                return `
                    <tr class="${statusClass}">
                        <td>${idx + 1}</td>
                        <td>${safeText(row.content)}</td>
                        <td>${safeText(row.options.A)}</td>
                        <td>${safeText(row.options.B)}</td>
                        <td>${safeText(row.options.C)}</td>
                        <td>${safeText(row.options.D)}</td>
                        <td>${safeText(row.correctAnswer || '--')}</td>
                        <td>${safeText(row.message || statusText)}</td>
                    </tr>
                `;
            })
            .join('');
    }

    previewContainer.style.display = 'block';
    updateConfirmButtonState();
}

async function handleImportPreview(event) {
    if (event) {
        event.preventDefault();
    }

    if (!questionImportState.classId) {
        showImportStatus('Vui lòng chọn lớp học.', 'warning');
        return;
    }

    if (!questionImportState.file) {
        showImportStatus('Vui lòng chọn file Excel/CSV.', 'warning');
        return;
    }

    if (questionImportState.isPreviewing) {
        return;
    }

    questionImportState.isPreviewing = true;
    questionImportState.uploadToken = null;
    questionImportState.previewRows = [];
    questionImportState.parsedQuestions = [];
    questionImportState.errors = [];

    const { previewButton } = getImportElements();
    const loader = setButtonLoading(previewButton, true, 'Đang xử lý...');

    try {
        showImportStatus('Đang phân tích file Excel...', 'info');

        const previewRows = await generatePreviewFromFile(questionImportState.file);
        questionImportState.previewRows = previewRows;
        questionImportState.parsedQuestions = previewRows
            .filter(row => row.isValid !== false && row.payload)
            .map(row => row.payload);

        questionImportState.errors = previewRows
            .filter(row => row.isValid === false)
            .map(row => ({
                line: row.index,
                message: row.message || 'Dữ liệu không hợp lệ'
            }));

        renderImportPreview(previewRows, questionImportState.errors);

        if (previewRows.length === 0) {
            showImportStatus(
                'Không tìm thấy câu hỏi nào trong file. Vui lòng kiểm tra định dạng (Câu hỏi + A/B/C/D + hàng chứa "x").',
                'warning'
            );
        } else if (questionImportState.parsedQuestions.length === 0) {
            showImportStatus(
                'Đã đọc file nhưng chưa có câu hỏi hợp lệ. Vui lòng bổ sung đủ đáp án và đánh dấu "x" cho đáp án đúng.',
                'warning'
            );
        } else if (questionImportState.parsedQuestions.length < previewRows.length) {
            showImportStatus(
                'Đã đọc file. Một số câu hỏi còn lỗi, vui lòng kiểm tra bảng xem trước trước khi import.',
                'warning'
            );
        } else {
            showImportStatus('Đã đọc file thành công. Bạn có thể tiến hành import.', 'success');
        }
    } catch (error) {
        console.error('Error previewing question import:', error);
        
        // Extract error message
        let errorMessage = error.message || 'Không thể đọc file import.';
        
        // Check if it's an XLSX library error
        if (errorMessage.includes('XLSX') || errorMessage.includes('thư viện') || errorMessage.includes('library')) {
            errorMessage = errorMessage.replace(/\n/g, '<br>');
            showImportStatus(errorMessage, 'error');
            
            // Also show in preview errors section
            const { previewErrors } = getImportElements();
            if (previewErrors) {
                previewErrors.innerHTML = `<div class="import-error-item" style="color: #dc3545; font-weight: bold;">${errorMessage}</div>`;
            }
        } else {
            showImportStatus(errorMessage, 'error');
        }
        
        renderImportPreview([], [{ message: errorMessage }]);
    } finally {
        loader.restore();
        questionImportState.isPreviewing = false;
        updateImportButtonsState();
    }
}

async function confirmQuestionImport() {
    if (!questionImportState.classId) {
        showImportStatus('Vui lòng chọn lớp học.', 'warning');
        return;
    }

    const validRows = questionImportState.previewRows.filter(
        row => row.isValid !== false && row.payload
    );

    if (validRows.length === 0) {
        showImportStatus('Chưa có câu hỏi hợp lệ để import. Vui lòng kiểm tra lại file.', 'warning');
        return;
    }

    if (questionImportState.isImporting) {
        return;
    }

    questionImportState.isImporting = true;
    const { confirmButton } = getImportElements();
    const loader = setButtonLoading(confirmButton, true, 'Đang import...');

    try {
        showImportStatus('Đang import câu hỏi... Vui lòng chờ.', 'info');

        const payloads = validRows.map(row => row.payload);
        const { successes, failures } = await importQuestionsIntoClass(
            questionImportState.classId,
            payloads
        );

        if (failures.length === 0) {
            showImportStatus(`Đã import thành công ${successes.length} câu hỏi!`, 'success');
            alert(`Đã import thành công ${successes.length} câu hỏi vào lớp.`);
        } else if (successes.length === 0) {
            const errorList = failures
                .map((fail, idx) => `- Câu hỏi ${idx + 1}: ${fail.error.message}`)
                .join('\n');
            showImportStatus('Không thể import câu hỏi nào. Vui lòng kiểm tra console.', 'error');
            alert(`Không thể import câu hỏi nào.\n${errorList}`);
        } else {
            const errorSummary = failures
                .map(fail => fail.error?.message || 'Không xác định')
                .join(' | ');
            showImportStatus(
                `Đã import ${successes.length}/${payloads.length} câu hỏi. Một số câu hỏi bị lỗi: ${errorSummary}`,
                'warning'
            );
            alert(
                `Đã import ${successes.length}/${payloads.length} câu hỏi. Một số câu hỏi bị lỗi, vui lòng kiểm tra console để biết thêm chi tiết.`
            );
        }

        if (successes.length > 0) {
            closeImportQuestionsModal(true);
            if (typeof initializeQuestionBankData === 'function') {
                await initializeQuestionBankData();
            }
        }
    } catch (error) {
        console.error('Error confirming question import:', error);
        showImportStatus(error.message || 'Không thể import câu hỏi.', 'error');
    } finally {
        loader.restore();
        questionImportState.isImporting = false;
        updateImportButtonsState();
    }
}

async function importQuestionsIntoClass(classId, questionPayloads) {
    const successes = [];
    const failures = [];

    for (const payload of questionPayloads) {
        try {
            const created = await createQuestion(payload);
            const questionId = created?._id || created?.id;

            if (!questionId) {
                throw new Error('API không trả về ID câu hỏi sau khi tạo.');
            }

            await updateClassWithQuestion(classId, questionId);
            successes.push({ payload, result: created });
        } catch (error) {
            console.error('Không thể import câu hỏi:', payload?.content, error);
            failures.push({ payload, error });
        }
    }

    return { successes, failures };
}

function downloadQuestionTemplate() {
    const templateContent = [
        'Câu hỏi,A,B,C,D',
        '"Ví dụ: Phương pháp phát triển nào tập trung vào ...?","Pair Programming","Extreme Programming","Scrum","Kanban"',
        '"Đánh dấu đáp án đúng","x","","",""',
        '',
        '"Ví dụ: Thuộc tính chất lượng nào ...?","Độ tin cậy","Hiệu năng","Khả năng bảo trì","Chi phí"',
        '"Đánh dấu đáp án đúng","","","x",""',
        '',
        '# Ghi chú: Giữa các câu hỏi nên có 1 hàng trống.'
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function setupQuestionImportFeature() {
    const { modal, classSelect, fileInput } = getImportElements();

    if (classSelect) {
        classSelect.addEventListener('change', event => {
            questionImportState.classId = event.target.value;
            updateImportButtonsState();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleImportFileChange);
    }

    if (modal) {
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                closeImportQuestionsModal();
            }
        });
    }

    updateImportButtonsState();
}

// Create question via API
async function createQuestion(questionData) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Use the exact endpoint from API
        const url = `${API_BASE_URL}/questions`;

        console.log('🌐 Sending POST request to:', url);
        console.log('🌐 Request headers:', headers);
        console.log('🌐 Request body:', JSON.stringify(questionData, null, 2));
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(questionData)
        });

        console.log('🌐 Response status:', response.status, response.statusText);
        console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let errorData = null;
            try {
                errorData = await response.json();
                errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
                console.error('❌ API Error Response:', errorData);
            } catch {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                    console.error('❌ API Error Response (text):', text);
                }
            }
            throw new Error(errorMessage);
        }

        // API returns 201 Created or 200 OK
        const responseData = await response.json();
        console.log('✅ API Success Response:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error creating question:', error);
        throw error;
    }
}

// Fetch a single question by ID
async function fetchQuestionById(questionId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Không thể tải câu hỏi ${questionId}`);
        }

        const payload = await response.json();
        return unwrapSingleResponse(payload);
    } catch (error) {
        console.error(`Error fetching question ${questionId}:`, error);
        return null;
    }
}

// Delete a question via API
async function deleteQuestionAPI(questionId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const questionIdStr = normalizeId(questionId)?.toString();
        if (!questionIdStr) {
            throw new Error('ID câu hỏi không hợp lệ.');
        }

        console.log('🗑️ Starting delete process for question:', questionIdStr);

        // First, get question details to find which classes contain it
        let questionData = null;
        try {
            questionData = await fetchQuestionById(questionIdStr);
            console.log('📋 Question data fetched:', questionData ? 'Yes' : 'No');
        } catch (error) {
            console.warn('⚠️ Could not fetch question details before deletion:', error);
        }

        // Delete the question
        console.log('🌐 Sending DELETE request to:', `${API_BASE_URL}/questions/${questionIdStr}`);
        const response = await fetch(`${API_BASE_URL}/questions/${questionIdStr}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('❌ API Error Response:', errorData);
            } catch (parseError) {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                    console.error('❌ API Error Response (text):', text);
                }
            }
            throw new Error(errorMessage || 'Không thể xóa câu hỏi. Vui lòng thử lại.');
        }

        console.log('✅ Question deleted successfully from API');

        // Clean up question from classes
        // Note: We need to find all classes that contain this question
        try {
            console.log('🧹 Starting cleanup: removing question from classes...');
            // Load all classes to find which ones contain this question
            const allClasses = await loadAllClasses();
            console.log('📚 Loaded classes:', allClasses?.length || 0);

            if (questionIdStr && allClasses && allClasses.length > 0) {
                const classUpdates = [];
                let foundInClasses = 0;

                for (const cls of allClasses) {
                    const classId = normalizeId(cls._id || cls.id);
                    if (!classId) continue;

                    const questions = Array.isArray(cls.questions) ? cls.questions : [];
                    const questionIds = questions.map(q => {
                        const qId = normalizeId(q?.question || q?.questionId || q);
                        return qId ? qId.toString() : null;
                    }).filter(Boolean);

                    // Check if this class contains the question
                    if (questionIds.includes(questionIdStr)) {
                        foundInClasses++;
                        console.log(`📝 Found question in class: ${classId}`);
                        // Remove question from class
                        const updatedQuestions = questions.filter(q => {
                            const qId = normalizeId(q?.question || q?.questionId || q);
                            return qId ? qId.toString() !== questionIdStr : true;
                        });

                        // Update class
                        classUpdates.push(
                            removeQuestionFromClass(classId, questionIdStr, updatedQuestions)
                        );
                    }
                }

                console.log(`🔗 Found question in ${foundInClasses} class(es)`);

                // Execute all class updates in parallel (don't wait for failures)
                if (classUpdates.length > 0) {
                    console.log('🔄 Updating classes...');
                    await Promise.allSettled(classUpdates);
                    console.log('✅ Class updates completed');
                } else {
                    console.log('ℹ️ Question not found in any classes');
                }
            } else {
                console.log('ℹ️ No classes to check or questionId is invalid');
            }
        } catch (error) {
            console.warn('⚠️ Error cleaning up question from classes:', error);
            // Continue even if cleanup fails - question is already deleted
        }

        console.log('✅ Delete process completed successfully');
        return true;
    } catch (error) {
        console.error('Error deleting question:', error);
        throw error;
    }
}

// Remove question from a class
async function removeQuestionFromClass(classId, questionId, updatedQuestions) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const response = await fetch(`${API_BASE_URL}/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questions: updatedQuestions
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể cập nhật lớp học');
        }

        return await response.json();
    } catch (error) {
        console.error(`Error removing question from class ${classId}:`, error);
        throw error;
    }
}

function formatQuestionForUI(questionDoc, classInfo) {
    if (!questionDoc) return null;

    const questionId = questionDoc._id || questionDoc.id;
    const optionsArray = Array.isArray(questionDoc.options) ? questionDoc.options : null;

    const optionMap = {
        A: '',
        B: '',
        C: '',
        D: ''
    };

    if (optionsArray) {
        optionMap.A = optionsArray[0] ?? '';
        optionMap.B = optionsArray[1] ?? '';
        optionMap.C = optionsArray[2] ?? '';
        optionMap.D = optionsArray[3] ?? '';
    } else if (questionDoc.options && typeof questionDoc.options === 'object') {
        optionMap.A = questionDoc.options.A ?? questionDoc.options.answerA ?? '';
        optionMap.B = questionDoc.options.B ?? questionDoc.options.answerB ?? '';
        optionMap.C = questionDoc.options.C ?? questionDoc.options.answerC ?? '';
        optionMap.D = questionDoc.options.D ?? questionDoc.options.answerD ?? '';
    } else {
        optionMap.A = questionDoc.answerA ?? '';
        optionMap.B = questionDoc.answerB ?? '';
        optionMap.C = questionDoc.answerC ?? '';
        optionMap.D = questionDoc.answerD ?? '';
    }

    const createdAt = questionDoc.createdAt || questionDoc.created_at || questionDoc.createdOn || questionDoc.updatedAt || null;
    const correctAnswer = questionDoc.correctAnswer || questionDoc.correct || questionDoc.correct_option || questionDoc.rightAnswer;

    return {
        id: questionId,
        questionId,
        subject: classInfo?.id || classInfo?._id || questionDoc.classId || questionDoc.courseId || 'unknown',
        subjectId: classInfo?.id || classInfo?._id || questionDoc.classId || questionDoc.courseId || 'unknown',
        subjectName: classInfo?.name || classInfo?.classCode || classInfo?.raw?.classCode || questionDoc.subjectName || 'Không xác định',
        title: questionDoc.content || questionDoc.text || 'Câu hỏi chưa có tiêu đề',
        content: questionDoc.content || questionDoc.text || '',
        options: optionMap,
        correct: correctAnswer,
        correctAnswer: correctAnswer,
        createdAt,
        raw: questionDoc
    };
}

function computeQuestionBankStats(questions, classes) {
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;
    const totalSubjects = Array.isArray(classes) ? classes.length : 0;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const addedThisWeek = (questions || []).filter(q => {
        if (!q?.createdAt) return false;
        const created = new Date(q.createdAt);
        if (Number.isNaN(created.getTime())) return false;
        return created >= weekAgo && created <= now;
    }).length;

    return {
        totalQuestions,
        totalSubjects,
        addedThisWeek
    };
}

function updateQuestionBankStatistics(stats) {
    const { totalQuestions = 0, totalSubjects = 0, addedThisWeek = 0 } = stats || {};

    const totalQuestionsEl = document.getElementById('totalQuestionsStat');
    const totalSubjectsEl = document.getElementById('totalSubjectsStat');
    const weeklyAddedEl = document.getElementById('weeklyAddedStat');

    if (totalQuestionsEl) totalQuestionsEl.textContent = formatNumber(totalQuestions);
    if (totalSubjectsEl) totalSubjectsEl.textContent = formatNumber(totalSubjects);
    if (weeklyAddedEl) weeklyAddedEl.textContent = formatNumber(addedThisWeek);
}

function formatNumber(value) {
    try {
        return new Intl.NumberFormat('vi-VN').format(value || 0);
    } catch {
        return value?.toString() ?? '0';
    }
}

async function loadQuestionBankDataForTeacher() {
    try {
        const classes = await getTeacherClassesWithCache();

        if (!classes || classes.length === 0) {
            updateQuestionBankStatistics({ totalQuestions: 0, totalSubjects: 0, addedThisWeek: 0 });
            return { classes: [], questions: [] };
        }

        const questions = [];
        const seenQuestionIds = new Set();

        for (const cls of classes) {
            let classData = cls.raw;
            if (!classData || typeof classData !== 'object') {
                try {
                    classData = await getClassById(cls.id);
                    cls.raw = classData;
                } catch (error) {
                    console.warn('Không thể tải dữ liệu lớp:', cls.id, error);
                    continue;
                }
            }

            const rawQuestions = Array.isArray(classData?.questions) ? classData.questions : [];
            if (!rawQuestions.length) {
                continue;
            }

            for (const questionEntry of rawQuestions) {
                const questionId = normalizeId(questionEntry?.question || questionEntry?.questionId || questionEntry);
                const idToUse = questionId || normalizeId(questionEntry);
                const idStr = idToUse ? idToUse.toString() : null;

                if (idStr && seenQuestionIds.has(idStr)) {
                    continue;
                }

                let questionDoc = null;

                if (questionEntry && typeof questionEntry === 'object' && Object.keys(questionEntry).length > 0 && !questionEntry.questionIdReference) {
                    // Some APIs embed the whole question object
                    questionDoc = questionEntry;
                }

                if (!questionDoc && idToUse) {
                    questionDoc = await fetchQuestionById(idToUse);
                }

                if (!questionDoc) {
                    continue;
                }

                const docId = questionDoc._id || questionDoc.id || idToUse;
                if (docId) {
                    seenQuestionIds.add(docId.toString());
                }

                const formatted = formatQuestionForUI(questionDoc, cls);
                if (formatted) {
                    questions.push(formatted);
                }
            }
        }

        const stats = computeQuestionBankStats(questions, classes);
        updateQuestionBankStatistics(stats);

        return { classes, questions };
    } catch (error) {
        console.error('Error loading question bank data:', error);
        updateQuestionBankStatistics({ totalQuestions: 0, totalSubjects: 0, addedThisWeek: 0 });
        return { classes: [], questions: [] };
    }
}

async function initializeQuestionBankData() {
    try {
        // Reset cache to ensure fresh data from API
        teacherClassesCache = null;

        const { classes, questions } = await loadQuestionBankDataForTeacher();

        if (typeof window.updateQuestionBankData === 'function') {
            window.updateQuestionBankData(questions, { classes });
        } else {
            window.questionBankData = questions;
            window.questionBankClasses = classes;
            if (typeof loadQuestions === 'function') {
                loadQuestions();
            }
        }
    } catch (error) {
        console.error('Error initializing question bank data:', error);
    }
}

// Update class with question ID
async function updateClassWithQuestion(classId, questionId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        // Get current class data
        const getResponse = await fetch(`${API_BASE_URL}/classes/${classId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getResponse.ok) {
            throw new Error('Không thể lấy thông tin lớp học');
        }

        const classData = await getResponse.json();

        // Add questionId to questions array if not already present
        const questions = classData.questions || [];
        const questionIdStr = questionId.toString();
        
        // Normalize all question IDs to strings for comparison
        const questionIdsAsStrings = questions.map(q => q?.toString() || q);
        
        // Check if questionId already exists (compare as strings)
        if (!questionIdsAsStrings.includes(questionIdStr)) {
            questions.push(questionId);
            console.log(`Added question ${questionIdStr} to class ${classId}`);
        } else {
            console.log(`Question ${questionIdStr} already exists in class ${classId}`);
        }

        // Update class
        const updateResponse = await fetch(`${API_BASE_URL}/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questions: questions
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'Không thể cập nhật lớp học');
        }

        return await updateResponse.json();
    } catch (error) {
        console.error('Error updating class with question:', error);
        throw error;
    }
}

// Save all batch questions to API
async function saveAllBatchQuestionsAPI(batchQuestions) {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID người dùng.');
        }

        const results = [];
        const errors = [];

        // Save each question
        for (const question of batchQuestions) {
            try {
                // Get classId (selected in dropdown)
                const classId = question.subjectId || question.subject;
                if (!classId) {
                    throw new Error('Thiếu thông tin lớp học');
                }

                // Prepare payload according to API requirements (NO courseId needed):
                // { content, answerA, answerB, answerC, answerD, correctAnswer }
                const questionData = {
                    content: question.content || question.title,
                    answerA: question.options?.A || '',
                    answerB: question.options?.B || '',
                    answerC: question.options?.C || '',
                    answerD: question.options?.D || '',
                    correctAnswer: question.correctAnswer || question.correct // "A" | "B" | "C" | "D"
                };

                // Validate that all required fields are present
                if (!questionData.content) {
                    throw new Error('Thiếu trường bắt buộc: content');
                }
                if (!questionData.answerA || !questionData.answerB || !questionData.answerC || !questionData.answerD) {
                    throw new Error('Thiếu trường bắt buộc: answerA, answerB, answerC, hoặc answerD');
                }
                if (!questionData.correctAnswer) {
                    throw new Error('Thiếu trường bắt buộc: correctAnswer');
                }

                console.log('📤 Creating question with data:', questionData);
                console.log('📤 Request URL:', `${API_BASE_URL}/questions`);
                
                const result = await createQuestion(questionData);
                console.log('📥 API Response:', result);
                
                const questionId = result._id || result.id;
                
                if (!questionId) {
                    console.error('❌ Question created but no ID returned. Full response:', result);
                    throw new Error('Câu hỏi được tạo nhưng không có ID trả về từ API');
                }

                console.log('✅ Question created successfully with ID:', questionId);

                // Update class with question ID
                try {
                    await updateClassWithQuestion(classId, questionId);
                    console.log('Class updated with question ID:', questionId);
                } catch (updateError) {
                    console.error('Error updating class with question:', updateError);
                    // Continue even if update fails - question is already created
                    // But log the error
                    errors.push({
                        question: question.title || question.content,
                        error: `Câu hỏi đã được tạo nhưng không thể cập nhật vào lớp học: ${updateError.message}`
                    });
                    // Still add to results since question was created
                    results.push(result);
                    continue;
                }

                results.push(result);
            } catch (error) {
                console.error('Error creating question:', error);
                errors.push({ 
                    question: question.title || question.content, 
                    error: error.message 
                });
            }
        }

        return { results, errors };
    } catch (error) {
        console.error('Error saving batch questions:', error);
        throw error;
    }
}

// Override saveAllBatchQuestions function after page loads
// This ensures it runs after the inline script in QuestionBank.cshtml
function setupSaveAllBatchQuestions() {
    // Define the API-based save function
    window.saveAllBatchQuestions = async function() {
        // Access batchQuestions from the global scope (defined in QuestionBank.cshtml)
        const batchQuestions = window.batchQuestions || [];
        
        console.log('🔵 saveAllBatchQuestions called with', batchQuestions.length, 'questions');
        console.log('🔵 batchQuestions:', batchQuestions);
        
        if (batchQuestions.length === 0) {
            alert('Chưa có câu hỏi nào để lưu!');
            return;
        }

        if (!confirm(`Lưu ${batchQuestions.length} câu hỏi vào ngân hàng?`)) {
            return;
        }

        // Disable save button
        const saveBtn = document.querySelector('#batchSaveActions .btn-success');
        const originalText = saveBtn ? saveBtn.textContent : 'Lưu tất cả';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Đang lưu...';
        }

        try {
            console.log('🚀 Starting to save batch questions to API...');
            console.log('📝 Batch questions data:', JSON.stringify(batchQuestions, null, 2));

            // Save to API
            const { results, errors } = await saveAllBatchQuestionsAPI(batchQuestions);

            console.log('✅ Save completed. Results:', results);
            console.log('❌ Errors:', errors);

            if (errors.length > 0) {
                const errorMessages = errors.map(e => {
                    const questionTitle = typeof e.question === 'string' ? e.question : (e.question?.title || e.question?.content || 'Câu hỏi');
                    return `- ${questionTitle}: ${e.error}`;
                }).join('\n');
                alert(`⚠️ Đã lưu ${results.length} câu hỏi thành công.\n\nCó ${errors.length} câu hỏi bị lỗi:\n${errorMessages}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết lỗi.`);
            } else {
                alert(`✅ Đã lưu thành công ${results.length} câu hỏi!`);
            }

            // Clear batch questions after successful save
            if (window.batchQuestions) {
                window.batchQuestions = [];
            }
            // Also clear local batchQuestions if it exists
            if (typeof batchQuestions !== 'undefined' && Array.isArray(batchQuestions)) {
                batchQuestions.length = 0;
            }
            
            // Update UI if functions exist
            if (typeof updateBatchCount === 'function') {
                updateBatchCount();
            }
            if (typeof renderBatchQuestions === 'function') {
                renderBatchQuestions();
            }

            // Close modal and refresh
            if (typeof closeAddQuestionModal === 'function') {
                closeAddQuestionModal();
            } else {
                const modal = document.getElementById('addQuestionModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
            
            // Reload questions from server (if function exists)
            if (typeof loadQuestions === 'function') {
                loadQuestions();
            }

            // Refresh statistics and cached data from API
            await initializeQuestionBankData();
        } catch (error) {
            console.error('❌ Error saving batch questions:', error);
            console.error('❌ Error stack:', error.stack);
            alert(`❌ Có lỗi xảy ra khi lưu câu hỏi: ${error.message}\n\nVui lòng mở Console (F12) để xem chi tiết.`);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    };
    
    console.log('✅ saveAllBatchQuestions function has been set up with API integration');
}

// Setup immediately when script loads (before DOMContentLoaded)
setupSaveAllBatchQuestions();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for inline scripts to finish executing
    setTimeout(function() {
        // Re-setup saveAllBatchQuestions after inline scripts have loaded (in case they override it)
        console.log('🔄 Re-setting up saveAllBatchQuestions after inline scripts...');
        setupSaveAllBatchQuestions();

        // Load statistics and questions data from API
        initializeQuestionBankData();

        // Override openAddQuestionModal function to populate dropdown
        if (typeof window.openAddQuestionModal === 'function') {
            const originalOpenModal = window.openAddQuestionModal;
            window.openAddQuestionModal = function() {
                originalOpenModal();
                // Populate dropdown after modal is shown
                setTimeout(function() {
                    populateSubjectDropdown();
                }, 100);
            };
        }

        // Also listen for modal visibility changes
        const modal = document.getElementById('addQuestionModal');
        if (modal) {
            // Use MutationObserver to watch for style changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const display = window.getComputedStyle(modal).display;
                        if (display === 'flex' || display === 'block') {
                            // Modal is now visible, populate dropdown
                            populateSubjectDropdown();
                        }
                    }
                });
            });
            observer.observe(modal, { 
                attributes: true, 
                attributeFilter: ['style'],
                attributeOldValue: false
            });
        }

        // Initialize import modal handlers once DOM is ready
        setupQuestionImportFeature();

        // Also populate if modals are already open on page load
        if (modal) {
            const display = window.getComputedStyle(modal).display;
            if (display === 'flex' || display === 'block') {
                populateSubjectDropdown();
            }
        }

        const importModal = document.getElementById('importQuestionModal');
        if (importModal) {
            const display = window.getComputedStyle(importModal).display;
            if (display === 'flex' || display === 'block') {
                populateImportClassDropdown();
            }
        }
    }, 500);
});

