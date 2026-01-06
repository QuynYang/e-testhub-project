// Teacher Exam Details API Integration
const EXAM_DETAILS_API_BASE_URL = 'http://localhost:3000/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Normalize ID
function normalizeId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
        return value._id || value.id || value.value || value.toString?.() || null;
    }
    return null;
}

// Get examId from query string
function getExamIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('examId') || params.get('id') || null;
}

// Fetch exam details from API
async function fetchExamDetails(examId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const normalizedId = normalizeId(examId);
        if (!normalizedId) {
            throw new Error('ID đề thi không hợp lệ.');
        }

        console.log('📥 Fetching exam details for ID:', normalizedId);

        const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/exams/${normalizedId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tải thông tin đề thi.');
        }

        const examData = await response.json();
        console.log('✅ Exam data fetched:', examData);
        return examData;
    } catch (error) {
        console.error('Error fetching exam details:', error);
        throw error;
    }
}

// Fetch exam questions
async function fetchExamQuestions(examId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const normalizedId = normalizeId(examId);
        if (!normalizedId) return [];

        console.log('📥 Fetching exam questions for ID:', normalizedId);

        // Try to get questions from exam details first
        const examData = await fetchExamDetails(normalizedId);
        
        // Get question IDs from exam
        const questionIds = examData.questionIds || examData.questions || [];
        
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            console.log('ℹ️ No questions found in exam data');
            return [];
        }

        // Fetch each question
        const questions = [];
        for (const questionId of questionIds) {
            try {
                const qId = normalizeId(questionId);
                if (!qId) continue;

                const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/questions/${qId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const questionData = await response.json();
                    questions.push(questionData);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch question ${questionId}:`, error);
            }
        }

        console.log(`✅ Fetched ${questions.length} questions`);
        return questions;
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        return [];
    }
}

// Fetch class info by ID
async function fetchClassInfo(classId) {
    try {
        const token = getToken();
        if (!token) return null;

        const normalizedId = normalizeId(classId);
        if (!normalizedId) return null;

        const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/classes/${normalizedId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.warn('Error fetching class info:', error);
        return null;
    }
}

// Fetch course info by ID
async function fetchCourseInfo(courseId) {
    try {
        const token = getToken();
        if (!token) return null;

        const normalizedId = normalizeId(courseId);
        if (!normalizedId) return null;

        const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/courses/${normalizedId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.warn('Error fetching course info:', error);
        return null;
    }
}

// Format date to dd/MM/yyyy
function formatDate(dateString) {
    if (!dateString) return 'Chưa có';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Chưa có';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        return 'Chưa có';
    }
}

// Format date with day name
function formatDateWithDay(dateString) {
    if (!dateString) return 'Chưa có';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Chưa có';
        
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const dayName = days[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${dayName}, ${day}/${month}/${year}`;
    } catch (error) {
        return 'Chưa có';
    }
}

// Fetch exam results for a specific exam
async function fetchExamResults(examId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const normalizedId = normalizeId(examId);
        if (!normalizedId) return [];

        console.log('📥 Fetching exam results for exam ID:', normalizedId);

        const params = new URLSearchParams();
        params.set('examId', normalizedId);

        const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/exam-results?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ Could not fetch exam results:', response.status);
            return [];
        }

        const results = await response.json();
        console.log(`✅ Fetched ${Array.isArray(results) ? results.length : 0} exam results`);
        
        // Handle different response formats
        if (Array.isArray(results)) {
            return results;
        } else if (results.data && Array.isArray(results.data)) {
            return results.data;
        } else if (results.results && Array.isArray(results.results)) {
            return results.results;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching exam results:', error);
        return [];
    }
}

