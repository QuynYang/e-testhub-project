// CreateExam.js - Multi-step form wizard functionality

let currentStep = 1;
const totalSteps = 4;
let manualQuestionIndex = 0;
let manualQuestions = [];
let questionBankData = [];
let selectedBankQuestionIds = new Set();
let questionBankLoading = false;
let currentExamId = null;

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

document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    setupTabSystem();
    setupManualQuestions();
    updateStepDisplay();
});

document.addEventListener('examClassOptionsReady', () => {
    handleClassChange().catch(error => console.error('Không thể tải ngân hàng câu hỏi sau khi nhận lớp:', error));
});

document.addEventListener('examQuestionBankDataUpdated', (event) => {
    const data = event?.detail?.questions || questionBankData;
    renderQuestionBankList(Array.isArray(data) ? data : questionBankData);
    filterQuestions();
    updateQuestionCounts();
});

// Initialize form
function initializeForm() {
    // Set default dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    document.getElementById('startDate').value = formatDateTimeLocal(tomorrow);
    document.getElementById('endDate').value = formatDateTimeLocal(oneWeekLater);

}

// Setup event listeners
function setupEventListeners() {
    // Navigation buttons
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
    document.getElementById('publishBtn').addEventListener('click', publishExam);
 
    // Form submission
    document.getElementById('createExamForm').addEventListener('submit', function(e) {
        e.preventDefault();
        publishExam();
    });
 
    // Subject change -> reload question bank
    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            handleClassChange().catch(error => {
                console.error('Không thể tải ngân hàng câu hỏi:', error);
            });
        });
    }

    // Question bank container event delegation
    const questionBankList = document.getElementById('questionBankList');
    if (questionBankList) {
        questionBankList.addEventListener('change', handleQuestionBankCheckboxChange);
        questionBankList.addEventListener('click', handleQuestionBankItemClick);
    }
 
    // Question filters
    const filterCheckboxes = document.querySelectorAll('.question-filter');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', filterQuestions);
    });
    
    // Real-time validation
    const requiredInputs = document.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateInput(this);
            }
        });
    });
}

// Navigate to next step
async function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }

    if (currentStep === 1) {
        const saved = await saveStepOneToAPI();
        if (!saved) {
            return;
        }
    }

    if (currentStep < totalSteps) {
        currentStep++;
        updateStepDisplay();

        if (currentStep === 4) {
            updatePreview();
        }
    }
}

