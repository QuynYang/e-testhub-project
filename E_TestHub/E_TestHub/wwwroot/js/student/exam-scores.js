const EXAM_SCORES_API_BASE_URL = "https://e-testhub-project.onrender.com/api";
const EXAM_RESULTS_ENDPOINT = `${EXAM_SCORES_API_BASE_URL}/exam-results`;

const examScoresState = {
  token: null,
  studentId: null,
  student: null,
  allResults: [],
  filteredResults: [],
};

document.addEventListener("DOMContentLoaded", () => {
  initializeExamScoresPage();
});

async function initializeExamScoresPage() {
  setLoadingState();

  try {
    const token = getToken();
    const { id: studentId, user } = getCurrentStudent();
    examScoresState.token = token;
    examScoresState.studentId = studentId;
    examScoresState.student = user;

    const examResults = await fetchStudentExamResults(studentId);
    await enrichExamResultsWithMetadata(examResults);
    examScoresState.allResults = examResults;
    examScoresState.filteredResults = examResults;

    renderExamScores(examResults);
    attachFilterHandlers();
  } catch (error) {
    console.error("Không thể tải danh sách điểm thi:", error);
    renderExamScoresError(error?.message || "Không thể tải danh sách điểm thi.");
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

async function fetchStudentExamResults(studentId) {
  const params = new URLSearchParams();
  params.set("studentId", studentId);

  const response = await fetch(`${EXAM_RESULTS_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${examScoresState.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách điểm thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((result) => normalizeExamResult(result))
    .filter(Boolean)
    .sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
}

async function enrichExamResultsWithMetadata(results) {
  if (!Array.isArray(results) || !results.length) return;

  const uniqueExamIds = [
    ...new Set(results.map((result) => result.examId).filter(Boolean)),
  ];

  if (!uniqueExamIds.length) return;

  const examCache = {};

  await Promise.all(
    uniqueExamIds.map(async (examId) => {
      try {
        const exam = await fetchExamDetails(examId);
        examCache[examId] = exam;
      } catch (error) {
        console.warn(`Không thể tải thông tin bài thi ${examId}:`, error);
      }
    })
  );

  results.forEach((result) => {
    const exam = result.examId ? examCache[result.examId] : null;
    if (!exam) return;

    if (!result.examTitle || result.examTitle === "Bài thi không tên") {
      result.examTitle =
        exam.title ||
        exam.name ||
        exam.examTitle ||
        exam.examName ||
        "Bài thi không tên";
    }

    if (!result.subject || result.subject === "Chưa cập nhật") {
      const subject = deriveSubjectFromExam(exam);
      if (subject) {
        result.subject = subject;
      }
    }

    if (!result.examDate || Number.isNaN(result.examDate.getTime())) {
      const dateValue = exam.submittedAt || exam.closeAt || exam.openAt || exam.startTime;
      if (dateValue) {
        const parsed = new Date(dateValue);
        if (!Number.isNaN(parsed.getTime())) {
          result.examDate = parsed;
        }
      }
    }
  });
}

async function fetchExamDetails(examId) {
  if (!examId) return null;
  const response = await fetch(`${EXAM_SCORES_API_BASE_URL}/exams/${examId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${examScoresState.token}`,
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

function deriveSubjectFromExam(exam) {
  if (!exam) return null;

  if (exam.subject || exam.subjectName || exam.courseName) {
    return exam.subject || exam.subjectName || exam.courseName;
  }

  const classInfo = Array.isArray(exam.classIds) ? exam.classIds[0] : null;
  if (classInfo && typeof classInfo === "object") {
    return (
      classInfo.name ||
      classInfo.className ||
      classInfo.title ||
      classInfo.classCode ||
      null
    );
  }

  return null;
}

function normalizeExamResult(raw) {
  if (!raw) return null;

  const examId = normalizeId(raw.examId);
  const examTitle = raw.examTitle || raw.examName || raw.title || "Bài thi không tên";
  const subject =
    raw.subject ||
    raw.courseName ||
    raw.subjectName ||
    raw.examSubject ||
    "Chưa cập nhật";

  const examDate = raw.examDate ? new Date(raw.examDate) : null;
  const submittedAt = raw.submittedAt ? new Date(raw.submittedAt) : null;

  const scoreEarned = Number(raw?.score?.earned ?? raw?.score ?? 0);
  const scoreTotal = Number(raw?.score?.total ?? raw?.maxScore ?? raw?.score?.max ?? 10);
  const status =
    typeof raw?.totals?.graded === "boolean"
      ? raw.totals.graded
        ? "Đã chấm"
        : "Chờ chấm"
      : scoreEarned > 0 || raw?.questionResults?.length
      ? "Đã chấm"
      : "Chờ chấm";

  return {
    id: normalizeId(raw._id || raw.id),
    examId,
    examTitle,
    subject,
    examDate: examDate && !Number.isNaN(examDate.getTime()) ? examDate : submittedAt || new Date(),
    submittedAt,
    score: scoreEarned,
    maxScore: Number.isFinite(scoreTotal) && scoreTotal > 0 ? scoreTotal : 10,
    status,
    attemptNumber: raw.attemptNumber || 1,
  };
}

function setLoadingState() {
  const tbody = document.getElementById("scoresTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr id="scoresLoadingRow">
          <td colspan="6" class="text-center">
              <div class="dashboard-loading-inline">
                  <i class="fas fa-spinner fa-spin"></i> Đang tải điểm thi...
              </div>
          </td>
      </tr>
    `;
  }
  const emptyState = document.getElementById("emptyState");
  if (emptyState) {
    emptyState.style.display = "none";
  }
}

function renderExamScoresError(message) {
  const tbody = document.getElementById("scoresTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
          <td colspan="6">
              <div class="dashboard-error text-center">
                  <i class="fas fa-exclamation-triangle"></i>
                  ${escapeHtml(message)}
              </div>
          </td>
      </tr>
    `;
  }
  const emptyState = document.getElementById("emptyState");
  if (emptyState) {
    emptyState.style.display = "none";
  }
}

function renderExamScores(results) {
  const tbody = document.getElementById("scoresTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tbody || !emptyState) return;

  if (!Array.isArray(results) || results.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    document.querySelector(".scores-table-container").style.display = "none";
    return;
  }

  document.querySelector(".scores-table-container").style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = results
    .map((result) => createExamScoreRow(result))
    .join("");

  sortExams();
  applyFilters();
}

function createExamScoreRow(result) {
  const statusClass = result.status === "Đã chấm" ? "graded" : "pending";
  const submissionDate = result.examDate
    ? formatDate(result.examDate)
    : "Chưa cập nhật";
  const scoreDisplay =
    result.status === "Đã chấm"
      ? `
          <div class="score-display">
              <span class="score-value">${formatScore(result.score)}</span>
              <span class="score-max">/${formatScore(result.maxScore)}</span>
          </div>
        `
      : `<span class="score-pending">-</span>`;

  const actionButton =
    result.status === "Đã chấm"
      ? `
          <a href="/Student/ViewResults?examId=${encodeURIComponent(
            result.examId || ""
          )}&resultId=${encodeURIComponent(result.id || "")}" 
             class="btn-action view"
             title="Xem chi tiết">
              <i class="fas fa-eye"></i>
          </a>
        `
      : `
          <button class="btn-action disabled" title="Đang chờ chấm điểm" disabled>
              <i class="fas fa-lock"></i>
          </button>
        `;

  return `
    <tr class="score-row"
        data-subject="${escapeHtml(result.subject)}"
        data-status="${result.status === "Đã chấm" ? "graded" : "pending"}"
        data-date="${result.examDate ? result.examDate.getTime() : 0}"
        data-score="${Number.isFinite(result.score) ? result.score : 0}">
        <td>
            <div class="exam-name">
                <i class="fas fa-file-alt"></i>
                <span>${escapeHtml(result.examTitle)}</span>
            </div>
        </td>
        <td>
            <span class="subject-badge">${escapeHtml(result.subject)}</span>
        </td>
        <td>
            <span class="exam-date">
                <i class="far fa-calendar"></i>
                ${submissionDate}
            </span>
        </td>
        <td>${scoreDisplay}</td>
        <td>
            <span class="status-badge ${statusClass}">
                <i class="fas ${
                  result.status === "Đã chấm" ? "fa-check" : "fa-hourglass-half"
                }"></i>
                ${result.status}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                ${actionButton}
            </div>
        </td>
    </tr>
  `;
}

function attachFilterHandlers() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const subjectFilter = document.getElementById("subjectFilter");
  const sortSelect = document.getElementById("sortBy");

  if (searchInput) {
    searchInput.addEventListener("input", debounce(applyFilters, 200));
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }
  if (subjectFilter) {
    subjectFilter.addEventListener("change", applyFilters);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortExams();
      applyFilters();
    });
  }
}

function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const subjectFilter = document.getElementById("subjectFilter");

  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const statusValue = statusFilter ? statusFilter.value : "all";
  const subjectValue = subjectFilter ? subjectFilter.value : "all";

  const rows = document.querySelectorAll(".score-row");
  let visibleCount = 0;

  rows.forEach((row) => {
    const examName = row.querySelector(".exam-name span").textContent.toLowerCase();
    const subject = row.getAttribute("data-subject") || "";
    const status = row.getAttribute("data-status") || "";

    const matchesSearch =
      !searchValue ||
      examName.includes(searchValue) ||
      subject.toLowerCase().includes(searchValue);
    const matchesStatus = statusValue === "all" || status === statusValue;
    const matchesSubject = subjectValue === "all" || subject === subjectValue;

    const isVisible = matchesSearch && matchesStatus && matchesSubject;
    row.style.display = isVisible ? "" : "none";
    if (isVisible) visibleCount += 1;
  });

  const emptyState = document.getElementById("emptyState");
  const tableContainer = document.querySelector(".scores-table-container");

  if (emptyState && tableContainer) {
    if (visibleCount === 0) {
      emptyState.style.display = "block";
      tableContainer.style.display = "none";
    } else {
      emptyState.style.display = "none";
      tableContainer.style.display = "block";
    }
  }
}

function sortExams() {
  const sortBy = document.getElementById("sortBy")?.value || "date-desc";
  const tbody = document.getElementById("scoresTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll(".score-row"));
  rows.sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return Number(b.getAttribute("data-date")) - Number(a.getAttribute("data-date"));
      case "date-asc":
        return Number(a.getAttribute("data-date")) - Number(b.getAttribute("data-date"));
      case "score-desc":
        return Number(b.getAttribute("data-score")) - Number(a.getAttribute("data-score"));
      case "score-asc":
        return Number(a.getAttribute("data-score")) - Number(b.getAttribute("data-score"));
      default:
        return 0;
    }
  });

  rows.forEach((row) => tbody.appendChild(row));
}

function exportScores() {
  const tableContainer = document.querySelector(".scores-table-container");
  if (!tableContainer || tableContainer.style.display === "none") {
    showNotification("Không có dữ liệu để xuất.", "error");
    return;
  }

  const rows = Array.from(document.querySelectorAll(".score-row")).filter(
    (row) => row.style.display !== "none"
  );
  if (!rows.length) {
    showNotification("Không có dữ liệu để xuất.", "error");
    return;
  }

  let csvContent = "Tên bài thi,Môn học,Ngày thi,Điểm số,Trạng thái\n";
  rows.forEach((row) => {
    const examName = row.querySelector(".exam-name span").textContent;
    const subject = row.querySelector(".subject-badge").textContent;
    const date = row.querySelector(".exam-date").textContent.trim();
    const scoreValue = row.querySelector(".score-value");
    const score = scoreValue ? scoreValue.textContent : "-";
    const status = row.querySelector(".status-badge").textContent.trim();

    csvContent += `"${examName}","${subject}","${date}","${score}","${status}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `diem_thi_${new Date().getTime()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification("Đã xuất báo cáo thành công!", "success");
}

function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === "success" ? "#10B981" : "#EF4444"};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Inter', sans-serif;
        font-size: 15px;
        font-weight: 600;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease-out";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

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

function formatDate(date) {
  if (!date) return "Chưa cập nhật";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "Chưa cập nhật";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatScore(value) {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}