// Fetch student info by ID
async function fetchStudentInfo(studentId) {
    try {
        const token = getToken();
        if (!token) return null;

        const normalizedId = normalizeId(studentId);
        if (!normalizedId) return null;

        const response = await fetch(`${EXAM_DETAILS_API_BASE_URL}/users/${normalizedId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.warn('Error fetching student info:', error);
        return null;
    }
}

// Calculate normalized score from exam result
function calculateNormalizedScore(result) {
    if (!result) return null;

    // Try accuracy/percentage first
    const accuracy = Number(result.accuracy ?? result.percentage ?? result.percent);
    if (Number.isFinite(accuracy) && accuracy >= 0) {
        return Math.min(Math.max(accuracy / 10, 0), 10);
    }

    // Try score object
    if (result.score) {
        const earned = Number(result.score.earned ?? result.score.value ?? result.score.score ?? 0);
        const total = Number(result.score.total ?? result.score.max ?? result.score.totalPoints ?? 0);
        if (Number.isFinite(earned) && Number.isFinite(total) && total > 0) {
            return Math.min(Math.max((earned / total) * 10, 0), 10);
        }
    }

    // Try totals object
    if (result.totals) {
        const correct = Number(result.totals.correct ?? 0);
        const totalQuestions = Number(result.totals.totalQuestions ?? result.totals.total ?? 0);
        if (Number.isFinite(correct) && Number.isFinite(totalQuestions) && totalQuestions > 0) {
            return Math.min(Math.max((correct / totalQuestions) * 10, 0), 10);
        }
    }

    return null;
}

// Get grade classification from score
function getGradeClassification(score) {
    if (!Number.isFinite(score)) return { label: 'N/A', class: 'grade-unknown' };
    
    if (score >= 9) return { label: 'Xuất sắc', class: 'grade-excellent' };
    if (score >= 8) return { label: 'Giỏi', class: 'grade-good' };
    if (score >= 6.5) return { label: 'Khá', class: 'grade-fair' };
    if (score >= 5) return { label: 'Trung bình', class: 'grade-average' };
    return { label: 'Yếu', class: 'grade-poor' };
}

// Render exam results table
async function renderExamResults(examId) {
    const container = document.getElementById('examResultsContainer');
    if (!container) {
        console.warn('⚠️ Exam results container not found');
        return;
    }

    try {
        container.innerHTML = '<div class="loading" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Đang tải kết quả thi...</div>';

        const results = await fetchExamResults(examId);
        
        if (!Array.isArray(results) || results.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Chưa có sinh viên nào làm bài thi này.</p>
                </div>
            `;
            return;
        }

        // Fetch student info for each result
        const resultsWithStudents = await Promise.all(
            results.map(async (result) => {
                const studentId = normalizeId(result.studentId || result.student?._id || result.student?.id);
                let studentInfo = null;
                
                if (studentId) {
                    studentInfo = await fetchStudentInfo(studentId);
                }

                const score = calculateNormalizedScore(result);
                const grade = getGradeClassification(score);

                return {
                    result,
                    studentInfo,
                    studentId,
                    score,
                    grade,
                    submittedAt: result.submittedAt || result.createdAt || result.completedAt
                };
            })
        );

        // Sort by score (descending)
        resultsWithStudents.sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA;
        });

        // Render table
        container.innerHTML = `
            <div class="table-responsive" style="margin-top: 20px;">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>MSSV</th>
                            <th>Họ và tên</th>
                            <th style="text-align: center;">Điểm số</th>
                            <th style="text-align: center;">Xếp loại</th>
                            <th style="text-align: center;">Thời gian nộp</th>
                            <th style="text-align: center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultsWithStudents.map((item, index) => {
                            const studentName = item.studentInfo?.fullName || 
                                              `${item.studentInfo?.firstName || ''} ${item.studentInfo?.lastName || ''}`.trim() ||
                                              item.studentInfo?.email ||
                                              item.studentId ||
                                              'Không xác định';
                            
                            const studentId = item.studentId || item.studentInfo?.studentId || item.studentInfo?.id || 'N/A';
                            const score = item.score !== null ? item.score.toFixed(1) : 'N/A';
                            const gradeInfo = item.grade;
                            const submittedDate = item.submittedAt ? formatDate(item.submittedAt) : 'N/A';
                            const resultId = normalizeId(item.result._id || item.result.id);

                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><strong>${escapeHtml(studentId)}</strong></td>
                                    <td>${escapeHtml(studentName)}</td>
                                    <td style="text-align: center;">
                                        <span style="font-weight: bold; font-size: 16px; color: ${item.score >= 5 ? '#28a745' : '#dc3545'};">
                                            ${score}
                                        </span>
                                    </td>
                                    <td style="text-align: center;">
                                        <span class="badge ${gradeInfo.class}" style="padding: 6px 12px;">
                                            ${gradeInfo.label}
                                        </span>
                                    </td>
                                    <td style="text-align: center;">${submittedDate}</td>
                                    <td style="text-align: center;">
                                        ${resultId ? `
                                            <button class="btn btn-sm btn-primary" onclick="viewStudentResult('${resultId}')" title="Xem chi tiết">
                                                <i class="fas fa-eye"></i> Xem
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong>Tổng số sinh viên đã làm bài:</strong> ${resultsWithStudents.length}
            </div>
        `;

        console.log(`✅ Rendered ${resultsWithStudents.length} exam results`);
    } catch (error) {
        console.error('Error rendering exam results:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Không thể tải kết quả thi: ${error.message || 'Lỗi không xác định'}</p>
            </div>
        `;
    }
}

// View student result details
function viewStudentResult(resultId) {
    // Navigate to student result view or show modal
    window.location.href = `/Student/ViewResults?resultId=${resultId}`;
}