// Navigate to previous step
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Update step display
function updateStepDisplay() {
    // Update step indicators
    const steps = document.querySelectorAll('.exam-step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.querySelector('.exam-step-circle').innerHTML = '<i class="fas fa-check"></i>';
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.querySelector('.exam-step-circle').textContent = stepNumber;
        } else {
            step.querySelector('.exam-step-circle').textContent = stepNumber;
        }
    });
    
    // Update form sections
    const sections = document.querySelectorAll('.exam-form-section');
    sections.forEach((section, index) => {
        section.classList.toggle('active', index + 1 === currentStep);
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const publishBtn = document.getElementById('publishBtn');
    
    prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
    publishBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
 
    if (currentStep === 2) {
        handleClassChange()
            .then(() => {
                renderQuestionBankList(questionBankData);
                filterQuestions();
                updateQuestionCounts();
            })
            .catch(error => {
                console.error('Không thể tải ngân hàng câu hỏi khi chuyển bước:', error);
                renderQuestionBankError(error?.message || 'Không thể tải câu hỏi.');
            });
    }
 
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate current step
function validateStep(step) {
    let isValid = true;
    
    switch(step) {
        case 1:
            // Validate basic information
            const examName = document.getElementById('examName');
            const subject = document.getElementById('subject');
            const duration = document.getElementById('duration');
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');
            
            isValid = validateInput(examName) && 
                     validateInput(subject) && 
                     validateInput(duration) && 
                     validateInput(startDate) && 
                     validateInput(endDate);
            
            // Check if end date is after start date
            if (isValid && new Date(endDate.value) <= new Date(startDate.value)) {
                endDate.classList.add('error');
                const errorMsg = endDate.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('exam-error-message')) {
                    errorMsg.textContent = 'Ngày đóng đề phải sau ngày mở đề';
                    errorMsg.style.display = 'block';
                }
                isValid = false;
            }
            break;
            
        case 2:
            // Validate question selection (manual + bank)
            const manualCards = document.querySelectorAll('.manual-question-card');
            const bankQuestions = document.querySelectorAll('.question-checkbox:checked');
            
            if (manualCards.length === 0 && bankQuestions.length === 0) {
                alert('Vui lòng nhập câu hỏi thủ công hoặc chọn từ ngân hàng câu hỏi');
                isValid = false;
                break;
            }
            
            // Validate manual questions
            manualCards.forEach(card => {
                const questionText = card.querySelector('.manual-question-text').value.trim();
                const questionType = card.querySelector('.manual-question-type').value;
                const points = card.querySelector('.manual-question-points').value;
                
                if (!questionText) {
                    alert('Vui lòng nhập nội dung cho tất cả câu hỏi');
                    isValid = false;
                    return;
                }
                
                if (!points || points < 1) {
                    alert('Vui lòng nhập điểm hợp lệ cho tất cả câu hỏi (tối thiểu 1 điểm)');
                    isValid = false;
                    return;
                }
                
                // Validate answers for multiple choice questions
                if (questionType !== 'essay') {
                    const answers = card.querySelectorAll('.answer-text');
                    const checkedAnswer = card.querySelector('.answer-radio:checked');
                    
                    if (answers.length < 2) {
                        alert('Mỗi câu hỏi trắc nghiệm cần ít nhất 2 đáp án');
                        isValid = false;
                        return;
                    }
                    
                    // Check if all answers have text
                    let allAnswersFilled = true;
                    answers.forEach(answer => {
                        if (!answer.value.trim()) {
                            allAnswersFilled = false;
                        }
                    });
                    
                    if (!allAnswersFilled) {
                        alert('Vui lòng nhập nội dung cho tất cả đáp án');
                        isValid = false;
                        return;
                    }
                    
                    if (!checkedAnswer) {
                        alert('Vui lòng chọn đáp án đúng cho tất cả câu hỏi trắc nghiệm');
                        isValid = false;
                        return;
                    }
                }
            });
            break;
            
        case 3:
            // Validate configuration
            const assignTo = document.getElementById('assignTo');
            isValid = validateInput(assignTo);
            break;
    }
    
    return isValid;
}

// Validate individual input
function validateInput(input) {
    const value = input.value.trim();
    let isValid = true;
    
    // Clear previous error
    input.classList.remove('error');
    const errorMsg = input.nextElementSibling;
    if (errorMsg && errorMsg.classList.contains('exam-error-message')) {
        errorMsg.style.display = 'none';
    }
    
    // Check if required
    if (input.hasAttribute('required') && !value) {
        isValid = false;
    }
    
    // Check specific validations
    if (input.type === 'number' && value) {
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        const numValue = parseInt(value);
        
        if ((min && numValue < min) || (max && numValue > max)) {
            isValid = false;
        }
    }
    
    // Show error if invalid
    if (!isValid) {
        input.classList.add('error');
        if (errorMsg && errorMsg.classList.contains('exam-error-message')) {
            errorMsg.style.display = 'block';
        }
    }
    
    return isValid;
}

// Filter questions by difficulty
function filterQuestions() {
    const filters = document.querySelectorAll('.question-filter:checked');
    const difficulties = Array.from(filters).map(f => f.dataset.difficulty);
    
    // Handle "all" checkbox
    const allCheckbox = document.querySelector('.question-filter[data-difficulty="all"]');
    if (allCheckbox.checked) {
        // Uncheck other filters
        filters.forEach(f => {
            if (f.dataset.difficulty !== 'all') {
                f.checked = false;
            }
        });
    } else if (filters.length > 1) {
        // If other filters are checked, uncheck "all"
        allCheckbox.checked = false;
    }
    
    // Show/hide questions
    const questionItems = document.querySelectorAll('.question-item');
    questionItems.forEach(item => {
        const difficulty = item.dataset.difficulty;
        const shouldShow = difficulties.includes('all') || difficulties.includes(difficulty);
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

async function handleClassChange() {
    const subjectSelect = document.getElementById('subject');
    if (!subjectSelect) return;

    const selectedClassId = subjectSelect.value;
    selectedBankQuestionIds.clear();
    updateQuestionCounts();

    if (!selectedClassId) {
        renderQuestionBankPlaceholder('Vui lòng chọn lớp học để xem ngân hàng câu hỏi.', 'fas fa-layer-group');
        return;
    }

    // Persist manual questions so they can be reused if user navigates back
    if (window.examApi && typeof window.examApi.persistManualQuestions === 'function') {
        const formData = collectFormData();
        formData.subject = selectedClassId;
        try {
            await window.examApi.persistManualQuestions(formData);
        } catch (error) {
            console.warn('Không thể lưu tạm câu hỏi thủ công khi đổi lớp:', error);
        }
    }

    await loadQuestionBankForClass(selectedClassId);
}

async function loadQuestionBankForClass(classId) {
    if (!window.examApi || typeof window.examApi.loadQuestionsForClass !== 'function') {
        renderQuestionBankList([]);
        return;
    }

    setQuestionBankLoading(true);

    try {
        let questions = await window.examApi.loadQuestionsForClass(classId);

        if ((!questions || questions.length === 0) && typeof window.examApi.loadQuestionsFromExistingExams === 'function') {
            const fallbackQuestions = await window.examApi.loadQuestionsFromExistingExams(classId);
            if (fallbackQuestions && fallbackQuestions.length > 0) {
                questions = fallbackQuestions;
            }
        }

        questionBankData = Array.isArray(questions) ? questions : [];
        setQuestionBankLoading(false);
        renderQuestionBankList(questionBankData);
        filterQuestions();
        updateQuestionCounts();

        document.dispatchEvent(new CustomEvent('examQuestionBankDataUpdated', {
            detail: {
                classId,
                questions: questionBankData
            }
        }));
    } catch (error) {
        console.error('Không thể tải ngân hàng câu hỏi:', error);
        renderQuestionBankError(error?.message || 'Không thể tải câu hỏi.');
    } finally {
        setQuestionBankLoading(false);
    }
}

function setQuestionBankLoading(isLoading) {
    questionBankLoading = isLoading;
    const list = document.getElementById('questionBankList');
    if (!list) return;

    if (isLoading) {
        list.innerHTML = '<div style="text-align:center; padding: 40px; color: #6c757d;"><i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 10px;"></i><p>Đang tải câu hỏi...</p></div>';
    }
}

function renderQuestionBankError(message) {
    renderQuestionBankPlaceholder(message, 'fas fa-exclamation-circle', '#dc3545');
}

function renderQuestionBankPlaceholder(message, iconClass = 'fas fa-info-circle', color = '#6c757d', extraHtml = '') {
    const list = document.getElementById('questionBankList');
    if (!list) return;

    list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${color};">
            <i class="${iconClass}" style="font-size: 40px; margin-bottom: 15px;"></i>
            <p>${message}</p>
            ${extraHtml || ''}
        </div>
    `;
}

function renderQuestionBankList(questions) {
    const list = document.getElementById('questionBankList');
    if (!list) return;

    if (!Array.isArray(questions) || questions.length === 0) {
        renderQuestionBankPlaceholder('Chưa có câu hỏi nào trong ngân hàng. Hãy tạo câu hỏi mới trong Ngân hàng câu hỏi.', 'fas fa-inbox', '#6c757d', `
            <a href="/Teacher/QuestionBank" class="exam-btn exam-btn-primary" style="margin-top: 20px; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fas fa-plus"></i> Tạo câu hỏi mới
            </a>
        `);
        return;
    }

    const html = questions.map(question => {
        const isSelected = selectedBankQuestionIds.has(question.id?.toString());
        const difficultyClass = question.difficulty || 'medium';
        const difficultyLabel = question.difficultyLabel || question.difficulty || 'Trung bình';
        const points = Number(question.points || 1);

        return `
            <div class="question-item ${isSelected ? 'selected' : ''}" data-difficulty="${difficultyClass}" data-id="${escapeHtml(question.id)}" data-points="${points}">
                <input type="checkbox" class="question-checkbox" name="bankQuestions" value="${escapeHtml(question.id)}" ${isSelected ? 'checked' : ''} />
                <div class="question-content">
                    <div class="question-text">${escapeHtml(question.content)}</div>
                    <div class="question-meta">
                        <span class="question-badge ${difficultyClass}">${escapeHtml(difficultyLabel)}</span>
        	            <span><i class="fas fa-book"></i> ${escapeHtml(question.subjectName || '')}</span>
                        <span><i class="fas fa-star"></i> ${points} điểm</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    list.innerHTML = html;
}

function handleQuestionBankCheckboxChange(event) {
    if (!event.target.classList.contains('question-checkbox')) {
        return;
    }

    const checkbox = event.target;
    const questionId = checkbox.value;
    if (!questionId) return;

    if (checkbox.checked) {
        selectedBankQuestionIds.add(questionId);
    } else {
        selectedBankQuestionIds.delete(questionId);
    }

    const item = checkbox.closest('.question-item');
    if (item) {
        item.classList.toggle('selected', checkbox.checked);
    }

    updateQuestionCounts();
}

function handleQuestionBankItemClick(event) {
    const item = event.target.closest('.question-item');
    if (!item) return;

    const checkbox = item.querySelector('.question-checkbox');
    if (!checkbox || event.target.classList.contains('question-checkbox')) {
        return;
    }

    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

// Update preview
function updatePreview() {
    // Basic information
    const examName = document.getElementById('examName').value;
    const subject = document.getElementById('subject');
    const subjectText = subject.options[subject.selectedIndex].text;
    const duration = document.getElementById('duration').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    document.getElementById('preview-examName').textContent = examName || '-';
    document.getElementById('preview-subject').textContent = subjectText || '-';
    document.getElementById('preview-duration').textContent = duration ? `${duration} phút` : '-';
    document.getElementById('preview-startDate').textContent = formatDateTime(startDate);
    document.getElementById('preview-endDate').textContent = formatDateTime(endDate);
    
    // Questions
    const manualCount = document.querySelectorAll('.manual-question-card').length;
    const bankCount = document.querySelectorAll('.question-checkbox:checked').length;
    const totalQuestions = manualCount + bankCount;
    const totalPoints = document.getElementById('totalPoints').textContent;
    
    document.getElementById('preview-questionCount').textContent = `${totalQuestions} (${manualCount} thủ công + ${bankCount} từ ngân hàng)`;
    document.getElementById('preview-totalPoints').textContent = totalPoints;
    
    // Configuration
    const shuffleQuestions = document.getElementById('shuffleQuestions').checked;
    const showResults = document.getElementById('showResults').checked;
    const assignTo = document.getElementById('assignTo');
    const assignToText = Array.from(assignTo.selectedOptions).map(opt => opt.text).join(', ');
    
    document.getElementById('preview-shuffle').textContent = shuffleQuestions ? 'Có' : 'Không';
    document.getElementById('preview-showResults').textContent = showResults ? 'Có' : 'Không';
    document.getElementById('preview-assignTo').textContent = assignToText || '-';
}

async function saveDraft() {
    if (!confirm('Bạn muốn lưu đề thi này dưới dạng hoạt động?')) {
        return;
    }

    await handleExamSubmission('published', { validateSteps: false });
}

async function publishExam() {
    if (!confirm('Bạn có chắc chắn muốn xuất bản đề thi này? Đề thi sẽ hiển thị cho sinh viên theo thời gian đã cấu hình.')) {
        return;
    }

    await handleExamSubmission('published', { validateSteps: true });
}

async function handleExamSubmission(status, options = {}) {
    const { validateSteps = true } = options;

    if (validateSteps) {
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            alert('Vui lòng kiểm tra lại thông tin các bước trước đó');
            return;
        }
    }

    showLoading(true);

    try {
        const formData = collectFormData();
        formData.status = status;
        formData.examId = currentExamId;

        let createdManualQuestionIds = [];
        if (window.examApi && typeof window.examApi.persistManualQuestions === 'function') {
            createdManualQuestionIds = await window.examApi.persistManualQuestions(formData);
        }
        formData.createdManualQuestionIds = createdManualQuestionIds;
        formData.examId = currentExamId || formData.examId;

        const manualCount = createdManualQuestionIds.length || formData.manualQuestions.length;
        const bankCount = formData.bankQuestions.length;
        const totalQuestions = manualCount + bankCount;
        let totalPoints = 0;

        if (typeof window.examApi?.calculateTotalPoints === 'function') {
            totalPoints = window.examApi.calculateTotalPoints(formData);
        } else {
            totalPoints = manualCount + bankCount;
        }

        let submitResult = null;
        if (window.examApi && typeof window.examApi.submitExam === 'function') {
            submitResult = await window.examApi.submitExam(formData);
        } else {
            // Fallback simulation
            submitResult = await new Promise(resolve => setTimeout(() => resolve({ simulated: true }), 1500));
        }

        const examName = encodeURIComponent(formData.examName);
        const statusParam = encodeURIComponent(status);
        const totalPointsParam = encodeURIComponent(totalPoints);
        const totalQuestionsParam = encodeURIComponent(totalQuestions);
        const examIdParam = submitResult?.id || submitResult?._id || submitResult?.examId;

        let redirectUrl = `/Teacher/CreateExamSuccess?examName=${examName}&status=${statusParam}&questionCount=${totalQuestionsParam}&totalPoints=${totalPointsParam}`;
        if (examIdParam) {
            redirectUrl += `&examId=${encodeURIComponent(examIdParam)}`;
        }

        window.location.href = redirectUrl;
    } catch (error) {
        console.error('Error submitting exam:', error);
        alert(error?.message || 'Không thể tạo đề thi. Vui lòng thử lại.');
        showLoading(false);
    }
}

async function saveStepOneToAPI() {
    if (!window.examApi) {
        return true;
    }

    const formData = collectFormData();
    formData.status = 'draft';
    formData.examId = currentExamId;

    try {
        let response;
        if (currentExamId && typeof window.examApi.updateExamDraft === 'function') {
            response = await window.examApi.updateExamDraft(currentExamId, formData, { includeQuestions: false });
        } else if (typeof window.examApi.createExamDraft === 'function') {
            response = await window.examApi.createExamDraft(formData);
        }

        if (response && (response._id || response.id)) {
            currentExamId = response._id || response.id;
            if (window.examApi) {
                window.examApi.currentExamId = currentExamId;
            }
        }

        return true;
    } catch (error) {
        console.error('Không thể lưu thông tin bước 1:', error);
        alert(error?.message || 'Không thể lưu bước 1. Vui lòng thử lại.');
        return false;
    }
}

// Collect form data
function collectFormData() {
    // Collect manual questions
    const manualQuestions = [];
    document.querySelectorAll('.manual-question-card').forEach(card => {
        const questionData = {
            text: card.querySelector('.manual-question-text').value,
            type: card.querySelector('.manual-question-type').value,
            difficulty: card.querySelector('.manual-question-difficulty').value,
            points: card.querySelector('.manual-question-points').value,
            answers: [],
            questionId: card.dataset.questionId || null,
            __cardIndex: card.dataset.questionIndex
        };
        
        // Collect answers if not essay
        if (questionData.type !== 'essay') {
            card.querySelectorAll('.answer-item').forEach(answerItem => {
                const answerText = answerItem.querySelector('.answer-text').value;
                const isCorrect = answerItem.querySelector('.answer-radio').checked;
                
                questionData.answers.push({
                    text: answerText,
                    isCorrect: isCorrect
                });
            });
        }
        
        manualQuestions.push(questionData);
    });

    const bankQuestionDetails = Array.from(document.querySelectorAll('.question-checkbox:checked')).map(cb => {
        const item = cb.closest('.question-item');
        return {
            id: cb.value,
            points: parseFloat(item?.dataset.points || '1'),
            difficulty: item?.dataset.difficulty || 'medium'
        };
    });

    const formData = {
        examName: document.getElementById('examName').value,
        subject: document.getElementById('subject').value,
        description: document.getElementById('description').value,
        duration: document.getElementById('duration').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        manualQuestions: manualQuestions,
        bankQuestionDetails,
        bankQuestions: bankQuestionDetails.map(q => q.id),
        shuffleQuestions: document.getElementById('shuffleQuestions').checked,
        shuffleAnswers: document.getElementById('shuffleAnswers').checked,
        showResults: document.getElementById('showResults').checked,
        allowReview: document.getElementById('allowReview').checked,
        assignTo: Array.from(document.getElementById('assignTo').selectedOptions).map(opt => opt.value).filter(Boolean),
        passingScore: document.getElementById('passingScore').value,
        examId: currentExamId
    };
    
    return formData;
}

// Show/hide loading spinner
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const formContainer = document.querySelector('.exam-form-container');
    
    if (show) {
        loadingSpinner.classList.add('active');
        formContainer.style.display = 'none';
    } else {
        loadingSpinner.classList.remove('active');
        formContainer.style.display = 'block';
    }
}

// Helper: Format datetime for input
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper: Format datetime for display
function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// ============ TAB SYSTEM ============
function setupTabSystem() {
    const tabs = document.querySelectorAll('.question-tab');
    const panels = document.querySelectorAll('.question-tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetPanel = this.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding panel
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.dataset.panel === targetPanel);
            });

            if (targetPanel === 'bank') {
                renderQuestionBankList(questionBankData);
                filterQuestions();
                updateQuestionCounts();
            }
        });
    });
}

