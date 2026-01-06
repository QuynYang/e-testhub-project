const VIEW_RESULTS_API_BASE_URL = "http://localhost:3000/api";
const VIEW_RESULTS_ENDPOINT = `${VIEW_RESULTS_API_BASE_URL}/exam-results`;
const OPTION_KEY_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const viewResultsState = {
  examId: null,
  resultId: null,
  token: null,
  studentId: null,
  student: null,
  exam: null,
  result: null,
  questions: [],
  combined: [],
  currentIndex: 0,
};

document.addEventListener("DOMContentLoaded", () => {
  initializeViewResultsPage();
});

async function initializeViewResultsPage() {
  const container = document.getElementById("viewResultsContainer");
  if (!container) return;

  viewResultsState.examId = normalizeId(container.getAttribute("data-exam-id"));
  viewResultsState.resultId = normalizeId(container.getAttribute("data-result-id"));

  try {
    const token = getToken();
    const { id: studentId, user } = getCurrentStudent();

    viewResultsState.token = token;
    viewResultsState.studentId = studentId;
    viewResultsState.student = user;

    let examResult = null;

    if (viewResultsState.resultId) {
      examResult = await fetchExamResultById(viewResultsState.resultId);
      if (examResult && !viewResultsState.examId) {
        viewResultsState.examId = normalizeId(examResult.examId);
      }
    }

    if (!examResult && viewResultsState.examId) {
      examResult = await fetchLatestExamResultForStudent(
        viewResultsState.examId,
        viewResultsState.studentId
      );
    }

    if (!examResult) {
      renderViewResultsError("Không tìm thấy kết quả bài thi phù hợp.");
      return;
    }

    viewResultsState.result = examResult;
    viewResultsState.examId = normalizeId(
      viewResultsState.examId || examResult.examId
    );

    if (!viewResultsState.examId) {
      throw new Error("Không xác định được mã bài thi.");
    }

    const exam = await fetchExamDetails(viewResultsState.examId);
    viewResultsState.exam = exam;

    const questions = await fetchExamQuestions(viewResultsState.examId, exam);
    viewResultsState.questions = questions;

    buildCombinedQuestionData();
    renderResultSummary();
    renderQuestionGrid();
    if (viewResultsState.combined.length > 0) {
      goToQuestion(0);
      setupViewResultsEventHandlers();
    } else {
      renderQuestionDetail();
      updateNavigationButtons();
    }
  } catch (error) {
    console.error("Không thể tải kết quả bài thi:", error);
    renderViewResultsError(error?.message || "Không thể tải kết quả bài thi.");
  }
}

function getToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
  }
  return token;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Không thể đọc thông tin người dùng:", error);
    return null;
  }
}