// Initialize exam details page
async function initializeExamDetailsPage() {
    const examId = getExamIdFromQuery();
    console.log('🔍 ExamId from query:', examId);
    
    if (!examId) {
        showError('Không tìm thấy mã đề thi trong đường dẫn.');
        return;
    }

    try {
        // Show loading state
        setLoadingState(true);
        console.log('📥 Starting to fetch exam details...');

        // Fetch exam details and results in parallel
        const [examData, questions, examResults] = await Promise.all([
            fetchExamDetails(examId),
            fetchExamQuestions(examId),
            Promise.resolve() // We'll fetch results separately
        ]);
        
        // Fetch related data
        const [classInfo, courseInfo] = await Promise.all([
            examData.classIds && examData.classIds.length > 0 ? fetchClassInfo(examData.classIds[0]) : Promise.resolve(null),
            examData.courseId ? fetchCourseInfo(examData.courseId) : Promise.resolve(null)
        ]);

        console.log('✅ Related data fetched:', {
            questions: questions.length,
            classInfo: classInfo ? 'Yes' : 'No',
            courseInfo: courseInfo ? 'Yes' : 'No'
        });

        // Render all data
        console.log('🎨 Rendering data...');
        renderExamInfo(examData, classInfo, courseInfo);
        renderQuestionsList(questions);
        
        // Render exam results
        await renderExamResults(examId);

        console.log('✅ All data rendered successfully');
        // Hide loading state
        setLoadingState(false);
    } catch (error) {
        console.error('❌ Error initializing exam details:', error);
        console.error('❌ Error stack:', error.stack);
        showError(error.message || 'Không thể tải thông tin đề thi.');
        setLoadingState(false);
    }
}

// Set loading state
function setLoadingState(isLoading) {
    const examInfo = document.querySelector('.exam-info-grid');
    const questionsList = document.querySelector('.questions-list');

    if (isLoading) {
        if (examInfo) {
            examInfo.innerHTML = '<div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 20px;">Đang tải...</div>';
        }
        if (questionsList) {
            questionsList.innerHTML = '<div class="loading" style="text-align: center; padding: 20px;">Đang tải...</div>';
        }
    }
}

// Show error message
function showError(message) {
    const examInfo = document.querySelector('.exam-info-grid');
    if (examInfo) {
        examInfo.innerHTML = `<div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px; color: red;">${message}</div>`;
    }
    alert(message);
}

// Render exam information
function renderExamInfo(examData, classInfo, courseInfo) {
    console.log('🎨 Rendering exam info:', { examData, classInfo, courseInfo });

    // Basic info
    const examNameEl = document.querySelector('.exam-info-body .info-row:nth-child(1) .info-value');
    const subjectEl = document.querySelector('.exam-info-body .info-row:nth-child(2) .info-value');
    const classEl = document.querySelector('.exam-info-body .info-row:nth-child(3) .info-value');
    const durationEl = document.querySelector('.exam-info-body .info-row:nth-child(4) .info-value');

    if (examNameEl) {
        examNameEl.textContent = examData.title || examData.name || 'Đề thi không tên';
        console.log('✅ Exam name set');
    }

    if (subjectEl) {
        const subjectName = courseInfo?.courseName || courseInfo?.name || 
                           classInfo?.name || classInfo?.classCode || 
                           'Môn học không xác định';
        subjectEl.textContent = subjectName;
        console.log('✅ Subject set:', subjectName);
    }

    if (classEl) {
        const className = classInfo?.classCode || classInfo?.name || 
                         (examData.classIds && examData.classIds.length > 0 ? examData.classIds[0] : 'N/A');
        classEl.textContent = className;
        console.log('✅ Class set:', className);
    }

    if (durationEl) {
        const duration = examData.duration || 0;
        durationEl.textContent = `${duration} phút`;
        console.log('✅ Duration set:', duration);
    }

    // Statistics
    const totalQuestionsEl = document.querySelectorAll('.exam-info-body .info-row')[4]?.querySelector('.info-value');
    const totalPointsEl = document.querySelectorAll('.exam-info-body .info-row')[5]?.querySelector('.info-value');
    const statusEl = document.querySelectorAll('.exam-info-body .info-row')[6]?.querySelector('.info-value');
    const createdDateEl = document.querySelectorAll('.exam-info-body .info-row')[7]?.querySelector('.info-value');

    if (totalQuestionsEl) {
        const questionCount = examData.questionIds?.length || examData.questions?.length || 0;
        totalQuestionsEl.textContent = `${questionCount} câu`;
        console.log('✅ Total questions set:', questionCount);
    }

    if (totalPointsEl) {
        // Calculate total points from questions or use default
        const totalPoints = examData.totalPoints || examData.maxScore || 100;
        totalPointsEl.textContent = `${totalPoints} điểm`;
        console.log('✅ Total points set:', totalPoints);
    }

    if (statusEl) {
        const isPublished = examData.isPublished !== false;
        statusEl.innerHTML = isPublished 
            ? '<span class="status-badge published"><i class="fas fa-check-circle"></i> Đã xuất bản</span>'
            : '<span class="status-badge draft"><i class="fas fa-edit"></i> Nháp</span>';
        console.log('✅ Status set:', isPublished ? 'published' : 'draft');
    }

    if (createdDateEl) {
        const createdDate = formatDate(examData.createdAt || examData.createdDate);
        createdDateEl.textContent = createdDate;
        console.log('✅ Created date set:', createdDate);
    }

    // Description
    const descriptionEl = document.querySelector('.exam-description p');
    if (descriptionEl && examData.description) {
        descriptionEl.textContent = examData.description;
        const descriptionSection = document.querySelector('.exam-description');
        if (descriptionSection) {
            descriptionSection.style.display = 'block';
        }
    }

    // Scheduled date
    const scheduledDateEl = document.getElementById('scheduledDate') || document.querySelector('.schedule-item:first-child .schedule-details p');
    if (scheduledDateEl) {
        if (examData.openAt) {
            const scheduledDate = formatDateWithDay(examData.openAt);
            scheduledDateEl.textContent = scheduledDate;
            console.log('✅ Scheduled date set:', scheduledDate);
        } else {
            scheduledDateEl.textContent = 'Chưa có';
        }
    }

    // Exam duration in schedule
    const examDurationEl = document.getElementById('examDuration') || document.querySelector('.schedule-item:last-child .schedule-details p');
    if (examDurationEl) {
        const duration = examData.duration || 0;
        examDurationEl.textContent = `${duration} phút`;
        console.log('✅ Exam duration in schedule set:', duration);
    }
}