// ============ MANUAL QUESTIONS ============
function setupManualQuestions() {
    const addBtn = document.getElementById('addManualQuestionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addManualQuestion);
    }
}

function addManualQuestion() {
    manualQuestionIndex++;
    const template = document.getElementById('manualQuestionTemplate');
    const clone = template.content.cloneNode(true);
    
    // Set question number
    const card = clone.querySelector('.manual-question-card');
    card.dataset.questionIndex = manualQuestionIndex;
    clone.querySelector('.question-number').textContent = manualQuestionIndex;
    
    // Setup delete button
    const deleteBtn = clone.querySelector('.delete-question-btn');
    deleteBtn.addEventListener('click', function() {
        deleteManualQuestion(this.closest('.manual-question-card'));
    });
    
    // Setup question type change
    const typeSelect = clone.querySelector('.manual-question-type');
    typeSelect.addEventListener('change', function() {
        handleQuestionTypeChange(this);
        updateQuestionCounts();
    });
    
    // Setup add answer button
    const addAnswerBtn = clone.querySelector('.add-answer-btn');
    addAnswerBtn.addEventListener('click', function() {
        addAnswer(this.closest('.manual-question-card'));
    });
    
    // Setup points input change
    const pointsInput = clone.querySelector('.manual-question-points');
    pointsInput.addEventListener('change', updateQuestionCounts);

    const difficultySelect = clone.querySelector('.manual-question-difficulty');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', updateQuestionCounts);
    }

    const questionTextInput = clone.querySelector('.manual-question-text');
    if (questionTextInput) {
        questionTextInput.addEventListener('input', updateQuestionCounts);
    }
    
    // Add 4 default answers for multiple choice
    const answersList = clone.querySelector('.answers-list');
    for (let i = 0; i < 4; i++) {
        const answerClone = createAnswerElement(manualQuestionIndex);
        answersList.appendChild(answerClone);
    }
    
    // Append to list
    document.getElementById('manualQuestionsList').appendChild(clone);
    
    // Update counts
    updateQuestionCounts();
    
    // Scroll to new question
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function createAnswerElement(questionIndex) {
    const template = document.getElementById('answerTemplate');
    const clone = template.content.cloneNode(true);
    
    // Update radio button name to be unique per question
    const radio = clone.querySelector('.answer-radio');
    radio.name = `correct-answer-${questionIndex}`;
    
    // Setup delete button
    const deleteBtn = clone.querySelector('.delete-answer-btn');
    deleteBtn.addEventListener('click', function() {
        this.closest('.answer-item').remove();
    });
    
    return clone;
}

