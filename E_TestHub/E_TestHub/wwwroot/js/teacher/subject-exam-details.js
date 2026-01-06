const SUBJECT_DETAILS_API_BASE_URL = "http://localhost:3000/api";
const SUBJECT_EXAMS_ENDPOINT = `${SUBJECT_DETAILS_API_BASE_URL}/exams`;
const SUBJECT_EXAM_RESULTS_ENDPOINT = `${SUBJECT_DETAILS_API_BASE_URL}/exam-results`;
const SUBJECT_USERS_ENDPOINT = `${SUBJECT_DETAILS_API_BASE_URL}/users`;

const subjectDetailsState = {
  token: null,
  teacherId: null,
  subjectCode: null,
  subjectName: null,
  exams: [],
  students: [],
  filteredStudents: [],
  gradeDistribution: {
    excellent: 0,
    good: 0,
    fair: 0,
    average: 0,
    poor: 0,
  },
  filters: {
    search: "",
    grade: "",
  },
  pagination: {
    currentPage: 1,
    perPage: 10,
  },
  studentMap: new Map(),
  examColumns: [],
};

document.addEventListener("DOMContentLoaded", () => {
  initializeSubjectExamDetailsPage();
});

async function initializeSubjectExamDetailsPage() {
  const container = document.getElementById("subjectExamDetailsContainer");
  if (!container) return;

  subjectDetailsState.subjectCode =
    container.getAttribute("data-subject-code") || "";

  if (!subjectDetailsState.subjectCode) {
    showSubjectError("Không tìm thấy mã môn học hợp lệ.");
    return;
  }

  try {
    showSubjectLoading();

    subjectDetailsState.token = getToken();
    const teacherInfo = getCurrentTeacher();
    if (!subjectDetailsState.token || !teacherInfo?.id) {
      throw new Error("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.");
    }

    subjectDetailsState.teacherId = teacherInfo.id;

    const exams = await fetchTeacherExamsForSubject();
    subjectDetailsState.exams = exams;

    if (!Array.isArray(exams) || exams.length === 0) {
      showSubjectError("Không tìm thấy bài thi nào cho môn học này.");
      return;
    }

    subjectDetailsState.subjectName =
      determineSubjectName(exams) || subjectDetailsState.subjectCode;

    renderSubjectHeader();
    renderExamCards();

    await buildStudentResults();
    // Update header with calculated average after building student results
    updateSubjectAverageScore();
    // Update exam cards with actual student count who took the exam
    updateExamCardsWithStudentCount();
    renderStudentTable();
    setupSubjectFilters();

    hideSubjectLoading();
  } catch (error) {
    console.error("Không thể tải chi tiết môn học:", error);
    showSubjectError(error?.message || "Không thể tải dữ liệu môn học.");
  }
}

function getToken() {
  return localStorage.getItem("token");
}

