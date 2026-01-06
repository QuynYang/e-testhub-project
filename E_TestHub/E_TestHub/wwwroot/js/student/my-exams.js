const STUDENT_EXAMS_API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  initializeMyExamsPage();
});

async function initializeMyExamsPage() {
  setListLoadingState();

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    const student = await fetchCurrentStudent(token);
    const enrolledClasses = extractClassIds(student);

    const exams = await fetchStudentExams(token, student, enrolledClasses);

    renderExamsList(exams);
    setupListFilters(exams);
    setupCalendarView(exams);
  } catch (error) {
    console.error("Không thể tải danh sách bài thi:", error);
    renderExamsError(error?.message || "Không thể tải danh sách bài thi.");
  }
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

async function fetchCurrentStudent(token) {
  const storedUser = getStoredUser();
  const userId = normalizeId(
    storedUser?.id || storedUser?._id || storedUser?.userId
  );

  if (!userId) {
    throw new Error("Không tìm thấy thông tin sinh viên. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${STUDENT_EXAMS_API_BASE_URL}/users/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải thông tin sinh viên.";
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

function extractClassIds(student) {
  if (!student) return [];

  const rawValues = [
    student.classId,
    student.classes,
    student.classIds,
    student.enrolledClasses,
  ];

  const flattened = rawValues
    .map((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return [value];
    })
    .flat();

  const normalized = flattened
    .map((value) => normalizeId(value?.classId || value?.class || value))
    .filter(Boolean);

  return [...new Set(normalized)];
}

async function fetchStudentExams(token, student, classIds) {
  const response = await fetch(`${STUDENT_EXAMS_API_BASE_URL}/exams`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách bài thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (error) {
      // ignore parse error
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const exams = unwrapListResponse(payload).map(normalizeExam);

  const studentId = normalizeId(student?.id || student?._id);
  const classIdSet = new Set((classIds || []).map((id) => normalizeId(id)));

  const filtered = exams.filter((exam) => {
    const isAssignedToStudent = exam.allowedStudents.some(
      (id) => normalizeId(id) === studentId
    );

    const sharesClass =
      classIdSet.size === 0 ||
      exam.classIds.some((classId) => classIdSet.has(normalizeId(classId)));

    return isAssignedToStudent || sharesClass;
  });

  return filtered;
}

function normalizeExam(raw) {
  const openAt = raw.openAt || raw.startTime || raw.availableFrom;
  const closeAt = raw.closeAt || raw.endTime || raw.availableTo;

  const rawClasses = Array.isArray(raw.classIds) ? raw.classIds : [];
  const mappedClassIds = rawClasses.map((cls) =>
    normalizeId(
      typeof cls === "object"
        ? cls?._id || cls?.id || cls?.classId || cls?.class || cls
        : cls
    )
  );
  const additionalClassIds = [
    normalizeId(raw.classId),
    normalizeId(raw.class),
    normalizeId(raw.classInfo),
  ].filter(Boolean);
  const classIds = [
    ...new Set([...mappedClassIds.filter(Boolean), ...additionalClassIds]),
  ];
  const classNames = rawClasses
    .map((cls) => {
      if (!cls || typeof cls !== "object") return null;
      return (
        cls.name ||
        cls.className ||
        cls.classTitle ||
        cls.classCode ||
        cls.title ||
        cls.subjectName ||
        null
      );
    })
    .filter(Boolean);

  const allowedStudents = Array.isArray(raw.assignedStudents)
    ? raw.assignedStudents
    : Array.isArray(raw.students)
    ? raw.students
    : Array.isArray(raw.participantIds)
    ? raw.participantIds
    : [];

  return {
    id: normalizeId(raw._id || raw.id),
    title: raw.title || raw.name || "Không có tiêu đề",
    subject:
      raw.subject ||
      raw.subjectName ||
      raw.courseName ||
      raw.topic ||
      classNames[0] ||
      "Chưa cập nhật",
    duration: Number(raw.duration || raw.timeLimit || 0),
    openAt: openAt ? new Date(openAt) : null,
    closeAt: closeAt ? new Date(closeAt) : null,
    status: computeExamStatus({
      isPublished: raw.isPublished,
      openAt,
      closeAt,
    }),
    classIds,
    allowedStudents,
  };
}

function computeExamStatus({ isPublished, openAt, closeAt }) {
  if (!isPublished && isPublished !== undefined) {
    return { code: "draft", label: "Nháp" };
  }

  const now = new Date();
  const open = openAt ? new Date(openAt) : null;
  const close = closeAt ? new Date(closeAt) : null;

  if (open && now < open) {
    return { code: "upcoming", label: "Sắp diễn ra" };
  }

  if (close && now > close) {
    return { code: "completed", label: "Đã kết thúc" };
  }

  if (open && now >= open && (!close || now <= close)) {
    return { code: "in-progress", label: "Đang diễn ra" };
  }

  if (!open) {
    return { code: "upcoming", label: "Sắp diễn ra" };
  }

  return { code: "upcoming", label: "Sắp diễn ra" };
}

function unwrapListResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const keys = ["data", "items", "results", "list", "value"];
  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  if (payload.data && typeof payload.data === "object") {
    for (const key of keys) {
      if (Array.isArray(payload.data[key])) {
        return payload.data[key];
      }
    }
  }

  return [];
}

function setListLoadingState() {
  const tableBody = document.getElementById("examTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
        <td colspan="6" class="text-center">
            <div class="dashboard-loading-inline">
                <i class="fas fa-spinner fa-spin"></i> Đang tải lịch thi...
            </div>
        </td>
    </tr>
  `;
}

function renderExamsError(message) {
  const tableBody = document.getElementById("examTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
        <td colspan="6">
            <div class="dashboard-error text-center">${escapeHtml(message)}</div>
        </td>
    </tr>
  `;
  renderEmptyCalendar(message);
}

function renderExamsList(exams) {
  const tableBody = document.getElementById("examTableBody");
  if (!tableBody) return;

  if (!Array.isArray(exams) || exams.length === 0) {
    tableBody.innerHTML = `
      <tr>
          <td colspan="6">
              <div class="dashboard-empty text-center">
                  <i class="fas fa-calendar-times"></i>
                  Bạn chưa có bài thi nào.
              </div>
          </td>
      </tr>
    `;
    renderEmptyCalendar("Chưa có bài thi nào.");
    return;
  }

  const sorted = [...exams].sort((a, b) => {
    const statusOrder = { "in-progress": 0, upcoming: 1, completed: 2 };
    const statusA = statusOrder[a.status.code] ?? 3;
    const statusB = statusOrder[b.status.code] ?? 3;
    if (statusA !== statusB) return statusA - statusB;

    const timeA = (a.openAt || new Date(0)).getTime();
    const timeB = (b.openAt || new Date(0)).getTime();
    return timeA - timeB;
  });

  tableBody.innerHTML = sorted
    .map((exam) => createExamRowHtml(exam))
    .join("");
}

function createExamRowHtml(exam) {
  const dateText = exam.openAt
    ? formatDate(exam.openAt)
    : exam.closeAt
    ? formatDate(exam.closeAt)
    : "Chưa cập nhật";
  const durationText = formatDuration(exam.duration);

  return `
    <tr class="exam-row" data-exam-id="${escapeHtml(exam.id)}" data-status="${
    exam.status.code
  }" data-date="${exam.openAt ? exam.openAt.toISOString() : ""}">
        <td class="exam-name">
            <div class="name">${escapeHtml(exam.title)}</div>
        </td>
        <td class="subject-name">${escapeHtml(exam.subject)}</td>
        <td class="exam-date">${dateText}</td>
        <td class="exam-duration">${durationText}</td>
        <td>
            <span class="exam-status-badge status-${exam.status.code}">
                ${escapeHtml(exam.status.label)}
            </span>
        </td>
        <td class="text-right">
            ${
              exam.status.code === "in-progress"
                ? `<a href="/Student/ExamInfo?examId=${encodeURIComponent(
                    exam.id
                  )}" class="exam-action-btn primary">
                        <i class="fas fa-play"></i> Vào thi
                   </a>`
                : `<a href="/Student/ExamInfo?examId=${encodeURIComponent(
                    exam.id
                  )}" class="exam-action-btn secondary">
                        <i class="fas fa-info-circle"></i> Chi tiết
                   </a>`
            }
        </td>
    </tr>
  `;
}

function setupListFilters(exams) {
  const searchInput = document.getElementById("examSearch");
  if (!searchInput) return;

  const tableBody = document.getElementById("examTableBody");
  if (!tableBody) return;

  searchInput.addEventListener(
    "input",
    debounce((event) => {
      const value = event.target.value.toLowerCase().trim();
      const rows = Array.from(tableBody.querySelectorAll(".exam-row"));

      let visibleCount = 0;
      rows.forEach((row) => {
        const examName = row
          .querySelector(".exam-name .name")
          .textContent.toLowerCase();
        const subject = row
          .querySelector(".subject-name")
          .textContent.toLowerCase();

        const matches =
          !value || examName.includes(value) || subject.includes(value);
        row.style.display = matches ? "" : "none";
        if (matches) visibleCount += 1;
      });

      const existingMessage = document.querySelector(".no-results-message");
      if (existingMessage) {
        existingMessage.remove();
      }

      if (visibleCount === 0) {
        const row = document.createElement("tr");
        row.className = "no-results-message";
        row.innerHTML = `
          <td colspan="6" style="text-align: center; padding: 40px; color: #666; font-style: italic;">
              <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
              Không tìm thấy bài thi nào phù hợp
          </td>
        `;
        tableBody.appendChild(row);
      }
    }, 150)
  );
}

function setupCalendarView(exams) {
  const toggleBtn = document.getElementById("toggleCalendarView");
  const calendarView = document.getElementById("calendarView");
  const listView = document.getElementById("listView");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const closeSidebarBtn = document.getElementById("closeSidebar");

  if (!toggleBtn || !calendarView || !listView) return;

  let isCalendarVisible = false;

  const today = new Date();
  const state = {
    currentMonth: today.getMonth(),
    currentYear: today.getFullYear(),
    exams: exams.map((exam) => ({
      ...exam,
      openAt: exam.openAt ? new Date(exam.openAt) : null,
      closeAt: exam.closeAt ? new Date(exam.closeAt) : null,
    })),
  };

  toggleBtn.addEventListener("click", () => {
    isCalendarVisible = !isCalendarVisible;
    if (isCalendarVisible) {
      calendarView.style.display = "block";
      listView.style.display = "none";
      toggleBtn.innerHTML =
        '<i class="fas fa-list"></i><span>Xem ở dạng danh sách</span>';
      renderCalendar(state);
    } else {
      calendarView.style.display = "none";
      listView.style.display = "block";
      toggleBtn.innerHTML =
        '<i class="fas fa-calendar-alt"></i><span>Xem ở dạng lịch</span>';
    }
  });

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      state.currentMonth -= 1;
      if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear -= 1;
      }
      renderCalendar(state);
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      state.currentMonth += 1;
      if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear += 1;
      }
      renderCalendar(state);
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => {
      const sidebar = document.getElementById("examDetailsSidebar");
      if (sidebar) sidebar.style.display = "none";
    });
  }

  renderCalendar(state);
}

