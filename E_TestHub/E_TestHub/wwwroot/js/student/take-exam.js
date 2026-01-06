const TAKE_EXAM_API_BASE_URL = "http://localhost:3000/api";
const EXAM_RESULTS_API_ENDPOINT = `${TAKE_EXAM_API_BASE_URL}/examresults`;
const OPTION_KEY_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const takeExamState = {
  exam: null,
  examId: null,
  token: null,
  student: null,
  studentId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  timeLeft: 0,
  totalDurationSeconds: 0,
  timerInterval: null,
  startedAt: null,
  isSubmitting: false,
};


document.addEventListener("DOMContentLoaded", () => {
  initializeTakeExamPage();
});

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Không thể đọc thông tin người dùng:", error);
    return null;
  }
}

function getCurrentStudentId() {
  const user = getStoredUser();
  const candidate =
    user?.id ||
    user?._id ||
    user?.userId ||
    user?.studentId ||
    user?.student?.id ||
    null;

  const normalized = normalizeId(candidate);
  if (!normalized) {
    throw new Error("Không tìm thấy thông tin sinh viên. Vui lòng đăng nhập lại.");
  }

  return { id: normalized, user };
}

function getOptionKey(index) {
  if (index < OPTION_KEY_SEQUENCE.length) {
    return OPTION_KEY_SEQUENCE[index];
  }
  const quotient = Math.floor(index / OPTION_KEY_SEQUENCE.length);
  const remainder = index % OPTION_KEY_SEQUENCE.length;
  const prefix = getOptionKey(quotient - 1);
  return `${prefix}${OPTION_KEY_SEQUENCE[remainder]}`;
}

function normalizeCandidateValue(value) {
  if (value === undefined || value === null) return null;
  return value.toString().trim().toLowerCase();
}

async function initializeTakeExamPage() {
  const container = document.getElementById("takeExamContainer");
  if (!container) return;

  const examId = container.getAttribute("data-exam-id");
  if (!examId) {
    renderTakeExamError("Không tìm thấy mã bài thi. Vui lòng quay lại danh sách.");
    return;
  }

  setTakeExamLoadingState();

  try {
    const token = getTakeExamToken();
    const { id: studentId, user } = getCurrentStudentId();
    const exam = await fetchTakeExamDetails(examId, token);
    const questions = await fetchTakeExamQuestions(examId, token, exam);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Đề thi chưa có câu hỏi nào. Vui lòng liên hệ giáo viên.");
    }

    takeExamState.examId = normalizeId(exam?._id || exam?.id || examId);
    takeExamState.exam = exam;
    takeExamState.token = token;
    takeExamState.studentId = studentId;
    takeExamState.student = user;
    takeExamState.questions = questions;
    takeExamState.currentIndex = 0;
    takeExamState.answers = {};
    takeExamState.timeLeft = computeInitialTimeLeft(exam);
    takeExamState.totalDurationSeconds = takeExamState.timeLeft;
    takeExamState.startedAt = new Date();

    renderTakeExamInfo(exam, questions.length);
    renderQuestionNavigation(questions.length);
    goToQuestion(0);
    enableSubmitButton(true);
    setupTakeExamEventHandlers();
    startExamTimer();
  } catch (error) {
    console.error("Không thể tải bài thi:", error);
    renderTakeExamError(error?.message || "Không thể tải bài thi. Vui lòng thử lại sau.");
  }
}

function getTakeExamToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
  }
  return token;
}

function setTakeExamLoadingState() {
  const questionContainer = document.getElementById("questionContainer");
  if (questionContainer) {
    questionContainer.innerHTML = `
      <div class="dashboard-loading">
          <i class="fas fa-spinner fa-spin"></i>
          Đang tải câu hỏi...
      </div>
    `;
  }
  const navGrid = document.getElementById("questionNavGrid");
  if (navGrid) {
    navGrid.innerHTML = `
      <div class="dashboard-loading-inline">
          <i class="fas fa-spinner fa-spin"></i> Đang tải câu hỏi...
      </div>
    `;
  }
  const title = document.getElementById("examTitle");
  if (title) {
    title.textContent = "Đang tải bài thi...";
  }
  updateQuestionCounters(0, 0);
}

