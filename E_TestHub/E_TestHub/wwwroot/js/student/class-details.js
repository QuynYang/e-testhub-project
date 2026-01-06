const STUDENT_DETAILS_API_BASE_URL = "https://e-testhub-project.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  initializeClassDetailsPage();
});

async function initializeClassDetailsPage() {
  const classId = getClassIdFromQuery();
  if (!classId) {
    renderHeaderError("Không tìm thấy mã lớp học trong đường dẫn.");
    return;
  }

  setLoadingState();

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    const classData = await fetchClassDetails(classId, token);

    let teacher = null;
    if (classData.teacherId) {
      try {
        teacher = await fetchUserById(classData.teacherId, token);
      } catch (error) {
        console.warn("Không thể tải thông tin giảng viên:", error);
      }
    }

    const enrichedStudents = await buildStudentList(classData, token);

    renderClassHeader(classData, teacher);
    renderStats(enrichedStudents, teacher);
    initializeStudentTable(enrichedStudents);
  } catch (error) {
    console.error("Không thể tải chi tiết lớp học:", error);
    renderHeaderError(error?.message || "Không thể tải thông tin lớp học.");
    renderStudentsError(error?.message || "Không thể tải danh sách sinh viên.");
  }
}

function getClassIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("classId") || params.get("classid");
}

function getToken() {
  return localStorage.getItem("token");
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

async function fetchClassDetails(classId, token) {
  const response = await fetch(
    `${STUDENT_DETAILS_API_BASE_URL}/classes/${classId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let message = "Không thể tải thông tin lớp học.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (error) {
      // ignore parse error
    }
    throw new Error(message);
  }

  return await response.json();
}

async function fetchUserById(userId, token) {
  const normalizedId = normalizeId(userId);
  if (!normalizedId) throw new Error("ID người dùng không hợp lệ.");

  const response = await fetch(
    `${STUDENT_DETAILS_API_BASE_URL}/users/${normalizedId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let message = "Không thể tải thông tin người dùng.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (error) {
      // ignore parse error
    }
    throw new Error(message);
  }

  return await response.json();
}

async function fetchAllStudents(token) {
  const response = await fetch(`${STUDENT_DETAILS_API_BASE_URL}/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách sinh viên.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (error) {
      // ignore parse error
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];
}

async function buildStudentList(classData, token) {
  const rawStudents = Array.isArray(classData.students)
    ? classData.students
    : [];

  const normalized = rawStudents
    .map((student) => normalizeStudent(student))
    .filter((student) => student !== null);

  const missingDetails = normalized.some((student) => !student.email);

  if (!missingDetails) {
    return normalized;
  }

  try {
    const allUsers = await fetchAllStudents(token);
    const studentMap = new Map(
      allUsers
        .filter(
          (user) =>
            user.role === "student" ||
            user.role === "Student" ||
            user.role === "student".toUpperCase()
        )
        .map((user) => [normalizeId(user), user])
    );

    return rawStudents
      .map((student) => {
        const normalizedId = normalizeId(student);
        if (!normalizedId) return null;
        const info = studentMap.get(normalizedId);
        return normalizeStudent(info || student);
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Không thể bổ sung thông tin sinh viên:", error);
    return normalized;
  }
}

function normalizeStudent(raw) {
  if (!raw) return null;
  const id =
    normalizeId(raw.studentId) ||
    normalizeId(raw._id) ||
    normalizeId(raw.id) ||
    normalizeId(raw);
  if (!id) return null;

  const firstName = raw.firstName || "";
  const lastName = raw.lastName || "";
  const fullName = raw.fullName || `${firstName} ${lastName}`.trim();

  return {
    id,
    name: fullName || raw.name || raw.displayName || "Sinh viên",
    email: raw.email || "",
  };
}

function renderClassHeader(classData, teacher) {
  const classNameEl = document.getElementById("className");
  const classTeacherEl = document.getElementById("classTeacher");
  const classYearEl = document.getElementById("classYear");
  const classSubjectEl = document.getElementById("classSubject");
  const classCodeBadge = document.getElementById("classCodeBadge");

  if (classNameEl) {
    classNameEl.textContent =
      classData.name || classData.classCode || "Không xác định";
  }

  if (classTeacherEl) {
    if (teacher) {
      const teacherName =
        teacher.fullName ||
        `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
        teacher.email ||
        "Giảng viên";
      classTeacherEl.textContent = teacherName;
    } else if (classData.teacherName) {
      classTeacherEl.textContent = classData.teacherName;
    } else {
      classTeacherEl.textContent = "Chưa cập nhật";
    }
  }

  if (classYearEl) {
    classYearEl.textContent = formatAcademicYear(classData.academicYear);
  }

  if (classSubjectEl) {
    classSubjectEl.textContent =
      classData.subject ||
      classData.subjectName ||
      classData.courseName ||
      "Chưa cập nhật";
  }

  if (classCodeBadge) {
    const code = classData.classCode || classData.code;
    if (code) {
      classCodeBadge.style.display = "inline-block";
      classCodeBadge.textContent = `Mã lớp: ${code}`;
    } else {
      classCodeBadge.style.display = "none";
    }
  }
}