function renderCalendar(state) {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthYearLabel = document.getElementById("currentMonthYear");

  if (!calendarGrid || !monthYearLabel) return;

  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  monthYearLabel.innerHTML = `${monthNames[state.currentMonth]} <span class="year-highlight">${state.currentYear}</span>`;

  const firstDay = new Date(state.currentYear, state.currentMonth, 1);
  const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();

  const existingDays = calendarGrid.querySelectorAll(
    ".calendar-day, .calendar-day.empty"
  );
  existingDays.forEach((day) => day.remove());

  for (let i = 0; i < startDayOfWeek; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  const today = new Date();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";

    const currentDate = new Date(state.currentYear, state.currentMonth, day);

    if (currentDate.toDateString() === today.toDateString()) {
      dayCell.classList.add("today");
    }

    const examsOnDay = state.exams.filter((exam) =>
      exam.openAt
        ? isSameDay(exam.openAt, currentDate)
        : exam.closeAt && isSameDay(exam.closeAt, currentDate)
    );

    if (examsOnDay.length > 0) {
      dayCell.classList.add("has-exam");
      dayCell.dataset.examCount = examsOnDay.length.toString();
      dayCell.addEventListener("click", () => {
        showExamDetailsSidebar(examsOnDay, currentDate);
      });
    }

    dayCell.innerHTML = `<span class="day-number">${day}</span>`;

    if (examsOnDay.length > 0) {
      dayCell.innerHTML += `<span class="exam-indicator">${examsOnDay.length} kỳ thi</span>`;
    }

    calendarGrid.appendChild(dayCell);
  }
}