// Render questions list
function renderQuestionsList(questions) {
    const questionsList = document.querySelector('.questions-list');
    const questionCountEl = document.querySelector('.question-count');

    if (questionCountEl) {
        questionCountEl.textContent = `${questions.length} câu hỏi`;
    }

    if (!questionsList) {
        console.warn('⚠️ Questions list container not found');
        return;
    }

    if (questions.length === 0) {
        questionsList.innerHTML = '<div class="no-questions" style="text-align: center; padding: 20px;">Chưa có câu hỏi nào</div>';
        return;
    }

    questionsList.innerHTML = questions.map((question, index) => {
        const questionId = normalizeId(question._id || question.id);
        const questionContent = question.content || question.text || question.title || 'Câu hỏi không có nội dung';
        const questionType = question.type || 'multiple-choice';
        const questionPoints = question.points || question.score || 2.5;

        const typeIcon = questionType === 'multiple-choice' 
            ? '<i class="fas fa-list-ul"></i> Trắc nghiệm'
            : questionType === 'essay'
            ? '<i class="fas fa-pen"></i> Tự luận'
            : '<i class="fas fa-question"></i> Khác';

        return `
            <div class="question-item">
                <div class="question-header">
                    <div class="question-meta">
                        <span class="question-type">
                            ${typeIcon}
                        </span>
                        <span class="question-points">${questionPoints} điểm</span>
                    </div>
                    <div class="question-actions">
                        <button class="question-action-btn" title="Xem chi tiết" onclick="viewQuestion('${questionId}'); return false;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="question-action-btn" title="Chỉnh sửa" onclick="editQuestion('${questionId}'); return false;">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="question-content">
                    <p>${escapeHtml(questionContent)}</p>
                </div>
            </div>
        `;
    }).join('');

    console.log(`✅ Rendered ${questions.length} questions`);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// View question details
function viewQuestion(questionId) {
    alert('Xem chi tiết câu hỏi ID: ' + questionId + ' (Tính năng sẽ được triển khai sau)');
}

// Edit question
function editQuestion(questionId) {
    alert('Chỉnh sửa câu hỏi ID: ' + questionId + ' (Tính năng sẽ được triển khai sau)');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded, initializing exam details page...');
    
    // Wait a bit to ensure all elements are rendered
    setTimeout(() => {
        initializeExamDetailsPage();
        setupActionButtons();
    }, 100);
});

// Setup action buttons
function setupActionButtons() {
    const examId = getExamIdFromQuery();
    
    // Edit button
    const editBtn = document.getElementById('editExamBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (examId) {
                // Redirect to edit page or show edit modal
                alert('Chỉnh sửa đề thi ID: ' + examId + ' (Tính năng sẽ được triển khai sau)');
            } else {
                alert('Không tìm thấy mã đề thi');
            }
        });
    }

    // Copy button
    const copyBtn = document.getElementById('copyExamBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (examId) {
                // Copy exam functionality
                alert('Sao chép đề thi ID: ' + examId + ' (Tính năng sẽ được triển khai sau)');
            } else {
                alert('Không tìm thấy mã đề thi');
            }
        });
    }
}