function getCurrentTeacher() {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return {
      id: normalizeId(user?.id || user?._id || user?.userId),
      email: user?.email,
      role: user?.role,
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

function showSubjectLoading() {
  const message = document.getElementById("subjectDetailsMessage");
  if (message) {
    message.style.display = "none";
    message.classList.remove("error");
    message.textContent = "";
  }

  const headerName = document.getElementById("subjectName");
  if (headerName) {
    headerName.innerHTML = '<i class="fas fa-book"></i> Đang tải thông tin môn học...';
  }

  document.getElementById("subjectExamCount").textContent = "...";
  document.getElementById("subjectAverageScore").textContent = "...";

  const examCards = document.getElementById("subjectExamCards");
  if (examCards) {
    examCards.innerHTML = `
      <div class="exam-card loading-card">
        <div class="exam-card-body" style="text-align:center; color:#666;">
          <i class="fas fa-spinner fa-spin"></i> Đang tải danh sách bài thi...
        </div>
      </div>
    `;
  }

  const tableBody = document.getElementById("studentResultsTableBody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px; color:#666;">
          <i class="fas fa-spinner fa-spin"></i> Đang tải bảng điểm...
        </td>
      </tr>
    `;
  }
}

function hideSubjectLoading() {
  const message = document.getElementById("subjectDetailsMessage");
  if (message) {
    message.style.display = "none";
    message.classList.remove("error");
    message.textContent = "";
  }
}

function showSubjectError(message) {
  const messageBox = document.getElementById("subjectDetailsMessage");
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.classList.add("error");
    messageBox.style.display = "block";
  }

  const tableBody = document.getElementById("studentResultsTableBody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px; color:#dc3545;">
          ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }

  const examCards = document.getElementById("subjectExamCards");
  if (examCards) {
    examCards.innerHTML = `
      <div class="exam-card error-card">
        <div class="exam-card-body" style="text-align:center; color:#dc3545;">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
  }
}

async function fetchTeacherExamsForSubject() {
  const token = subjectDetailsState.token;
  const response = await fetch(SUBJECT_EXAMS_ENDPOINT, {
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
      // ignore
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const examsRaw = unwrapListResponse(payload);

  return examsRaw
    .map(normalizeExamForSubject)
    .filter((exam) => belongsToSubject(exam, subjectDetailsState.subjectCode))
    .filter(
      (exam) =>
        !subjectDetailsState.teacherId ||
        exam.teacherId === subjectDetailsState.teacherId
    );
}

function normalizeExamForSubject(raw) {
  const teacherId = normalizeId(raw.teacherId || raw.teacher?._id || raw.teacher);
  const classDocs = Array.isArray(raw.classIds) ? raw.classIds : raw.classes || [];
  const classes = classDocs.map((cls) => ({
    id: normalizeId(cls._id || cls.id || cls),
    code: cls.classCode || cls.code || cls.name || "N/A",
    name: cls.name || cls.classCode || "Không xác định",
    studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
  }));

  return {
    id: normalizeId(raw._id || raw.id),
    title: raw.title || raw.name || "Không có tiêu đề",
    teacherId,
    classes,
    duration: Number(raw.duration || raw.timeLimit || 0),
    studentCount: Number(raw.studentCount || raw.maxParticipants || 0),
    scheduledDate: raw.openAt || raw.startTime || raw.availableFrom,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
  };
}

function belongsToSubject(exam, subjectCode) {
  if (!subjectCode) return true;
  const codeLower = subjectCode.toLowerCase();

  if (exam.classes && exam.classes.length > 0) {
    const match = exam.classes.some((cls) => {
      const code = (cls.code || cls.name || "").toLowerCase();
      return code.includes(codeLower);
    });
    if (match) return true;
  }

  if (exam.title && exam.title.toLowerCase().includes(codeLower)) {
    return true;
  }

  return false;
}

function determineSubjectName(exams) {
  for (const exam of exams) {
    if (exam.classes && exam.classes.length > 0) {
      const cls = exam.classes[0];
      if (cls.name) return cls.name;
    }
  }
  if (exams.length > 0) {
    return exams[0].title;
  }
  return null;
}

function renderSubjectHeader() {
  const subjectNameEl = document.getElementById("subjectName");
  const subjectCodeEl = document.getElementById("subjectCodeValue");
  const examCountEl = document.getElementById("subjectExamCount");
  const averageScoreEl = document.getElementById("subjectAverageScore");

  if (subjectNameEl) {
    subjectNameEl.innerHTML = `<i class="fas fa-book"></i> ${escapeHtml(
      subjectDetailsState.subjectName || "Không xác định"
    )}`;
  }

  if (subjectCodeEl) {
    subjectCodeEl.textContent = subjectDetailsState.subjectCode || "N/A";
  }

  if (examCountEl) {
    examCountEl.textContent = subjectDetailsState.exams.length.toString();
  }

  // Calculate average score (will be updated later after student results are built)
  const overallAverage = calculateOverallAverageScore();
  if (averageScoreEl) {
    if (overallAverage > 0 || (subjectDetailsState.students && subjectDetailsState.students.length > 0)) {
      averageScoreEl.textContent = overallAverage.toFixed(1);
    } else {
      averageScoreEl.textContent = "Đang tính...";
    }
  }
}

function renderExamCards() {
  const container = document.getElementById("subjectExamCards");
  if (!container) return;

  const exams = subjectDetailsState.exams;
  if (!Array.isArray(exams) || exams.length === 0) {
    container.innerHTML = `
      <div class="exam-card empty-card">
        <div class="exam-card-body" style="text-align:center; color:#666;">
          Chưa có bài thi nào cho môn học này.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = exams
    .map((exam) => {
      const dateDisplay = exam.scheduledDate
        ? formatDate(exam.scheduledDate)
        : "Chưa có";
      const durationDisplay = exam.duration
        ? `${exam.duration} phút`
        : "Không xác định";
      const studentCount =
        exam.studentCount ||
        exam.classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);

      return `
        <div class="exam-card">
            <div class="exam-card-header">
                <h3 class="exam-card-title">${escapeHtml(exam.title)}</h3>
                <span class="exam-card-badge">${studentCount} sinh viên</span>
            </div>
            <div class="exam-card-body">
                <div class="exam-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${dateDisplay}</span>
                </div>
                <div class="exam-info-item">
                    <i class="fas fa-clock"></i>
                    <span>${durationDisplay}</span>
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}

async function buildStudentResults() {
  subjectDetailsState.studentMap.clear();
  const gradeDistribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    average: 0,
    poor: 0,
  };

  const examResultsCache = new Map();

  for (const exam of subjectDetailsState.exams) {
    try {
      const results = await fetchExamResultsForExam(exam.id);
      examResultsCache.set(exam.id, results);
    } catch (error) {
      console.warn(`Không thể tải kết quả cho bài thi ${exam.id}:`, error);
      examResultsCache.set(exam.id, []);
    }
  }

  const studentInfoCache = new Map();

  const ensureStudentInfo = async (studentId) => {
    if (!studentId) return null;
    if (studentInfoCache.has(studentId)) {
      return studentInfoCache.get(studentId);
    }

    try {
      const token = subjectDetailsState.token;
      const response = await fetch(`${SUBJECT_USERS_ENDPOINT}/${studentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể tải thông tin sinh viên");
      }

      const user = await response.json();
      const info = {
        fullName:
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          studentId,
      };

      studentInfoCache.set(studentId, info);
      return info;
    } catch (error) {
      console.warn(`Không thể lấy thông tin sinh viên ${studentId}:`, error);
      const info = { fullName: studentId };
      studentInfoCache.set(studentId, info);
      return info;
    }
  };

  const examColumns = [];

  for (const exam of subjectDetailsState.exams) {
    examColumns.push({
      id: exam.id,
      title: exam.title,
    });

    const examResults = examResultsCache.get(exam.id) || [];
    for (const result of examResults) {
      const studentId = normalizeId(
        result.studentId || result.student?.id || result.student?._id
      );
      if (!studentId) continue;

      const score = calculateNormalizedScore(result);
      if (!Number.isFinite(score)) continue;

      let studentEntry = subjectDetailsState.studentMap.get(studentId);
      if (!studentEntry) {
        const studentInfo = await ensureStudentInfo(studentId);
        studentEntry = {
          id: studentId,
          name: studentInfo?.fullName || studentId,
          scores: {},
          totalScore: 0,
          scoreCount: 0,
          average: 0,
          grade: "Yếu",
          gradeClass: "grade-average",
        };
        subjectDetailsState.studentMap.set(studentId, studentEntry);
      }

      studentEntry.scores[exam.id] = score;
      studentEntry.totalScore += score;
      studentEntry.scoreCount += 1;
    }
  }

  const students = Array.from(subjectDetailsState.studentMap.values()).map(
    (entry) => {
      entry.average =
        entry.scoreCount > 0 ? entry.totalScore / entry.scoreCount : 0;
      const bucket = getGradeBucket(entry.average);
      const { label, css } = getGradeInfo(bucket);
      entry.grade = label;
      entry.gradeClass = css;
      gradeDistribution[bucket]++;
      return entry;
    }
  );

  subjectDetailsState.gradeDistribution = gradeDistribution;
  subjectDetailsState.students = students.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  subjectDetailsState.filteredStudents = subjectDetailsState.students;
  subjectDetailsState.examColumns = examColumns;
}

function calculateOverallAverageScore() {
  const students = subjectDetailsState.students;
  if (!Array.isArray(students) || students.length === 0) return 0;
  
  // Calculate average based on all student scores across all exams
  let totalScore = 0;
  let totalCount = 0;
  
  students.forEach(student => {
    // Sum all scores from all exams for this student
    if (student.scores && typeof student.scores === 'object') {
      const studentScores = Object.values(student.scores).filter(score => Number.isFinite(score));
      totalScore += studentScores.reduce((sum, score) => sum + score, 0);
      totalCount += studentScores.length;
    }
  });
  
  // Return average of all scores, or fallback to student average if no scores
  if (totalCount > 0) {
    return totalScore / totalCount;
  }
  
  // Fallback: average of student averages
  const total = students.reduce((sum, student) => sum + (student.average || 0), 0);
  return students.length > 0 ? total / students.length : 0;
}

// Update subject average score in header
function updateSubjectAverageScore() {
  const averageScoreEl = document.getElementById("subjectAverageScore");
  if (!averageScoreEl) return;
  
  const overallAverage = calculateOverallAverageScore();
  averageScoreEl.textContent = overallAverage.toFixed(1);
  
  console.log('📊 Updated subject average score:', overallAverage.toFixed(1));
}

// Update exam cards with actual student count who took the exam
function updateExamCardsWithStudentCount() {
  const container = document.getElementById("subjectExamCards");
  if (!container) return;

  const examCards = container.querySelectorAll('.exam-card');
  if (examCards.length === 0) return;

  // Count students who took each exam from student results
  const examStudentCounts = new Map();
  
  subjectDetailsState.students.forEach(student => {
    if (student.scores && typeof student.scores === 'object') {
      Object.keys(student.scores).forEach(examId => {
        const score = student.scores[examId];
        if (Number.isFinite(score)) {
          const currentCount = examStudentCounts.get(examId) || 0;
          examStudentCounts.set(examId, currentCount + 1);
        }
      });
    }
  });

  // Update each exam card badge
  examCards.forEach((card, index) => {
    const exam = subjectDetailsState.exams[index];
    if (!exam) return;

    const badge = card.querySelector('.exam-card-badge');
    if (!badge) return;

    const actualCount = examStudentCounts.get(exam.id) || 0;
    badge.textContent = `${actualCount} sinh viên`;
    
    console.log(`📊 Updated exam card ${exam.id}: ${actualCount} students`);
  });
}

function calculateNormalizedScore(result) {
  if (!result) return null;

  const accuracy = Number(result.accuracy ?? result.percentage ?? result.percent);
  if (Number.isFinite(accuracy) && accuracy >= 0) {
    return Math.min(Math.max(accuracy / 10, 0), 10);
  }

  if (result.score) {
    const earned = Number(result.score.earned ?? result.score.value ?? result.score.score ?? 0);
    const total = Number(result.score.total ?? result.score.max ?? result.score.totalPoints ?? 0);
    if (Number.isFinite(earned) && Number.isFinite(total) && total > 0) {
      return Math.min(Math.max((earned / total) * 10, 0), 10);
    }
  }

  if (result.totals) {
    const correct = Number(result.totals.correct ?? 0);
    const totalQuestions = Number(result.totals.totalQuestions ?? result.totals.total ?? 0);
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
  if (score >= 9) return "excellent";
  if (score >= 8) return "good";
  if (score >= 6.5) return "fair";
  if (score >= 5) return "average";
  return "poor";
}

function getGradeInfo(bucket) {
  switch (bucket) {
    case "excellent":
      return { label: "Xuất sắc", css: "grade-excellent" };
    case "good":
      return { label: "Giỏi", css: "grade-good" };
    case "fair":
      return { label: "Khá", css: "grade-fair" };
    case "average":
      return { label: "Trung bình", css: "grade-average" };
    default:
      return { label: "Yếu", css: "grade-poor" };
  }
}

function renderStudentTable() {
  renderStudentTableHead();
  renderStudentTableBody();
  updateSubjectPaginationControls();
}

function renderStudentTableHead() {
  const thead = document.getElementById("studentResultsTableHead");
  if (!thead) return;

  const examColumns = subjectDetailsState.examColumns;
  const examHeaders = examColumns
    .map(
      (exam, index) => `<th>${escapeHtml(exam.title || `Bài thi ${index + 1}`)}</th>`
    )
    .join("");

  thead.innerHTML = `
    <tr>
        <th>MSSV</th>
        <th>Họ và tên</th>
        ${examHeaders}
        <th>Điểm TB</th>
        <th>Xếp loại</th>
        <th>Thao tác</th>
    </tr>
  `;
}

function renderStudentTableBody() {
  const tbody = document.getElementById("studentResultsTableBody");
  if (!tbody) return;

  const students = subjectDetailsState.filteredStudents;
  const { currentPage, perPage } = subjectDetailsState.pagination;
  const start = (currentPage - 1) * perPage;
  const pageItems = students.slice(start, start + perPage);

  if (!Array.isArray(pageItems) || pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${5 + subjectDetailsState.examColumns.length}" style="text-align:center; padding:40px; color:#666;">
          ${
            students.length === 0
              ? "Không có dữ liệu sinh viên."
              : "Không có sinh viên ở trang này."
          }
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageItems
    .map((student) => {
      const examCells = subjectDetailsState.examColumns
        .map((exam) => {
          const score =
            student.scores && Number.isFinite(student.scores[exam.id])
              ? student.scores[exam.id].toFixed(1)
              : "--";
          return `<td><div class="exam-score">${score}</div></td>`;
        })
        .join("");

      return `
        <tr data-student-id="${escapeHtml(student.id)}">
            <td><div class="student-id">${escapeHtml(student.id)}</div></td>
            <td><div class="student-name">${escapeHtml(student.name)}</div></td>
            ${examCells}
            <td><div class="average-score">${student.average.toFixed(1)}</div></td>
            <td><span class="grade-badge ${student.gradeClass}">${student.grade}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" data-student-id="${escapeHtml(
                      student.id
                    )}">
                        <i class="fas fa-eye"></i>
                        Xem chi tiết
                    </button>
                </div>
            </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".action-btn.view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert(
        "Tính năng xem chi tiết bài thi của sinh viên đang được phát triển."
      );
    });
  });
}

function setupSubjectFilters() {
  const searchInput = document.getElementById("studentSearch");
  const gradeFilter = document.getElementById("gradeFilter");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      subjectDetailsState.filters.search = event.target.value
        .toLowerCase()
        .trim();
      subjectDetailsState.pagination.currentPage = 1;
      applySubjectFilters();
    });
  }

  if (gradeFilter) {
    gradeFilter.addEventListener("change", (event) => {
      subjectDetailsState.filters.grade = event.target.value;
      subjectDetailsState.pagination.currentPage = 1;
      applySubjectFilters();
    });
  }
}