function renderTakeExamError(message) {
  const questionContainer = document.getElementById("questionContainer");
  if (questionContainer) {
    questionContainer.innerHTML = `
      <div class="dashboard-error text-center">
          <i class="fas fa-exclamation-triangle"></i>
          ${escapeHtml(message)}
      </div>
    `;
  }
  const navGrid = document.getElementById("questionNavGrid");
  if (navGrid) {
    navGrid.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Không thể tải câu hỏi.
      </div>
    `;
  }
  enableSubmitButton(false);
  stopExamTimer();
}

async function fetchTakeExamDetails(examId, token) {
  const response = await fetch(`${TAKE_EXAM_API_BASE_URL}/exams/${examId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải thông tin bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (err) {
      // ignore parse error
    }
    throw new Error(message);
  }

  return await response.json();
}

async function fetchTakeExamQuestions(examId, token, exam) {
  const collected = [];

  if (Array.isArray(exam?.questions) && exam.questions.length > 0) {
    collected.push(
      ...exam.questions.map((question, index) => normalizeTakeExamQuestion(question, index))
    );
  }

  if (collected.every((q) => !q)) {
    try {
      const response = await fetch(
        `${TAKE_EXAM_API_BASE_URL}/exams/${examId}/questions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const payload = await response.json();
        const questionArray = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        collected.splice(
          0,
          collected.length,
          ...questionArray.map((q, index) => normalizeTakeExamQuestion(q, index))
        );
      }
    } catch (error) {
      console.warn("Không thể tải câu hỏi từ endpoint /questions:", error);
    }
  }

  let normalized = collected.filter(Boolean);

  if (!normalized.length && Array.isArray(exam?.questionIds) && exam.questionIds.length) {
    const fetchedQuestions = await Promise.all(
      exam.questionIds.map((questionId, index) =>
        fetchSingleQuestion(questionId, token).then((q) =>
          normalizeTakeExamQuestion(q, index)
        )
      )
    );
    normalized = fetchedQuestions.filter(Boolean);
  }

  return normalized;
}

async function fetchSingleQuestion(questionId, token) {
  const normalizedId = normalizeId(questionId);
  if (!normalizedId) return null;

  try {
    const response = await fetch(
      `${TAKE_EXAM_API_BASE_URL}/questions/${encodeURIComponent(normalizedId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (payload && typeof payload === "object" && payload.data) {
      return payload.data;
    }
    return payload;
  } catch (error) {
    console.warn(`Không thể tải câu hỏi ${questionId}:`, error);
    return null;
  }
}

function normalizeTakeExamQuestion(raw, index) {
  if (!raw) return null;

  const id = normalizeId(raw._id || raw.id || raw.questionId || raw.question);
  const key = id ? `question-${id}` : `question-${index + 1}`;
  const content =
    raw.content ||
    raw.text ||
    raw.question ||
    raw.prompt ||
    `Câu hỏi ${index + 1}`;

  let options = [];
  const sources = raw.answers || raw.options || raw.choices || null;

  if (Array.isArray(sources)) {
    options = sources.map((option, optionIndex) =>
      normalizeAnswerOption(option, optionIndex, getOptionKey(optionIndex))
    );
  } else {
    const fallbackOptions = [
      raw.answerA,
      raw.answerB,
      raw.answerC,
      raw.answerD,
    ].filter((value) => value !== undefined && value !== null);
    options = fallbackOptions.map((text, optionIndex) =>
      normalizeAnswerOption({ text }, optionIndex, getOptionKey(optionIndex))
    );
  }

  const filteredOptions = options.filter((option) => option && option.content);

  const correctCandidates = [];
  if (Array.isArray(raw.correctOptions)) {
    correctCandidates.push(...raw.correctOptions);
  }
  if (Array.isArray(raw.correctAnswers)) {
    correctCandidates.push(...raw.correctAnswers);
  }
  if (raw.correctOption !== undefined) correctCandidates.push(raw.correctOption);
  if (raw.correctAnswer !== undefined) correctCandidates.push(raw.correctAnswer);
  if (raw.correct !== undefined) correctCandidates.push(raw.correct);
  if (raw.answer !== undefined) correctCandidates.push(raw.answer);

  const normalizedCorrectValues = new Set(
    correctCandidates
      .map((candidate) => normalizeCandidateValue(candidate))
      .filter(Boolean)
  );

  filteredOptions.forEach((option) => {
    if (option.isCorrect) {
      normalizedCorrectValues.add(normalizeCandidateValue(option.value));
      return;
    }

    const optionMatchesCorrect = [
      option.value,
      option.id,
      option.label,
      option.content,
    ]
      .map((candidate) => normalizeCandidateValue(candidate))
      .some((normalized) => normalized && normalizedCorrectValues.has(normalized));

    if (optionMatchesCorrect) {
      option.isCorrect = true;
      normalizedCorrectValues.add(normalizeCandidateValue(option.value));
    }
  });

  const correctOptions = filteredOptions
    .filter((option) => option.isCorrect)
    .map((option) => option.value);

  const pointsValue = Number(
    raw.points ?? raw.point ?? raw.score ?? raw.maxScore ?? raw.weight
  );
  const points =
    Number.isFinite(pointsValue) && pointsValue > 0 ? pointsValue : undefined;

  return {
    id,
    key,
    number: index + 1,
    content,
    options: filteredOptions,
    correctOptions,
    points,
  };
}

function normalizeAnswerOption(raw, index, fallbackKey) {
  if (!raw) return null;

  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = raw.toString();
    const label = fallbackKey || getOptionKey(index);
    return {
      id: label || `${index}`,
      value: label || `${index}`,
      content: text,
      isCorrect: false,
      label,
    };
  }

  const id = normalizeId(raw._id || raw.id || raw.answerId || raw.optionId);
  const label = raw.label || raw.key || raw.optionKey || fallbackKey || getOptionKey(index);
  const content = raw.content || raw.text || raw.answer || raw.title || raw.value || label;
  let value = raw.value !== undefined && raw.value !== null ? raw.value : id || label || index;

  if (!content) return null;

  return {
    id: id || label || `${index}`,
    value: value.toString(),
    content,
    isCorrect: !!raw.isCorrect,
    label,
  };
}

function renderTakeExamInfo(exam, totalQuestions) {
  const title = document.getElementById("examTitle");
  if (title) {
    title.textContent = exam.title || exam.name || "Bài thi không tên";
  }

  updateQuestionCounters(0, totalQuestions);
  updateCompletedCount();

  const durationSeconds = computeInitialTimeLeft(exam);
  takeExamState.timeLeft = durationSeconds;
  takeExamState.totalDurationSeconds = durationSeconds;
  if (!takeExamState.startedAt) {
    takeExamState.startedAt = new Date();
  }
  updateTimerDisplay(durationSeconds);
}

function renderQuestionNavigation(totalQuestions) {
  const navGrid = document.getElementById("questionNavGrid");
  if (!navGrid) return;

  if (!totalQuestions || totalQuestions <= 0) {
    navGrid.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Chưa có câu hỏi nào.
      </div>
    `;
    return;
  }

  navGrid.innerHTML = Array.from({ length: totalQuestions })
    .map(
      (_, index) => `
        <div class="question-number" data-question-index="${index}">
            ${index + 1}
        </div>
      `
    )
    .join("");
}

function renderQuestion(index) {
  const question = takeExamState.questions[index];
  const container = document.getElementById("questionContainer");
  if (!question || !container) return;

  const selectedValue = takeExamState.answers[question.key];

  const optionsHtml = question.options.length
    ? question.options
        .map((option, optionIndex) => {
          const inputId = `${question.key}-option-${optionIndex}`;
          const isChecked = selectedValue !== undefined && selectedValue === option.value;
          return `
            <li class="answer-option">
                <label for="${escapeHtml(inputId)}">
                    <input
                        type="radio"
                        id="${escapeHtml(inputId)}"
                        name="${escapeHtml(question.key)}"
                        value="${escapeHtml(option.value)}"
                        ${isChecked ? "checked" : ""}
                    >
                    <span class="answer-text">${escapeHtml(option.content)}</span>
                </label>
            </li>
          `;
        })
        .join("")
    : `
        <li class="answer-option">
            <div class="dashboard-empty text-center">
                <i class="fas fa-info-circle"></i>
                Câu hỏi này chưa có đáp án.
            </div>
        </li>
      `;

  container.innerHTML = `
    <div class="question" data-question-key="${escapeHtml(question.key)}">
        <div class="question-text">${escapeHtml(question.content)}</div>
        <ul class="answer-options">
            ${optionsHtml}
        </ul>
    </div>
  `;
}

function updateQuestionUI() {
  const total = takeExamState.questions.length;
  const index = takeExamState.currentIndex;

  updateQuestionCounters(index, total);
  highlightNavigationItem(index);
  updateNavigationButtons(index, total);
  updateCompletedCount();
}

function updateQuestionCounters(currentIndex, total) {
  const currentNumberElement = document.getElementById("currentQuestionNumber");
  if (currentNumberElement) {
    currentNumberElement.textContent = total ? currentIndex + 1 : 0;
  }

  const footerCurrent = document.getElementById("currentQuestion");
  if (footerCurrent) {
    footerCurrent.textContent = total ? currentIndex + 1 : 0;
  }

  const footerTotal = document.getElementById("totalQuestions");
  if (footerTotal) {
    footerTotal.textContent = total || 0;
  }

  const navTotal = document.getElementById("navTotalQuestions");
  if (navTotal) {
    navTotal.textContent = total || 0;
  }
}

function highlightNavigationItem(index) {
  const navGrid = document.getElementById("questionNavGrid");
  if (!navGrid) return;

  const items = navGrid.querySelectorAll(".question-number");
  items.forEach((item, itemIndex) => {
    item.classList.toggle("current", itemIndex === index);
  });
}

function updateNavigationButtons(index, total) {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.disabled = index <= 0;
  }

  if (nextBtn) {
    nextBtn.disabled = total === 0 || index >= total - 1;
  }
}

function setupTakeExamEventHandlers() {
  const navGrid = document.getElementById("questionNavGrid");
  if (navGrid) {
    navGrid.addEventListener("click", (event) => {
      const target = event.target.closest(".question-number");
      if (!target) return;
      const index = Number(target.getAttribute("data-question-index"));
      if (Number.isInteger(index)) {
        goToQuestion(index);
      }
    });
  }

  const questionContainer = document.getElementById("questionContainer");
  if (questionContainer) {
    questionContainer.addEventListener("change", (event) => {
      if (event.target && event.target.matches('input[type="radio"]')) {
        handleAnswerSelection(event.target.name, event.target.value);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      previousQuestion();
    } else if (event.key === "ArrowRight") {
      nextQuestion();
    }
  });

  document.addEventListener("change", () => {
    updateCompletedCount();
  });

  window.addEventListener("beforeunload", handleBeforeUnload);
}

function handleAnswerSelection(questionKey, value) {
  if (!questionKey) return;
  takeExamState.answers[questionKey] = value;
  updateCompletedCount();
}

function updateCompletedCount() {
  const completed = Object.keys(takeExamState.answers).filter((key) => {
    return takeExamState.answers[key] !== undefined && takeExamState.answers[key] !== null;
  }).length;

  const completedElement = document.getElementById("completedCount");
  if (completedElement) {
    completedElement.textContent = completed;
  }

  const navGrid = document.getElementById("questionNavGrid");
  if (navGrid) {
    const items = navGrid.querySelectorAll(".question-number");
    items.forEach((item, index) => {
      const question = takeExamState.questions[index];
      if (!question) return;
      const answered = takeExamState.answers[question.key] !== undefined;
      item.classList.toggle("answered", answered);
    });
  }
}

function goToQuestion(index) {
  if (
    !Array.isArray(takeExamState.questions) ||
    index < 0 ||
    index >= takeExamState.questions.length
  ) {
    return;
  }

  takeExamState.currentIndex = index;
  renderQuestion(index);
  updateQuestionUI();
}

function nextQuestion() {
  const nextIndex = takeExamState.currentIndex + 1;
  if (nextIndex < takeExamState.questions.length) {
    goToQuestion(nextIndex);
  }
}

function previousQuestion() {
  const prevIndex = takeExamState.currentIndex - 1;
  if (prevIndex >= 0) {
    goToQuestion(prevIndex);
  }
}

function enableSubmitButton(enabled) {
  const submitBtn = document.getElementById("submitExamButton");
  if (submitBtn) {
    submitBtn.disabled = !enabled;
  }
}

function evaluateExamSubmission() {
  const questions = Array.isArray(takeExamState.questions)
    ? takeExamState.questions
    : [];
  const totals = {
    totalQuestions: questions.length,
    correct: 0,
    incorrect: 0,
    skipped: 0,
  };

  let totalPoints = 0;
  let earnedPoints = 0;

  const questionResults = questions.map((question, index) => {
    const selected = takeExamState.answers[question.key];
    const hasSelected = selected !== undefined && selected !== null;
    const normalizedSelected = normalizeCandidateValue(selected);

    const correctValues = Array.isArray(question.correctOptions)
      ? question.correctOptions
          .map((value) => normalizeCandidateValue(value))
          .filter(Boolean)
      : [];

    const isCorrect =
      hasSelected && correctValues.length
        ? correctValues.includes(normalizedSelected)
        : false;

    if (!hasSelected) {
      totals.skipped += 1;
    } else if (isCorrect) {
      totals.correct += 1;
    } else {
      totals.incorrect += 1;
    }

    let questionMaxScore = Number(question.points);
    if (!Number.isFinite(questionMaxScore) || questionMaxScore <= 0) {
      questionMaxScore = 1;
    }

    totalPoints += questionMaxScore;
    const earned = isCorrect ? questionMaxScore : 0;
    earnedPoints += earned;

    return {
      questionNumber: question.number || index + 1,
      questionId: question.id || undefined,
      selectedOption: hasSelected ? selected : null,
      correctOption:
        Array.isArray(question.correctOptions) && question.correctOptions.length
          ? question.correctOptions[0]
          : null,
      isCorrect: Boolean(isCorrect),
      score: earned,
      maxScore: questionMaxScore,
    };
  });

  if (!Number.isFinite(totalPoints) || totalPoints <= 0) {
    totalPoints = totals.totalQuestions || 1;
    earnedPoints = totals.correct;
  }

  const accuracy =
    totals.totalQuestions > 0
      ? (totals.correct / totals.totalQuestions) * 100
      : 0;

  const score = {
    earned: Number(earnedPoints.toFixed(2)),
    total: Number(totalPoints.toFixed(2)),
    percentage:
      totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0,
  };

  return {
    totals,
    score,
    accuracy: Number(accuracy.toFixed(2)),
    questionResults,
  };
}

function buildExamResultPayload() {
  if (!takeExamState.studentId) {
    throw new Error("Không tìm thấy thông tin sinh viên để lưu kết quả.");
  }

  if (!takeExamState.examId) {
    throw new Error("Không xác định được mã bài thi.");
  }

  const evaluation = evaluateExamSubmission();
  const now = new Date();
  const startedAt = takeExamState.startedAt
    ? new Date(takeExamState.startedAt)
    : new Date(now.getTime());

  let elapsedSeconds = 0;
  if (takeExamState.totalDurationSeconds > 0) {
    elapsedSeconds = takeExamState.totalDurationSeconds - takeExamState.timeLeft;
  } else {
    elapsedSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    elapsedSeconds = 0;
  }

  const durationMinutes = Math.max(0, Math.round(elapsedSeconds / 60));

  const questionResults = evaluation.questionResults.map((result) => {
    const record = { ...result };
    if (!record.questionId) {
      delete record.questionId;
    }
    if (record.correctOption === null || record.correctOption === undefined) {
      delete record.correctOption;
    }
    if (record.selectedOption === undefined) {
      record.selectedOption = null;
    }
    return record;
  });

  return {
    studentId: takeExamState.studentId,
    examId: takeExamState.examId,
    attemptNumber: takeExamState.exam?.attemptNumber ?? 1,
    examDate: startedAt.toISOString(),
    submittedAt: now.toISOString(),
    durationMinutes,
    accuracy: evaluation.accuracy,
    score: evaluation.score,
    totals: evaluation.totals,
    questionResults,
  };
}

async function postExamResult(payload) {
  const endpoints = [
    EXAM_RESULTS_API_ENDPOINT,
    `${TAKE_EXAM_API_BASE_URL}/exam-results`,
  ];

  let lastError = new Error("Không thể tạo kết quả bài thi.");

  for (let i = 0; i < endpoints.length; i += 1) {
    const url = endpoints[i];
    if (!url) continue;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${takeExamState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseBody = null;
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText);
        } catch (err) {
          responseBody = responseText;
        }
      }

      if (!response.ok) {
        const message =
          (responseBody && responseBody.message) ||
          `Không thể lưu kết quả bài thi (mã lỗi ${response.status}).`;

        if (
          response.status === 404 &&
          i < endpoints.length - 1
        ) {
          lastError = new Error(message);
          continue;
        }

        throw new Error(message);
      }

      return responseBody;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i === endpoints.length - 1) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

async function submitExam(autoSubmitted = false) {
  if (!Array.isArray(takeExamState.questions) || !takeExamState.questions.length) {
    alert("Không có dữ liệu bài thi để nộp.");
    return;
  }

  if (takeExamState.isSubmitting) {
    return;
  }

  if (
    !autoSubmitted &&
    !confirm(
      "Bạn có chắc chắn muốn nộp bài? Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời."
    )
  ) {
    return;
  }

  try {
    takeExamState.isSubmitting = true;
    enableSubmitButton(false);
    stopExamTimer();
    window.removeEventListener("beforeunload", handleBeforeUnload);

    const payload = buildExamResultPayload();
    const response = await postExamResult(payload);

    if (!autoSubmitted) {
      alert("Bài thi đã được nộp thành công!");
    }

    const query = new URLSearchParams();
    if (takeExamState.examId) {
      query.set("examId", takeExamState.examId);
    }
    if (response && typeof response === "object" && (response._id || response.id)) {
      query.set("resultId", normalizeId(response._id || response.id));
    }

    const redirectUrl = `/Student/ViewResults${
      query.toString() ? `?${query.toString()}` : ""
    }`;

    window.location.href = redirectUrl;
  } catch (error) {
    console.error("Không thể nộp bài thi:", error);
    alert(error?.message || "Không thể nộp bài thi. Vui lòng thử lại.");
    enableSubmitButton(true);
    if (takeExamState.timeLeft > 0 && !takeExamState.timerInterval) {
      startExamTimer();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
  } finally {
    takeExamState.isSubmitting = false;
  }
}

function computeInitialTimeLeft(exam) {
  const duration = Number(exam?.duration || exam?.timeLimit || 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(duration * 60));
}

function startExamTimer() {
  stopExamTimer();

  if (!Number.isFinite(takeExamState.timeLeft) || takeExamState.timeLeft <= 0) {
    updateTimerDisplay(0);
    return;
  }

  takeExamState.timerInterval = setInterval(() => {
    takeExamState.timeLeft -= 1;
    if (takeExamState.timeLeft <= 0) {
      stopExamTimer();
      updateTimerDisplay(0);
      alert("Hết thời gian làm bài. Hệ thống sẽ tự động nộp bài.");
      submitExam(true);
      return;
    }
    updateTimerDisplay(takeExamState.timeLeft);
  }, 1000);
}

function stopExamTimer() {
  if (takeExamState.timerInterval) {
    clearInterval(takeExamState.timerInterval);
    takeExamState.timerInterval = null;
  }
}

function updateTimerDisplay(seconds) {
  const timerElement = document.getElementById("timeRemaining");
  if (!timerElement) return;

  if (!Number.isFinite(seconds) || seconds < 0) {
    timerElement.textContent = "--:--:--";
    return;
  }

  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  timerElement.textContent = `${hours}:${minutes}:${secs}`;
}

function toggleQuestionNav() {
  const sidebar = document.getElementById("questionNavSidebar");
  if (!sidebar) return;

  sidebar.classList.toggle("active");

  let overlay = document.getElementById("questionNavOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "questionNavOverlay";
    overlay.className = "question-nav-overlay";
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        toggleQuestionNav();
      }
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("active"));
  } else {
    overlay.classList.toggle("active");
    if (!overlay.classList.contains("active")) {
      setTimeout(() => {
        if (!overlay.classList.contains("active") && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
  }

  if (window.innerWidth <= 768) {
    document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
  }
}

function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue =
    "Bạn có chắc chắn muốn rời khỏi trang? Bài thi của bạn có thể không được lưu.";
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "object") {
    const nested = value.id || value._id || value.value;
    if (nested) return nested.toString();
    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str && str !== "[object Object]") return str;
    }
  }
  return null;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Expose navigation functions to global scope for inline handlers
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.submitExam = submitExam;
window.toggleQuestionNav = toggleQuestionNav;