function renderStats(students, teacher) {
  const totalStudentsCount = document.getElementById("totalStudentsCount");
  const visibleStudentsCount = document.getElementById("visibleStudentsCount");
  const teacherCount = document.getElementById("teacherCount");

  const total = Array.isArray(students) ? students.length : 0;

  if (totalStudentsCount) {
    totalStudentsCount.textContent = total.toString();
  }
  if (visibleStudentsCount) {
    visibleStudentsCount.textContent = total.toString();
  }
  if (teacherCount) {
    teacherCount.textContent = teacher ? "1" : "0";
  }
}

function initializeStudentTable(students) {
  const tableBody = document.getElementById("studentsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!Array.isArray(students) || students.length === 0) {
    renderStudentsEmpty();
    updatePaginationInfo(0, 0, 0);
    return;
  }

  const state = {
    students,
    filtered: [...students],
    currentPage: 1,
    itemsPerPage: 10,
  };

  const searchInput = document.getElementById("studentSearch");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((event) => {
        const value = event.target.value.toLowerCase().trim();
        state.filtered = state.students.filter(
          (student) =>
            student.id.toLowerCase().includes(value) ||
            student.name.toLowerCase().includes(value) ||
            (student.email || "").toLowerCase().includes(value)
        );
        state.currentPage = 1;
        renderStudentRows(state);
      }, 150)
    );
  }

  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", (event) => {
      const value = event.target.value;
      state.itemsPerPage = value === "all" ? "all" : parseInt(value, 10);
      state.currentPage = 1;
      renderStudentRows(state);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        renderStudentRows(state);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = computeTotalPages(state);
      if (state.currentPage < totalPages) {
        state.currentPage += 1;
        renderStudentRows(state);
      }
    });
  }

  renderStudentRows(state);
}

function renderStudentRows(state) {
  const tableBody = document.getElementById("studentsTableBody");
  const noResultsMessage = document.getElementById("noResultsMessage");
  const paginationControls = document.getElementById("paginationControls");

  if (!tableBody) return;

  tableBody.innerHTML = "";

  const totalItems = state.filtered.length;

  if (totalItems === 0) {
    if (noResultsMessage) noResultsMessage.style.display = "flex";
    if (paginationControls) paginationControls.style.display = "none";
    updatePaginationInfo(0, 0, 0);
    updateVisibleStudentsCount(0);
    return;
  }

  if (noResultsMessage) noResultsMessage.style.display = "none";

  const totalPages = computeTotalPages(state);
  if (paginationControls) {
    paginationControls.style.display =
      state.itemsPerPage === "all" || totalPages <= 1 ? "none" : "flex";
  }

  const { startIndex, endIndex } = computePageRange(state);

  const pageItems =
    state.itemsPerPage === "all"
      ? state.filtered
      : state.filtered.slice(startIndex, endIndex);

  pageItems.forEach((student, index) => {
    const tr = document.createElement("tr");
    tr.dataset.studentId = student.id;
    tr.dataset.studentName = student.name;
    tr.innerHTML = `
        <td class="text-center">${state.itemsPerPage === "all" ? index + 1 : startIndex + index + 1}</td>
        <td>
            <div class="student-id">${escapeHtml(student.id)}</div>
        </td>
        <td>
            <div class="student-name">
                <i class="fas fa-user-circle student-avatar"></i>
                ${escapeHtml(student.name)}
            </div>
        </td>
        <td>
            <div class="student-email">
                <i class="fas fa-envelope"></i>
                ${escapeHtml(student.email || "—")}
            </div>
        </td>
        <td class="text-center">
            ${
              student.email
                ? `<a href="mailto:${encodeURIComponent(
                    student.email
                  )}" class="contact-btn" title="Gửi email cho ${escapeHtml(
                    student.name
                  )}">
                    <i class="fas fa-paper-plane"></i>
                </a>`
                : '<span class="text-muted">—</span>'
            }
        </td>
    `;
    tableBody.appendChild(tr);
  });

  renderPaginationNumbers(state, totalPages);
  updatePaginationInfo(
    state.itemsPerPage === "all" ? 1 : startIndex + 1,
    state.itemsPerPage === "all" ? totalItems : endIndex,
    totalItems
  );
  updateVisibleStudentsCount(totalItems);
}