function addAnswer(questionCard) {
    const questionIndex = questionCard.dataset.questionIndex;
    const answersList = questionCard.querySelector('.answers-list');
    const answerElement = createAnswerElement(questionIndex);
    answersList.appendChild(answerElement);
}

function deleteManualQuestion(questionCard) {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
        return;
    }
    
    questionCard.remove();
    updateQuestionCounts();
    renumberQuestions();
}

function renumberQuestions() {
    const questions = document.querySelectorAll('.manual-question-card');
    questions.forEach((question, index) => {
        question.querySelector('.question-number').textContent = index + 1;
    });
}

function handleQuestionTypeChange(select) {
    const card = select.closest('.manual-question-card');
    const answersSection = card.querySelector('.answers-section');
    const type = select.value;
    
    // Show/hide answers section based on question type
    if (type === 'essay') {
        answersSection.style.display = 'none';
    } else if (type === 'true-false') {
        // Clear existing answers and add True/False
        const answersList = answersSection.querySelector('.answers-list');
        answersList.innerHTML = '';
        
        const questionIndex = card.dataset.questionIndex;
        
        // Add True answer
        const trueAnswer = createAnswerElement(questionIndex);
        trueAnswer.querySelector('.answer-text').value = 'Đúng';
        trueAnswer.querySelector('.answer-text').readOnly = true;
        trueAnswer.querySelector('.delete-answer-btn').style.display = 'none';
        answersList.appendChild(trueAnswer);
        
        // Add False answer
        const falseAnswer = createAnswerElement(questionIndex);
        falseAnswer.querySelector('.answer-text').value = 'Sai';
        falseAnswer.querySelector('.answer-text').readOnly = true;
        falseAnswer.querySelector('.delete-answer-btn').style.display = 'none';
        answersList.appendChild(falseAnswer);
        
        answersSection.style.display = 'block';
        card.querySelector('.add-answer-btn').style.display = 'none';
    } else {
        answersSection.style.display = 'block';
        card.querySelector('.add-answer-btn').style.display = 'block';
    }
}

