const TEACHER_RESULTS_API_BASE_URL = "http://localhost:3000/api";
const TEACHER_EXAMS_ENDPOINT = `${TEACHER_RESULTS_API_BASE_URL}/exams`;
const TEACHER_EXAM_RESULTS_ENDPOINT = `${TEACHER_RESULTS_API_BASE_URL}/exam-results`;

const teacherResultsState = {
  token: null,
  teacherId: null,
  exams: [],
  subjects: [],
  filteredSubjects: [],
  gradeDistribution: {
    excellent: 0,
    good: 0,
    fair: 0,
    average: 0,
    poor: 0,
  },
  charts: {
    averageScore: null,
    gradeDistribution: null,
  },
  filters: {
    search: "",
    score: "",
  },
  sort: {
    column: "code",
    direction: "asc",
  },
  pagination: {
    currentPage: 1,
    perPage: 10,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  initializeTeacherViewResultsPage();
});

async function initializeTeacherViewResultsPage() {
  try {
    showLoadingState();

    teacherResultsState.token = getToken();
    const teacherInfo = getCurrentTeacher();

    if (!teacherResultsState.token || !teacherInfo?.id) {
      throw new Error("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.");
    }

    teacherResultsState.teacherId = teacherInfo.id;

    const exams = await fetchTeacherExamsForResults();
    teacherResultsState.exams = exams;

    const subjectResults = await buildSubjectResults(exams);
    teacherResultsState.subjects = subjectResults;
    teacherResultsState.filteredSubjects = subjectResults;

    renderSummaryCards();
    renderCharts();
    renderSubjectTable();
    setupFiltersAndSorting();

    hideLoadingState();
  } catch (error) {
    console.error("Không thể tải dữ liệu kết quả:", error);
    showResultsError(error?.message || "Không thể tải dữ liệu thống kê.");
  }
}