function applySubjectFilters() {
  const { search, grade } = subjectDetailsState.filters;

  subjectDetailsState.filteredStudents = subjectDetailsState.students.filter(
    (student) => {
      const matchesSearch =
        !search ||
        student.id.toLowerCase().includes(search) ||
        student.name.toLowerCase().includes(search);

      let matchesGrade = true;
      if (grade) {
        const bucket = getGradeBucket(student.average);
        matchesGrade = bucket === grade;
      }

      return matchesSearch && matchesGrade;
    }
  );

  subjectDetailsState.pagination.currentPage = 1;
  renderStudentTableBody();
  updateSubjectPaginationControls();
}

function updateSubjectPaginationControls() {
  const container = document.getElementById("paginationContainer");
  const paginationList = document.getElementById("paginationList");
  const totalItemsSpan = document.getElementById("totalItems");
  const currentRangeSpan = document.getElementById("currentRange");
  if (!container || !paginationList || !totalItemsSpan || !currentRangeSpan)
    return;

  const totalItems = subjectDetailsState.filteredStudents.length;
  const { perPage } = subjectDetailsState.pagination;
  const totalPages = Math.max(Math.ceil(totalItems / perPage), 1);

  if (totalItems <= perPage) {
    container.style.display = "none";
    const end = totalItems > 0 ? totalItems : 0;
    currentRangeSpan.textContent = totalItems > 0 ? `1-${end}` : "0-0";
    totalItemsSpan.textContent = totalItems;
    return;
  }

  container.style.display = "flex";

  const currentPage = subjectDetailsState.pagination.currentPage;
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
      subjectDetailsState.pagination.currentPage = page;
      renderStudentTableBody();
      updateSubjectPaginationControls();
    });
    paginationList.appendChild(li);
  }
}

async function fetchExamResultsForExam(examId) {
  const token = subjectDetailsState.token;
  const params = new URLSearchParams();
  params.set("examId", examId);

  const response = await fetch(
    `${SUBJECT_EXAM_RESULTS_ENDPOINT}?${params.toString()}`,
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
  
  // Handle different response formats
  if (Array.isArray(payload)) {
    return payload;
  }
  
  // Try to unwrap from common response structures
  if (payload.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  
  if (payload.results && Array.isArray(payload.results)) {
    return payload.results;
  }
  
  if (payload.items && Array.isArray(payload.items)) {
    return payload.items;
  }
  
  console.warn('⚠️ Unexpected exam results response format:', payload);
  return [];
}

function formatDate(dateString) {
  if (!dateString) return "Chưa có";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Chưa có";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return "Chưa có";
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