// Update question counts (both manual and bank)
function updateQuestionCounts() {
    // Count manual questions
    const manualCards = document.querySelectorAll('.manual-question-card');
    let manualCount = manualCards.length;
    let manualPoints = 0;
    
    manualCards.forEach(card => {
        const points = parseFloat(card.querySelector('.manual-question-points')?.value || 0);
        manualPoints += points;
    });
    
    // Count bank questions
    const bankCheckboxes = document.querySelectorAll('.question-checkbox:checked');
    let bankCount = bankCheckboxes.length;
    let bankPoints = 0;
    
    bankCheckboxes.forEach(checkbox => {
        const item = checkbox.closest('.question-item');
        const points = parseFloat(item?.dataset.points || 0);
        bankPoints += points;
    });
 
    // Update UI
    document.getElementById('manualCount').textContent = manualCount;
    document.getElementById('bankCount').textContent = bankCount;
    document.getElementById('totalPoints').textContent = manualPoints + bankPoints;

    renderSelectedQuestionsSummary({ manualCards, bankCheckboxes });
}

// Update old function name
function updateSelectedQuestions() {
    updateQuestionCounts();
}

function renderSelectedQuestionsSummary({ manualCards, bankCheckboxes }) {
    const container = document.getElementById('selectedQuestionsList');
    if (!container) return;

    const manualItems = Array.from(manualCards || []).map((card, index) => {
        const titleInput = card.querySelector('.manual-question-text');
        const title = titleInput ? titleInput.value.trim() : '';
        const displayTitle = title || `Câu hỏi thủ công ${index + 1}`;
        const points = parseFloat(card.querySelector('.manual-question-points')?.value || 0) || 0;
        const difficulty = (card.querySelector('.manual-question-difficulty')?.value || 'medium').toLowerCase();
        return {
            type: 'manual',
            title: displayTitle,
            points,
            difficulty
        };
    });

    const bankItems = Array.from(bankCheckboxes || []).map(checkbox => {
        const questionId = checkbox.value;
        const question = questionBankData.find(q => q.id?.toString() === questionId?.toString());
        if (!question) {
            return {
                type: 'bank',
                title: `Câu hỏi ngân hàng ${questionId}`,
                points: parseFloat(checkbox.closest('.question-item')?.dataset.points || 0) || 0,
                difficulty: checkbox.closest('.question-item')?.dataset.difficulty || 'medium'
            };
        }

        return {
            type: 'bank',
            title: question.content || `Câu hỏi ngân hàng ${questionId}`,
            points: Number(question.points || 0) || 0,
            difficulty: (question.difficulty || 'medium').toLowerCase()
        };
    });

    const items = [...manualItems, ...bankItems];

    if (!items.length) {
        container.innerHTML = '<div class="selected-questions-empty" style="color: #6c757d; font-style: italic;">Chưa có câu hỏi nào được chọn.</div>';
        return;
    }

    const difficultyLabel = {
        easy: 'Dễ',
        medium: 'Trung bình',
        hard: 'Khó'
    };

    const html = items.map((item, index) => {
        const badgeClass = item.difficulty || 'medium';
        const badgeLabel = difficultyLabel[item.difficulty] || item.difficulty || 'Trung bình';
        const typeLabel = item.type === 'manual' ? 'Thủ công' : 'Ngân hàng';

        return `
            <div class="selected-question-item" style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
                <div style="min-width: 28px; height: 28px; border-radius: 8px; background: #e9f2ff; color: #1a73e8; font-weight: 600; display: flex; align-items: center; justify-content: center;">${index + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #212529;">${escapeHtml(item.title)}</div>
                    <div style="display: flex; gap: 12px; color: #6c757d; font-size: 13px; margin-top: 4px;">
                        <span><i class="fas fa-layer-group"></i> ${typeLabel}</span>
                        <span><i class="fas fa-star"></i> ${item.points || 0} điểm</span>
                        <span class="question-badge ${badgeClass}" style="font-size: 12px;">${badgeLabel}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}
