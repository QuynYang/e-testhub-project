const STUDENT_EXAM_INFO_API_BASE_URL = "https://e-testhub-project.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  initializeExamInfoPage();
});

async function initializeExamInfoPage() {
  const container = document.getElementById("examInfoContainer");
  if (!container) return;

  const examId = container.getAttribute("data-exam-id");
  if (!examId) {
    renderExamError("Không tìm thấy mã bài thi. Vui lòng quay lại danh sách.");
    return;
  }

  setLoadingState();

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    const [exam, submission] = await Promise.all([
      fetchExamDetails(examId, token),
      fetchStudentSubmission(examId, token),
    ]);

    const questionSummary = await fetchExamQuestionSummary(examId, token, exam);

    renderExamDetails(exam, submission, questionSummary);
  } catch (error) {
    console.error("Không thể tải thông tin bài thi:", error);
    renderExamError(error?.message || "Không thể tải thông tin bài thi.");
  }
}

async function fetchExamDetails(examId, token) {
  const response = await fetch(
    `${STUDENT_EXAM_INFO_API_BASE_URL}/exams/${examId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

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

async function fetchStudentSubmission(examId, token) {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userId =
      storedUser?.id || storedUser?._id || storedUser?.userId || null;
    if (!userId) return null;

    const response = await fetch(
      `${STUDENT_EXAM_INFO_API_BASE_URL}/exams/${examId}/submissions/${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let message = "Không thể tải thông tin làm bài.";
      try {
        const payload = await response.json();
        message = payload?.message || message;
      } catch (err) {
        // ignore parse error
      }
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.warn("Không thể tải thông tin làm bài:", error);
    return null;
  }
}

async function fetchExamQuestionSummary(examId, token, exam) {
  const summary = {
    count: null,
    totalPoints: null,
  };

  try {
    let normalizedQuestions = [];

    if (Array.isArray(exam?.questions) && exam.questions.length > 0) {
      normalizedQuestions = exam.questions.map(normalizeQuestion).filter(Boolean);
    }

    if (normalizedQuestions.length === 0) {
      const response = await fetch(
        `${STUDENT_EXAM_INFO_API_BASE_URL}/exams/${examId}/questions`,
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
        const questions = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        normalizedQuestions = questions.map(normalizeQuestion).filter(Boolean);
      }
    }

    if (normalizedQuestions.length > 0) {
      summary.count = normalizedQuestions.length;
      let countedQuestions = 0;
      const totalPoints = normalizedQuestions.reduce((sum, question) => {
        const points = Number(question.points);
        if (Number.isFinite(points)) {
          countedQuestions += 1;
          return sum + points;
        }
        return sum;
      }, 0);
      if (countedQuestions > 0 && Number.isFinite(totalPoints)) {
        summary.totalPoints = totalPoints;
      }
    }
  } catch (error) {
    console.warn("Không thể tải câu hỏi của bài thi:", error);
  }

  if (!Number.isFinite(summary.count)) {
    const fallbackCountSources = [
      exam?.questions?.length,
      exam?.questionIds?.length,
      exam?.questionCount,
      exam?.totalQuestions,
    ];
    for (const value of fallbackCountSources) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        summary.count = parsed;
        break;
      }
    }
  }

  if (!Number.isFinite(summary.totalPoints)) {
    const parsed = Number(exam?.totalPoints);
    if (Number.isFinite(parsed)) {
      summary.totalPoints = parsed;
    }
  }

  return summary;
}

function setLoadingState() {
  const title = document.getElementById("examTitle");
  if (title) {
    title.textContent = "Đang tải bài thi...";
  }
  const duration = document.getElementById("examDuration");
  if (duration) duration.textContent = "Đang tải...";
  const startTime = document.getElementById("examStartTime");
  if (startTime) startTime.textContent = "Đang tải...";
  const questionCount = document.getElementById("examQuestionCount");
  if (questionCount) questionCount.textContent = "Đang tải...";
  const examType = document.getElementById("examType");
  if (examType) examType.textContent = "Đang tải...";
  const attempts = document.getElementById("examAttempts");
  if (attempts) attempts.textContent = "Đang tải...";
}