function getCurrentStudent() {
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

async function fetchExamResultById(resultId) {
  if (!resultId) return null;
  const response = await fetch(`${VIEW_RESULTS_ENDPOINT}/${resultId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${viewResultsState.token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    let message = "Không thể tải kết quả bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }

  return await response.json();
}

async function fetchLatestExamResultForStudent(examId, studentId) {
  const params = new URLSearchParams();
  if (examId) params.set("examId", examId);
  if (studentId) params.set("studentId", studentId);

  const response = await fetch(`${VIEW_RESULTS_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${viewResultsState.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải kết quả bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return payload[0];
}

async function fetchExamDetails(examId) {
  const response = await fetch(`${VIEW_RESULTS_API_BASE_URL}/exams/${examId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${viewResultsState.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải thông tin bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }

  return await response.json();
}

async function fetchExamQuestions(examId, exam) {
  const collected = [];

  if (Array.isArray(exam?.questions) && exam.questions.length > 0) {
    collected.push(
      ...exam.questions.map((question, index) =>
        normalizeQuestionForView(question, index)
      )
    );
  }

  if (collected.every((item) => !item)) {
    try {
      const response = await fetch(
        `${VIEW_RESULTS_API_BASE_URL}/exams/${examId}/questions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${viewResultsState.token}`,
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
          ...questionArray.map((q, index) => normalizeQuestionForView(q, index))
        );
      }
    } catch (error) {
      console.warn("Không thể tải câu hỏi từ endpoint /questions:", error);
    }
  }

  let normalized = collected.filter(Boolean);

  if (!normalized.length && Array.isArray(exam?.questionIds) && exam.questionIds.length) {
    const fetched = await Promise.all(
      exam.questionIds.map((questionId, index) =>
        fetchSingleQuestion(questionId).then((q) =>
          normalizeQuestionForView(q, index)
        )
      )
    );
    normalized = fetched.filter(Boolean);
  }

  return normalized;
}

async function fetchSingleQuestion(questionId) {
  const normalizedId = normalizeId(questionId);
  if (!normalizedId) return null;

  try {
    const response = await fetch(
      `${VIEW_RESULTS_API_BASE_URL}/questions/${encodeURIComponent(normalizedId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${viewResultsState.token}`,
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

function buildCombinedQuestionData() {
  const questions = Array.isArray(viewResultsState.questions)
    ? viewResultsState.questions
    : [];
  const results = Array.isArray(viewResultsState.result?.questionResults)
    ? [...viewResultsState.result.questionResults]
    : [];

  const byId = new Map();
  const byNumber = new Map();

  questions.forEach((question, index) => {
    if (question.id) {
      byId.set(normalizeId(question.id), question);
    }
    const number = question.number || index + 1;
    byNumber.set(number, question);
  });

  const sortedResults = results.sort(
    (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
  );

  viewResultsState.combined = sortedResults.map((record, index) => {
    const questionId = normalizeId(record.questionId);
    const questionNumber = record.questionNumber || index + 1;
    const question =
      (questionId && byId.get(questionId)) ||
      byNumber.get(questionNumber) || {
        id: questionId,
        number: questionNumber,
        content: "Không tìm thấy nội dung của câu hỏi.",
        options: [],
        correctOptions: [],
      };

    return {
      question,
      result: record,
      index,
    };
  });

  viewResultsState.currentIndex = 0;
}

function renderResultSummary() {
  const exam = viewResultsState.exam || {};
  const result = viewResultsState.result || {};

  const messageBox = document.getElementById("resultsMessage");
  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.classList.remove("error");
    messageBox.textContent = "";
  }

  const examTitle = document.getElementById("examTitle");
  if (examTitle) {
    examTitle.textContent =
      exam.title || exam.name || exam.examTitle || "Bài thi không tên";
  }

  const attemptBadge = document.getElementById("attemptBadge");
  if (attemptBadge) {
    const attemptNumber = result.attemptNumber || 1;
    attemptBadge.textContent = `Lần ${attemptNumber}`;
    attemptBadge.style.display = "inline-flex";
  }

  setTextContent("examDateValue", formatDateTime(result.examDate));
  setTextContent("submittedAtValue", formatDateTime(result.submittedAt));
  setTextContent(
    "durationValue",
    formatDurationMinutes(result.durationMinutes)
  );
  setTextContent("accuracyValue", formatPercentage(result.accuracy));

  const scoreEarned = Number(result?.score?.earned ?? 0);
  const scoreTotal = Number(result?.score?.total ?? 0);
  let scoreDisplay = "--/--";
  if (Number.isFinite(scoreEarned) && Number.isFinite(scoreTotal) && scoreTotal > 0) {
    scoreDisplay = `${trimNumber(scoreEarned)}/${trimNumber(scoreTotal)}`;
  }
  setTextContent("scoreValue", scoreDisplay);

  setTextContent(
    "totalQuestionsValue",
    result?.totals?.totalQuestions ?? viewResultsState.combined.length
  );
  setTextContent("correctCountValue", result?.totals?.correct ?? 0);
  setTextContent("incorrectCountValue", result?.totals?.incorrect ?? 0);
  setTextContent("skippedCountValue", result?.totals?.skipped ?? 0);
}

function renderQuestionGrid() {
  const grid = document.getElementById("questionGrid");
  if (!grid) return;

  const combined = viewResultsState.combined;

  if (!combined.length) {
    grid.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Không có dữ liệu câu hỏi để hiển thị.
      </div>
    `;
    return;
  }

  grid.innerHTML = combined
    .map((item, index) => {
      const result = item.result || {};
      const isSkipped =
        result.selectedOption === undefined || result.selectedOption === null;
      const isCorrect = result.isCorrect === true;
      const statusClass = isSkipped
        ? "skipped"
        : isCorrect
        ? "correct"
        : "incorrect";

      return `
        <div class="question-number ${statusClass}" data-question-index="${index}">
            ${item.question.number || index + 1}
        </div>
      `;
    })
    .join("");
}

function renderQuestionDetail() {
  const container = document.getElementById("questionContainer");
  const counter = document.getElementById("currentQuestionNum");
  const totalCounter = document.getElementById("totalQuestionsCount");
  if (!container) return;

  const combined = viewResultsState.combined;
  const item = combined[viewResultsState.currentIndex];

  if (totalCounter) {
    totalCounter.textContent = combined.length.toString();
  }
  if (counter) {
    counter.textContent = combined.length
      ? (viewResultsState.currentIndex + 1).toString()
      : "0";
  }

  if (!combined.length) {
    container.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Không có câu hỏi nào được chấm trong kết quả này.
      </div>
    `;
    return;
  }

  if (!item) {
    container.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Không thể hiển thị câu hỏi.
      </div>
    `;
    return;
  }

  const question = item.question || {};
  const result = item.result || {};
  const options = Array.isArray(question.options) ? question.options : [];

  const normalizedSelected = normalizeCandidateValue(result.selectedOption);
  const correctValues = Array.isArray(question.correctOptions)
    ? question.correctOptions
        .map((value) => normalizeCandidateValue(value))
        .filter(Boolean)
    : [];

  const optionsHtml = options.length
    ? options
        .map((option) => {
          const optionValue = normalizeCandidateValue(option.value);
          const isSelected =
            normalizedSelected !== null && normalizedSelected === optionValue;
          const isCorrect = correctValues.includes(optionValue);

          let optionClass = "answer-option";
          let statusBadge = "";

          if (isSelected && isCorrect) {
            optionClass += " user-selected correct";
            statusBadge =
              '<span class="answer-status correct">Đúng</span>';
          } else if (isSelected && !isCorrect) {
            optionClass += " user-selected incorrect";
            statusBadge =
              '<span class="answer-status incorrect">Bạn chọn</span>';
          } else if (!isSelected && isCorrect) {
            optionClass += " correct";
            statusBadge =
              '<span class="answer-status correct">Đáp án đúng</span>';
          }

          const label = option.label
            ? `<span class="answer-label">${escapeHtml(option.label)}.</span>`
            : "";

          return `
            <li class="${optionClass}">
                <div class="answer-option-content">
                    ${label}
                    <span class="answer-text">${escapeHtml(option.content)}</span>
                </div>
                ${statusBadge}
            </li>
          `;
        })
        .join("")
    : `
        <li class="answer-option">
            <div class="dashboard-empty text-center">
                <i class="fas fa-info-circle"></i>
                Không có đáp án nào cho câu hỏi này.
            </div>
        </li>
      `;

  const pointsDisplay =
    Number.isFinite(question.points) && question.points > 0
      ? `<span class="question-points">${trimNumber(question.points)} điểm</span>`
      : "";

  container.innerHTML = `
    <div class="question-block">
        <div class="question-header">
            <h3 class="question-title">Câu ${question.number || viewResultsState.currentIndex + 1}</h3>
            ${pointsDisplay}
        </div>
        <p class="question-text">${escapeHtml(question.content || "Không có nội dung câu hỏi.")}</p>
        <ul class="answer-options">
            ${optionsHtml}
        </ul>
    </div>
  `;
}

function setupViewResultsEventHandlers() {
  const grid = document.getElementById("questionGrid");
  if (grid) {
    grid.addEventListener("click", (event) => {
      const target = event.target.closest(".question-number");
      if (!target) return;
      const index = Number(target.getAttribute("data-question-index"));
      if (Number.isInteger(index)) {
        goToQuestion(index);
      }
    });
  }

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => previousQuestion());
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => nextQuestion());
  }
}

function goToQuestion(index) {
  if (
    !Array.isArray(viewResultsState.combined) ||
    index < 0 ||
    index >= viewResultsState.combined.length
  ) {
    return;
  }

  viewResultsState.currentIndex = index;
  renderQuestionDetail();
  highlightCurrentQuestion();
  updateNavigationButtons();
}

function nextQuestion() {
  const nextIndex = viewResultsState.currentIndex + 1;
  if (nextIndex < viewResultsState.combined.length) {
    goToQuestion(nextIndex);
  }
}

function previousQuestion() {
  const prevIndex = viewResultsState.currentIndex - 1;
  if (prevIndex >= 0) {
    goToQuestion(prevIndex);
  }
}

function highlightCurrentQuestion() {
  const grid = document.getElementById("questionGrid");
  if (!grid) return;
  const items = grid.querySelectorAll(".question-number");
  items.forEach((item, index) => {
    item.classList.toggle("current", index === viewResultsState.currentIndex);
  });
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const total = viewResultsState.combined.length;
  const index = viewResultsState.currentIndex;

  if (prevBtn) {
    prevBtn.disabled = index <= 0;
  }

  if (nextBtn) {
    nextBtn.disabled = total === 0 || index >= total - 1;
  }
}

function renderViewResultsError(message) {
  const container = document.getElementById("questionContainer");
  const grid = document.getElementById("questionGrid");
  const messageBox = document.getElementById("resultsMessage");
  const navControls = document.querySelector(".question-navigation");

  if (messageBox) {
    messageBox.textContent = message;
    messageBox.classList.add("error");
    messageBox.style.display = "block";
  }

  if (container) {
    container.innerHTML = `
      <div class="dashboard-error text-center">
          <i class="fas fa-exclamation-triangle"></i>
          ${escapeHtml(message)}
      </div>
    `;
  }

  if (grid) {
    grid.innerHTML = `
      <div class="dashboard-empty text-center">
          <i class="fas fa-info-circle"></i>
          Không có dữ liệu câu hỏi.
      </div>
    `;
  }

  if (navControls) {
    navControls.style.display = "none";
  }
}

function setTextContent(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDurationMinutes(minutes) {
  if (minutes === undefined || minutes === null) return "Chưa cập nhật";
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return "Chưa cập nhật";
  return `${value} phút`;
}

function formatPercentage(value) {
  if (value === undefined || value === null) return "--%";
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "--%";
  return `${num.toFixed(1)}%`;
}

function trimNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function normalizeQuestionForView(raw, index) {
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

function getOptionKey(index) {
  if (index < OPTION_KEY_SEQUENCE.length) {
    return OPTION_KEY_SEQUENCE[index];
  }
  const quotient = Math.floor(index / OPTION_KEY_SEQUENCE.length);
  const remainder = index % OPTION_KEY_SEQUENCE.length;
  const prefix = getOptionKey(quotient - 1);
  return `${prefix}${OPTION_KEY_SEQUENCE[remainder]}`;
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

function normalizeCandidateValue(value) {
  if (value === undefined || value === null) return null;
  return value.toString().trim().toLowerCase();
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