function showExamDetailsSidebar(exams, date) {
  const sidebar = document.getElementById("examDetailsSidebar");
  const content = document.getElementById("sidebarContent");
  if (!sidebar || !content) return;

  const dateHeader = `<h4>${formatFullDate(date)}</h4>`;

  const cards = exams
    .map((exam) => {
      const statusClass = `status-${exam.status.code}`;
      return `
        <div class="exam-detail-card">
            <h5>${escapeHtml(exam.title)}</h5>
            <div class="exam-detail-info">
                <p><strong>Môn học:</strong> ${escapeHtml(exam.subject)}</p>
                <p><strong>Thời gian:</strong> ${formatDuration(exam.duration)}</p>
                <p><strong>Trạng thái:</strong> <span class="exam-status ${statusClass}">${escapeHtml(
        exam.status.label
      )}</span></p>
            </div>
            <div class="exam-detail-actions">
                <a href="/Student/ExamInfo?examId=${encodeURIComponent(
                  exam.id
                )}" class="exam-action-btn ${
        exam.status.code === "in-progress" ? "primary" : "secondary"
      }">
                    ${
                      exam.status.code === "in-progress"
                        ? '<i class="fas fa-play"></i> Vào thi'
                        : '<i class="fas fa-info-circle"></i> Chi tiết'
                    }
                </a>
            </div>
        </div>
      `;
    })
    .join("");

  content.innerHTML = dateHeader + cards;
  sidebar.style.display = "block";
}

function renderEmptyCalendar(message) {
  const calendarGrid = document.getElementById("calendarGrid");
  if (!calendarGrid) return;

  const existingDays = calendarGrid.querySelectorAll(
    ".calendar-day, .calendar-day.empty"
  );
  existingDays.forEach((day) => day.remove());

  const emptyState = document.createElement("div");
  emptyState.className = "calendar-empty-state";
  emptyState.innerHTML = `
    <i class="fas fa-calendar-times"></i>
    <p>${escapeHtml(message)}</p>
  `;
  calendarGrid.appendChild(emptyState);
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "object") {
    const nested = value?.id || value?._id || value?.value;
    if (nested) return nested.toString();
    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str && str !== "[object Object]") return str;
    }
  }
  return null;
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

function formatFullDate(date) {
  if (!date) return "Chưa cập nhật";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "Chưa cập nhật";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
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

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