function renderExamError(message) {
  const container = document.getElementById("examInfoContainer");
  if (!container) return;
  container.innerHTML = `
    <div class="dashboard-error text-center">
        <i class="fas fa-exclamation-triangle"></i>
        ${escapeHtml(message)}
    </div>
    <div class="exam-actions-secondary">
        <a href="/Student/MyExams" class="exam-action-btn secondary">
            <i class="fas fa-arrow-left"></i>
            Quay lại danh sách
        </a>
    </div>
  `;
}

function renderExamDetails(exam, submission, questionSummary = {}) {
  const title = document.getElementById("examTitle");
  if (title) {
    title.textContent = exam.title || exam.name || "Bài thi không tên";
  }

  renderStatusBanner(exam, submission);

  const duration = document.getElementById("examDuration");
  if (duration) {
    duration.textContent = formatDuration(exam.duration);
  }

  const startTime = document.getElementById("examStartTime");
  if (startTime) {
    const openAt = exam.openAt || exam.startTime || exam.availableFrom;
    startTime.textContent = openAt ? formatDateTime(openAt) : "Chưa cập nhật";
  }

  const questionCountElement = document.getElementById("examQuestionCount");
  if (questionCountElement) {
    const countSources = [
      questionSummary?.count,
      exam?.questions?.length,
      exam?.questionIds?.length,
      exam?.questionCount,
      exam?.totalQuestions,
    ];
    let countValue = null;

    for (const source of countSources) {
      const parsed = Number(source);
      if (Number.isFinite(parsed) && parsed >= 0) {
        countValue = parsed;
        break;
      }
    }

    questionCountElement.textContent =
      countValue !== null ? countValue.toString() : "Chưa cập nhật";
  }

  const totalPointsRow = document.getElementById("examTotalPointsRow");
  const totalPointsValue = document.getElementById("examTotalPoints");
  if (totalPointsRow && totalPointsValue) {
    const totalPointSources = [
      questionSummary?.totalPoints,
      exam?.totalPoints,
    ];
    let totalPoints = null;

    for (const source of totalPointSources) {
      const parsed = Number(source);
      if (Number.isFinite(parsed)) {
        totalPoints = parsed;
        break;
      }
    }

    if (totalPoints !== null && !Number.isNaN(totalPoints)) {
      totalPointsRow.style.display = "flex";
      totalPointsValue.textContent = totalPoints.toString();
    } else {
      totalPointsRow.style.display = "none";
    }
  }

  const examType = document.getElementById("examType");
  if (examType) {
    examType.textContent =
      exam.type ||
      exam.category ||
      exam.examType ||
      exam.format ||
      "Chưa cập nhật";
  }

  const attempts = document.getElementById("examAttempts");
  if (attempts) {
    const maxAttempts =
      exam.maxAttempts !== undefined
        ? exam.maxAttempts
        : exam.attemptLimit !== undefined
        ? exam.attemptLimit
        : 1;
    attempts.textContent = `${maxAttempts} lần`;
  }

  renderInstructions(exam);
  renderActions(exam, submission);
}

function renderStatusBanner(exam, submission) {
  const banner = document.getElementById("examStatusBanner");
  const icon = document.getElementById("examStatusIcon");
  const text = document.getElementById("examStatusText");

  if (!banner || !icon || !text) return;

  const state = computeStatus(exam, submission);

  banner.style.display = "flex";
  banner.className = `exam-status-banner ${state.className}`;

  icon.className = `fas ${state.iconClass}`;
  text.textContent = state.message;
}