function computeTotalPages(state) {
  if (state.itemsPerPage === "all") return 1;
  if (state.itemsPerPage <= 0) return 1;
  return Math.ceil(state.filtered.length / state.itemsPerPage);
}

function computePageRange(state) {
  if (state.itemsPerPage === "all") {
    return { startIndex: 0, endIndex: state.filtered.length };
  }
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = Math.min(startIndex + state.itemsPerPage, state.filtered.length);
  return { startIndex, endIndex };
}

function renderPaginationNumbers(state, totalPages) {
  const paginationNumbers = document.getElementById("paginationNumbers");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (!paginationNumbers || state.itemsPerPage === "all") return;

  paginationNumbers.innerHTML = "";

  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages;

  const maxButtons = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    paginationNumbers.appendChild(
      createPaginationButton(state, 1, "1")
    );
    if (startPage > 2) {
      paginationNumbers.appendChild(createPaginationDots());
    }
  }

  for (let page = startPage; page <= endPage; page += 1) {
    paginationNumbers.appendChild(
      createPaginationButton(state, page, page.toString())
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationNumbers.appendChild(createPaginationDots());
    }
    paginationNumbers.appendChild(
      createPaginationButton(state, totalPages, totalPages.toString())
    );
  }
}

function createPaginationButton(state, pageNumber, text) {
  const button = document.createElement("button");
  button.className = "pagination-number";
  button.textContent = text;
  if (pageNumber === state.currentPage) {
    button.classList.add("active");
  }
  button.addEventListener("click", () => {
    state.currentPage = pageNumber;
    renderStudentRows(state);
  });
  return button;
}

function createPaginationDots() {
  const span = document.createElement("span");
  span.className = "pagination-dots";
  span.textContent = "...";
  return span;
}

function renderStudentsEmpty() {
  const tableBody = document.getElementById("studentsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
        <td colspan="5" class="text-center">
            <div class="dashboard-empty">
                <i class="fas fa-user-slash"></i> Chưa có sinh viên trong lớp.
            </div>
        </td>
    </tr>
  `;
}

function renderStudentsError(message) {
  const tableBody = document.getElementById("studentsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
        <td colspan="5" class="text-center">
            <div class="dashboard-error">${escapeHtml(message)}</div>
        </td>
    </tr>
  `;
}

function renderHeaderError(message) {
  const classNameEl = document.getElementById("className");
  const classTeacherEl = document.getElementById("classTeacher");
  const classYearEl = document.getElementById("classYear");
  const classSubjectEl = document.getElementById("classSubject");

  if (classNameEl) classNameEl.textContent = "Không thể tải lớp học";
  if (classTeacherEl) classTeacherEl.textContent = "—";
  if (classYearEl) classYearEl.textContent = "—";
  if (classSubjectEl) classSubjectEl.textContent = "—";

  const container = document.getElementById("classInfoHeader");
  if (container) {
    const errorBanner = document.createElement("div");
    errorBanner.className = "dashboard-error mt-3";
    errorBanner.textContent = message;
    container.appendChild(errorBanner);
  }
}

function setLoadingState() {
  const classNameEl = document.getElementById("className");
  if (classNameEl) {
    classNameEl.textContent = "Đang tải lớp học...";
  }
  const studentsLoadingRow = document.getElementById("studentsLoadingRow");
  if (studentsLoadingRow) {
    studentsLoadingRow.style.display = "";
  }
}

function updatePaginationInfo(from, to, total) {
  const displayFrom = document.getElementById("displayFrom");
  const displayTo = document.getElementById("displayTo");
  const totalCount = document.getElementById("totalCount");

  if (displayFrom) displayFrom.textContent = from.toString();
  if (displayTo) displayTo.textContent = to.toString();
  if (totalCount) totalCount.textContent = total.toString();
}

function updateVisibleStudentsCount(count) {
  const visibleStudentsCount = document.getElementById("visibleStudentsCount");
  if (visibleStudentsCount) {
    visibleStudentsCount.textContent = count.toString();
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

function formatAcademicYear(value) {
  if (!value) return "Chưa cập nhật";
  if (typeof value === "string") {
    if (value.includes(" - ")) return value;
    if (value.includes("-")) return value.replace("-", " - ");
    return value;
  }
  if (typeof value === "object" && value.startYear && value.endYear) {
    return `${value.startYear} - ${value.endYear}`;
  }
  return value.toString();
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

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