function showLoadingState() {
  const summaryElements = [
    document.getElementById("totalSubjectsValue"),
    document.getElementById("totalExamsValue"),
  ];
  summaryElements.forEach((el) => {
    if (el) el.textContent = "...";
  });

  const tbody = document.getElementById("subjectResultsTable");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px; color:#666;">
          <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu môn học...
        </td>
      </tr>
    `;
  }

  const messageBox = document.getElementById("teacherResultsMessage");
  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }
}

function hideLoadingState() {
  const messageBox = document.getElementById("teacherResultsMessage");
  if (messageBox && messageBox.classList.contains("error")) {
    messageBox.style.display = "none";
    messageBox.classList.remove("error");
  }
}

function showResultsError(message) {
  const tbody = document.getElementById("subjectResultsTable");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px; color:#dc3545;">
          ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }

  const messageBox = document.getElementById("teacherResultsMessage");
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.classList.add("error");
    messageBox.style.display = "block";
  }

  const summaryElements = [
    document.getElementById("totalSubjectsValue"),
    document.getElementById("totalExamsValue"),
  ];
  summaryElements.forEach((el) => {
    if (el) el.textContent = "0";
  });

  destroyCharts();
}

function getToken() {
  return localStorage.getItem("token");
}

function getCurrentTeacher() {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    const id = normalizeId(user?.id || user?._id || user?.userId);
    return {
      id,
      email: user?.email,
      role: user?.role || "teacher",
    };
  } catch (error) {
    console.warn("Không thể đọc thông tin giáo viên:", error);
    return null;
  }
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

async function fetchTeacherExamsForResults() {
  const token = teacherResultsState.token;
  const response = await fetch(`${TEACHER_EXAMS_ENDPOINT}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách bài thi.";
    try {
      const errorPayload = await response.json();
      message = errorPayload?.message || message;
    } catch (_) {
      // ignore parse error
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const examsRaw = unwrapListResponse(payload);

  return examsRaw
    .map(normalizeExamForResults)
    .filter(
      (exam) =>
        !teacherResultsState.teacherId ||
        exam.teacherId === teacherResultsState.teacherId
    );
}

function unwrapListResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const candidateKeys = ["data", "items", "results", "list", "value"];
  for (const key of candidateKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  if (payload.data && typeof payload.data === "object") {
    for (const key of candidateKeys) {
      if (Array.isArray(payload.data[key])) {
        return payload.data[key];
      }
    }
  }

  return [];
}

function normalizeExamForResults(raw) {
  const teacherId = normalizeId(raw.teacherId || raw.teacher?._id || raw.teacher);

  const classDocs = Array.isArray(raw.classIds) ? raw.classIds : raw.classes || [];
  const classes = classDocs.map((cls) => ({
    id: normalizeId(cls._id || cls.id || cls),
    code: cls.classCode || cls.code || cls.name || cls.title || "N/A",
    name: cls.name || cls.classCode || cls.title || "Không xác định",
  }));

  const duration = Number(raw.duration || raw.timeLimit || 0);

  return {
    id: normalizeId(raw._id || raw.id),
    title: raw.title || raw.name || "Không có tiêu đề",
    description: raw.description || "",
    teacherId,
    classes,
    duration,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
    openAt: raw.openAt || raw.startTime || raw.availableFrom,
    closeAt: raw.closeAt || raw.endTime || raw.availableTo,
  };
}

async function fetchExamResultsForExam(examId) {
  const token = teacherResultsState.token;
  const params = new URLSearchParams();
  params.set("examId", examId);

  const response = await fetch(
    `${TEACHER_EXAM_RESULTS_ENDPOINT}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let message = "Không thể tải kết quả bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function buildSubjectResults(exams) {
  const subjectMap = new Map();
  const gradeDistribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    average: 0,
    poor: 0,
  };

  for (const exam of exams) {
    let examResults = [];
    try {
      examResults = await fetchExamResultsForExam(exam.id);
    } catch (error) {
      console.warn(`Không thể tải kết quả cho bài thi ${exam.id}:`, error);
    }

    const subjectInfo = getSubjectInfoFromExam(exam);
    const key = subjectInfo.code || exam.id;

    if (!subjectMap.has(key)) {
      subjectMap.set(key, {
        code: subjectInfo.code || "N/A",
        name: subjectInfo.name || "Không xác định",
        examCount: 0,
        totalScore: 0,
        scoreCount: 0,
        gradeCounts: {
          excellent: 0,
          good: 0,
          fair: 0,
          average: 0,
          poor: 0,
        },
      });
    }

    const entry = subjectMap.get(key);
    entry.examCount += 1;

    if (Array.isArray(examResults) && examResults.length > 0) {
      examResults.forEach((result) => {
        const score = calculateNormalizedScore(result);
        if (score === null) return;

        entry.totalScore += score;
        entry.scoreCount += 1;

        const bucket = getGradeBucket(score);
        entry.gradeCounts[bucket] += 1;
        gradeDistribution[bucket] += 1;
      });
    }
  }

  teacherResultsState.gradeDistribution = gradeDistribution;

  return Array.from(subjectMap.values())
    .map((entry) => {
      const averageScore =
        entry.scoreCount > 0 ? entry.totalScore / entry.scoreCount : 0;
      return {
        code: entry.code,
        name: entry.name,
        examCount: entry.examCount,
        averageScore: Number(averageScore.toFixed(1)),
        gradeCounts: entry.gradeCounts,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function getSubjectInfoFromExam(exam) {
  if (exam.classes && exam.classes.length > 0) {
    const cls = exam.classes[0];
    return {
      code: cls.code || cls.classCode || "N/A",
      name: cls.name || cls.classCode || exam.title || "Không xác định",
    };
  }

  if (exam.classIds && exam.classIds.length > 0) {
    const cls = exam.classIds[0];
    return {
      code: cls.classCode || cls.code || cls.name || "N/A",
      name: cls.name || cls.classCode || exam.title || "Không xác định",
    };
  }

  return {
    code: exam.subjectCode || "N/A",
    name: exam.subject || exam.title || "Không xác định",
  };
}

function calculateNormalizedScore(result) {
  if (!result) return null;

  // Prefer accuracy (percentage 0-100)
  const accuracy = Number(result.accuracy ?? result.percentage ?? result.percent);
  if (Number.isFinite(accuracy) && accuracy >= 0) {
    return Math.min(Math.max(accuracy / 10, 0), 10);
  }

  // Use score object if available
  const score = result.score;
  if (score) {
    const earned = Number(score.earned ?? score.value ?? score.score ?? 0);
    const total = Number(score.total ?? score.max ?? score.totalPoints ?? 0);
    if (Number.isFinite(earned) && Number.isFinite(total) && total > 0) {
      return Math.min(Math.max((earned / total) * 10, 0), 10);
    }
  }

  // Fallback to totals if available
  const totals = result.totals;
  if (totals) {
    const correct = Number(totals.correct ?? 0);
    const totalQuestions = Number(totals.totalQuestions ?? totals.total ?? 0);
    if (
      Number.isFinite(correct) &&
      Number.isFinite(totalQuestions) &&
      totalQuestions > 0
    ) {
      return Math.min(Math.max((correct / totalQuestions) * 10, 0), 10);
    }
  }

  return null;
}

function getGradeBucket(score) {
  if (!Number.isFinite(score)) return "poor";
  if (score >= 8.5) return "excellent";
  if (score >= 7.0) return "good";
  if (score >= 5.5) return "fair";
  if (score >= 4.0) return "average";
  return "poor";
}

function renderSummaryCards() {
  const totalSubjectsEl = document.getElementById("totalSubjectsValue");
  const totalExamsEl = document.getElementById("totalExamsValue");

  if (totalSubjectsEl) {
    totalSubjectsEl.textContent = teacherResultsState.subjects.length.toString();
  }

  if (totalExamsEl) {
    totalExamsEl.textContent = teacherResultsState.exams.length.toString();
  }
}

function renderCharts() {
  const subjects = teacherResultsState.subjects;
  const gradeDistribution = teacherResultsState.gradeDistribution;

  const subjectCodes = subjects.map((subject) => subject.code);
  const averageScores = subjects.map((subject) => subject.averageScore);

  // Destroy previous charts if they exist
  destroyCharts();

  const avgCanvas = document.getElementById("averageScoreChart");
  if (avgCanvas && subjectCodes.length > 0) {
    teacherResultsState.charts.averageScore = new Chart(avgCanvas, {
      type: "bar",
      data: {
        labels: subjectCodes,
        datasets: [
          {
            label: "Điểm trung bình",
            data: averageScores,
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `Điểm TB: ${context.parsed.y.toFixed(1)}`,
            },
          },
        },
      },
    });
  }

  const gradeCanvas = document.getElementById("gradeDistributionChart");
  const totalGrades = Object.values(gradeDistribution).reduce(
    (sum, value) => sum + value,
    0
  );
  if (gradeCanvas) {
    teacherResultsState.charts.gradeDistribution = new Chart(gradeCanvas, {
      type: "doughnut",
      data: {
        labels: [
          "Xuất sắc (≥8.5)",
          "Giỏi (7-8.4)",
          "Khá (5.5-6.9)",
          "Trung bình (4-5.4)",
          "Yếu (<4)",
        ],
        datasets: [
          {
            data: [
              gradeDistribution.excellent,
              gradeDistribution.good,
              gradeDistribution.fair,
              gradeDistribution.average,
              gradeDistribution.poor,
            ],
            backgroundColor: [
              "rgba(40, 167, 69, 0.8)",
              "rgba(13, 110, 253, 0.8)",
              "rgba(255, 193, 7, 0.8)",
              "rgba(255, 152, 0, 0.8)",
              "rgba(220, 53, 69, 0.8)",
            ],
            borderColor: [
              "rgba(40, 167, 69, 1)",
              "rgba(13, 110, 253, 1)",
              "rgba(255, 193, 7, 1)",
              "rgba(255, 152, 0, 1)",
              "rgba(220, 53, 69, 1)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.parsed || 0;
                const percentage =
                  totalGrades > 0 ? ((value / totalGrades) * 100).toFixed(1) : 0;
                return `${label}: ${value} môn (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
}

function destroyCharts() {
  Object.values(teacherResultsState.charts).forEach((chart) => {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }
  });
  teacherResultsState.charts.averageScore = null;
  teacherResultsState.charts.gradeDistribution = null;
}

function renderSubjectTable() {
  const tbody = document.getElementById("subjectResultsTable");
  if (!tbody) return;

  const subjects = teacherResultsState.filteredSubjects;
  const perPage = teacherResultsState.pagination.perPage;
  const totalPages = Math.max(Math.ceil(subjects.length / perPage), 1);
  if (teacherResultsState.pagination.currentPage > totalPages) {
    teacherResultsState.pagination.currentPage = totalPages;
  }
  const currentPage = teacherResultsState.pagination.currentPage;

  if (!Array.isArray(subjects) || subjects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px; color:#666;">
          Không có dữ liệu môn học.
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }

  const start = (currentPage - 1) * perPage;
  const pageItems = subjects.slice(start, start + perPage);

  tbody.innerHTML = pageItems
    .map((subject) => {
      const scoreClass = getScoreClass(subject.averageScore);
      const detailsUrl = `/Teacher/SubjectExamDetails?subjectCode=${encodeURIComponent(
        subject.code
      )}`;
      return `
        <tr data-subject-code="${escapeHtml(subject.code)}">
            <td>
                <div class="subject-code">${escapeHtml(subject.code)}</div>
            </td>
            <td>
                <div class="subject-name">${escapeHtml(subject.name)}</div>
            </td>
            <td>
                <div class="exam-count">${subject.examCount}</div>
            </td>
            <td>
                <div class="average-score ${scoreClass}">${subject.averageScore.toFixed(1)}</div>
            </td>
            <td>
                <div class="action-buttons">
                    <a href="${detailsUrl}" class="action-btn view-btn" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                        Xem chi tiết
                    </a>
                    <button class="action-btn export-btn subject-export-btn"
                            title="Xuất Excel"
                            data-subject-code="${escapeHtml(subject.code)}"
                            data-subject-name="${escapeHtml(subject.name)}">
                        <i class="fas fa-file-excel"></i>
                        Xuất Excel
                    </button>
                </div>
            </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".subject-export-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const code = btn.dataset.subjectCode;
      const name = btn.dataset.subjectName;
      teacherResultsExportSubject(code, name);
    });
  });

  updatePaginationControls(subjects.length);
}

function getScoreClass(score) {
  if (score >= 8.5) return "score-excellent";
  if (score >= 7.0) return "score-good";
  if (score >= 5.5) return "score-fair";
  return "score-average";
}

function setupFiltersAndSorting() {
  const searchInput = document.getElementById("subjectSearch");
  const scoreFilter = document.getElementById("scoreFilter");
  const sortableHeaders = document.querySelectorAll(".results-table th.sortable");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      teacherResultsState.filters.search = event.target.value.toLowerCase().trim();
      teacherResultsState.pagination.currentPage = 1;
      applyFiltersAndSorting();
    });
  }

  if (scoreFilter) {
    scoreFilter.addEventListener("change", (event) => {
      teacherResultsState.filters.score = event.target.value;
      teacherResultsState.pagination.currentPage = 1;
      applyFiltersAndSorting();
    });
  }

  sortableHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const column = this.dataset.column;
      if (teacherResultsState.sort.column === column) {
        teacherResultsState.sort.direction =
          teacherResultsState.sort.direction === "asc" ? "desc" : "asc";
      } else {
        teacherResultsState.sort.column = column;
        teacherResultsState.sort.direction = "asc";
      }

      sortableHeaders.forEach((h) => {
        const icon = h.querySelector(".sort-icon");
        icon.className = "fas fa-sort sort-icon";
      });

      const icon = this.querySelector(".sort-icon");
      icon.className =
        teacherResultsState.sort.direction === "asc"
          ? "fas fa-sort-up sort-icon active"
          : "fas fa-sort-down sort-icon active";

      teacherResultsState.pagination.currentPage = 1;
      applyFiltersAndSorting();
    });
  });
}

function applyFiltersAndSorting() {
  const { search, score } = teacherResultsState.filters;

  let subjects = teacherResultsState.subjects.filter((subject) => {
    const matchesSearch =
      !search ||
      subject.code.toLowerCase().includes(search) ||
      subject.name.toLowerCase().includes(search);

    let matchesScore = true;
    if (score) {
      const bucket = getGradeBucket(subject.averageScore);
      matchesScore = bucket === score;
    }

    return matchesSearch && matchesScore;
  });

  const { column, direction } = teacherResultsState.sort;
  subjects = subjects.sort((a, b) => {
    let aValue;
    let bValue;

    switch (column) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "examCount":
        aValue = a.examCount;
        bValue = b.examCount;
        break;
      case "average":
        aValue = a.averageScore;
        bValue = b.averageScore;
        break;
      case "code":
      default:
        aValue = a.code.toLowerCase();
        bValue = b.code.toLowerCase();
    }

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  teacherResultsState.filteredSubjects = subjects;
  renderSubjectTable();
}

function updatePaginationControls(totalItems) {
  const { perPage, currentPage } = teacherResultsState.pagination;
  const container = document.getElementById("paginationContainer");
  const paginationList = document.getElementById("paginationList");
  const totalItemsSpan = document.getElementById("totalItems");
  const currentRangeSpan = document.getElementById("currentRange");

  if (!container || !paginationList || !totalItemsSpan || !currentRangeSpan) {
    return;
  }

  const totalPages = Math.ceil(totalItems / perPage);
  if (totalPages <= 1) {
    container.style.display = "none";
    currentRangeSpan.textContent = totalItems > 0 ? `1-${totalItems}` : "0-0";
    totalItemsSpan.textContent = totalItems;
    return;
  }

  container.style.display = "flex";

  const startRange = (currentPage - 1) * perPage + 1;
  const endRange = Math.min(currentPage * perPage, totalItems);
  currentRangeSpan.textContent = `${startRange}-${endRange}`;
  totalItemsSpan.textContent = totalItems;

  paginationList.innerHTML = "";

  for (let page = 1; page <= totalPages; page++) {
    const li = document.createElement("li");
    li.className = `page-item ${page === currentPage ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#" data-page="${page}">${page}</a>`;
    li.querySelector("a").addEventListener("click", (event) => {
      event.preventDefault();
      teacherResultsState.pagination.currentPage = page;
      renderSubjectTable();
    });
    paginationList.appendChild(li);
  }
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

window.teacherResultsExportSubject = function (subjectCode, subjectName) {
  alert(
    `Chức năng xuất Excel cho môn "${subjectName}" (${subjectCode}) đang được phát triển.\n\n` +
      "Sau khi tích hợp, file sẽ bao gồm:\n- Thông tin môn học\n- Danh sách bài thi\n- Bảng điểm chi tiết\n- Biểu đồ thống kê"
  );
};

window.exportAllResults = function () {
  alert(
    "Chức năng xuất toàn bộ báo cáo đang được phát triển.\n\n" +
      "Sau khi tích hợp, báo cáo Excel sẽ bao gồm:\n- Tổng quan thống kê\n- Chi tiết từng môn học\n- Danh sách học sinh\n- Biểu đồ phân tích"
  );
};