function computeStatus(exam, submission) {
  const now = new Date();
  const openAt = exam.openAt ? new Date(exam.openAt) : null;
  const closeAt = exam.closeAt ? new Date(exam.closeAt) : null;

  const isDraft = exam.isPublished === false || exam.status === "draft";
  if (isDraft) {
    return {
      code: "draft",
      className: "draft",
      iconClass: "fa-file-alt",
      message: "Bài thi đang ở chế độ nháp. Vui lòng quay lại sau.",
    };
  }

  if (submission?.status === "submitted" || submission?.isCompleted) {
    return {
      code: "submitted",
      className: "completed",
      iconClass: "fa-check-circle",
      message: "Bạn đã hoàn thành bài thi.",
    };
  }

  if (openAt && now < openAt) {
    return {
      code: "upcoming",
      className: "upcoming",
      iconClass: "fa-clock",
      message: `Bài thi sẽ mở vào ${formatDateTime(openAt)}.`,
    };
  }

  if (closeAt && now > closeAt) {
    return {
      code: "completed",
      className: "completed",
      iconClass: "fa-check-circle",
      message: "Bài thi đã kết thúc.",
    };
  }

  return {
    code: "in-progress",
    className: "in-progress",
    iconClass: "fa-play-circle",
    message: "Bài thi đang diễn ra - Có thể vào thi ngay.",
  };
}

function renderInstructions(exam) {
  const container = document.getElementById("examInstructionsContainer");
  const list = document.getElementById("examInstructions");
  if (!container || !list) return;

  const instructions =
    exam.instructions ||
    exam.guidelines ||
    exam.notes ||
    exam.description ||
    [];

  const items = Array.isArray(instructions)
    ? instructions
    : typeof instructions === "string"
    ? [instructions]
    : [];

  if (!items.length) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  list.innerHTML = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderActions(exam, submission) {
  const actionsContainer = document.getElementById("examActions");
  if (!actionsContainer) return;

  const state = computeStatus(exam, submission);

  let primaryButton = "";

  if (state.code === "in-progress") {
    primaryButton = `
      <a href="/Student/TakeExam?examId=${encodeURIComponent(
        exam._id || exam.id
      )}" class="exam-action-btn primary">
        <i class="fas fa-play"></i>
        Bắt đầu thi
      </a>
    `;
  } else if (state.code === "upcoming") {
    primaryButton = `
      <div class="exam-action-btn disabled">
        <i class="fas fa-clock"></i>
        Chưa đến giờ thi
      </div>
    `;
  } else if (state.code === "completed" || state.code === "submitted") {
    primaryButton = `
      <a href="/Student/ViewResults?examId=${encodeURIComponent(
        exam._id || exam.id
      )}" class="exam-action-btn success">
        <i class="fas fa-eye"></i>
        ${
          submission?.score !== undefined
            ? `Xem kết quả (${submission.score}/${submission.maxScore || 10})`
            : "Xem kết quả"
        }
      </a>
    `;
  } else if (state.code === "draft") {
    primaryButton = `
      <div class="exam-action-btn disabled">
        <i class="fas fa-ban"></i>
        Bài thi chưa sẵn sàng
      </div>
    `;
  }

  if (!primaryButton) {
    primaryButton = `
      <div class="exam-action-btn disabled">
        <i class="fas fa-info-circle"></i>
        Bài thi đang cập nhật
      </div>
    `;
  }

  actionsContainer.innerHTML = primaryButton;
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

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatDuration(minutes) {
  if (!minutes || Number.isNaN(minutes)) return "Không xác định";
  return `${minutes} phút`;
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

function normalizeQuestion(raw) {
  if (!raw) return null;
  const content = raw.content || raw.text || raw.question || raw.prompt;
  if (!content) return null;

  const answers = Array.isArray(raw.answers)
    ? raw.answers.map((answer) => ({
        content: answer.content || answer.text || answer.answer,
        isCorrect: !!answer.isCorrect,
      }))
    : Array.isArray(raw.options)
    ? raw.options.map((option) => ({
        content: option.text || option.content || option.label,
        isCorrect: !!option.isCorrect,
      }))
    : [];

  return {
    content,
    points:
      typeof raw.points === "number"
        ? raw.points
        : typeof raw.score === "number"
        ? raw.score
        : undefined,
    answers,
  };
}

