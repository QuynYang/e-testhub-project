const STUDENT_API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  loadStudentDashboard();
});

async function loadStudentDashboard() {
  setRecentClassesLoading();
  setUpcomingExamsLoading();

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    const currentUser = await fetchCurrentUser();
    const userId = normalizeId(
      currentUser?.id || currentUser?._id || currentUser?.userId
    );

    const classIds = extractStudentClassIds(currentUser);

    const [classes, exams] = await Promise.all([
      fetchStudentClasses(classIds, userId),
      fetchUpcomingExams(classIds, userId),
    ]);

    renderRecentClasses(classes);
    renderUpcomingExams(exams);
  } catch (error) {
    console.error("Không thể tải dữ liệu dashboard sinh viên:", error);
    renderRecentClassesError(
      error?.message || "Không thể tải danh sách lớp học."
    );
    renderUpcomingExamsError(
      error?.message || "Không thể tải danh sách kỳ thi."
    );
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
    console.warn("Không thể đọc thông tin người dùng từ localStorage:", error);
    return null;
  }
}

async function fetchCurrentUser() {
  const token = getToken();
  if (!token) {
    throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
  }

  const storedUser = getStoredUser();
  const userId = normalizeId(
    storedUser?.id || storedUser?._id || storedUser?.userId
  );

  if (!userId) {
    throw new Error("Không tìm thấy ID sinh viên. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${STUDENT_API_BASE_URL}/users/${userId}`, {
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
    } catch (err) {
      // ignore parse error
    }
    throw new Error(message);
  }

  return await response.json();
}

function extractStudentClassIds(student) {
  if (!student) return [];

  const rawValues = [
    student.classId,
    student.classes,
    student.classIds,
    student.enrolledClasses,
  ].flat
    ? [student.classId, student.classes, student.classIds, student.enrolledClasses].flat()
    : []
        .concat(student.classId || [])
        .concat(student.classes || [])
        .concat(student.classIds || [])
        .concat(student.enrolledClasses || []);

  const normalized = (rawValues || [])
    .map((value) => normalizeId(value?.classId || value?.class || value))
    .filter(Boolean);

  return [...new Set(normalized)];
}

async function fetchStudentClasses(classIds, studentId) {
  const token = getToken();
  if (!token) {
    throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${STUDENT_API_BASE_URL}/classes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách lớp học.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (err) {
      // ignore parse error
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const classes = unwrapListResponse(payload).map(normalizeClass);

  if (!classes.length) return [];

  const targetClassIds = new Set(classIds || []);
  const studentIdStr = normalizeId(studentId);

  return classes
    .filter((cls) => {
      if (targetClassIds.has(cls.id)) return true;
      if (
        studentIdStr &&
        Array.isArray(cls.students) &&
        cls.students.some((student) => normalizeId(student) === studentIdStr)
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    .slice(0, 5);
}

async function fetchUpcomingExams(classIds, studentId) {
  const token = getToken();
  if (!token) {
    throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${STUDENT_API_BASE_URL}/exams`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let message = "Không thể tải danh sách kỳ thi.";
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch (err) {
      // ignore parse error
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const exams = unwrapListResponse(payload).map(normalizeExam);

  if (!exams.length) return [];

  const classIdSet = new Set((classIds || []).map((id) => normalizeId(id)));
  const studentIdStr = normalizeId(studentId);

  const now = new Date();

  const filtered = exams.filter((exam) => {
    if (!exam.isPublished) return false;

    const studentMatches =
      studentIdStr &&
      exam.allowedStudents.some((stId) => normalizeId(stId) === studentIdStr);

    const classMatches =
      !classIdSet.size ||
      exam.classIds.some((clsId) => classIdSet.has(normalizeId(clsId)));

    if (!studentMatches && !classMatches) return false;

    if (exam.closeAt && now > exam.closeAt) return false;

    if (!exam.openAt) return true;

    return exam.openAt >= now || (exam.openAt <= now && (!exam.closeAt || now <= exam.closeAt));
  });

  return filtered
    .sort((a, b) => (a.openAt || new Date(0)) - (b.openAt || new Date(0)))
    .slice(0, 5);
}

function normalizeClass(raw) {
  const id = normalizeId(raw?._id || raw?.id || raw);
  const students = Array.isArray(raw?.students) ? raw.students : [];

  return {
    id,
    code: raw?.classCode || raw?.code || raw?.name || "Không xác định",
    name: raw?.name || raw?.classCode || "Không xác định",
    studentCount: students.length || Number(raw?.studentCount || 0),
    students,
    academicYear: formatAcademicYear(raw?.academicYear),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt).getTime() : 0,
    createdAt: raw?.createdAt ? new Date(raw.createdAt).getTime() : 0,
  };
}

function normalizeExam(raw) {
  const openAt = raw?.openAt || raw?.startTime || raw?.availableFrom;
  const closeAt = raw?.closeAt || raw?.endTime || raw?.availableTo;

  const classDocs = Array.isArray(raw?.classIds) ? raw.classIds : [];
  const classIds = classDocs.map((cls) =>
    normalizeId(cls?._id || cls?.id || cls)
  );

  const allowedStudents = Array.isArray(raw?.assignedStudents)
    ? raw.assignedStudents
    : Array.isArray(raw?.students)
    ? raw.students
    : Array.isArray(raw?.participantIds)
    ? raw.participantIds
    : [];

  return {
    id: normalizeId(raw?._id || raw?.id),
    title: raw?.title || raw?.name || "Không có tiêu đề",
    description: raw?.description || "",
    duration: Number(raw?.duration || raw?.timeLimit || 0),
    openAt: openAt ? new Date(openAt) : null,
    closeAt: closeAt ? new Date(closeAt) : null,
    classIds,
    allowedStudents,
    isPublished:
      raw?.isPublished !== undefined
        ? Boolean(raw.isPublished)
        : raw?.status
        ? raw.status !== "draft"
        : true,
  };
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

function formatAcademicYear(value) {
  if (!value) return "—";
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

function formatExamDate(date) {
  if (!date) return "Chưa có lịch";
  try {
    const options = {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("vi-VN", options).format(date);
  } catch (error) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }
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

function setRecentClassesLoading() {
  const container = document.getElementById("recentClassesContainer");
  if (!container) return;
  container.innerHTML =
    '<div class="dashboard-loading"><i class="fas fa-spinner fa-spin"></i> Đang tải lớp học...</div>';
}

function setUpcomingExamsLoading() {
  const container = document.getElementById("upcomingExamsContainer");
  if (!container) return;
  container.innerHTML =
    '<div class="dashboard-loading"><i class="fas fa-spinner fa-spin"></i> Đang tải lịch thi...</div>';
}

function renderRecentClasses(classes) {
  const container = document.getElementById("recentClassesContainer");
  if (!container) return;

  if (!Array.isArray(classes) || classes.length === 0) {
    container.innerHTML =
      '<div class="dashboard-empty">Bạn chưa tham gia lớp học nào.</div>';
    return;
  }

  const limited = classes.slice(0, 3);

  container.innerHTML = limited
    .map(
      (cls) => `
        <div class="item-row">
            <div class="item-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="item-details">
                <h4 class="item-title">${escapeHtml(cls.code)}</h4>
                <p class="item-subtitle">${cls.studentCount || 0} sinh viên</p>
                <p class="item-subtitle">Khóa: ${escapeHtml(
                  cls.academicYear || "—"
                )}</p>
            </div>
        </div>
    `
    )
    .join("");
}

function renderRecentClassesError(message) {
  const container = document.getElementById("recentClassesContainer");
  if (!container) return;
  container.innerHTML = `<div class="dashboard-error">${escapeHtml(
    message
  )}</div>`;
}

function renderUpcomingExams(exams) {
  const container = document.getElementById("upcomingExamsContainer");
  if (!container) return;

  if (!Array.isArray(exams) || exams.length === 0) {
    container.innerHTML =
      '<div class="dashboard-empty">Chưa có kỳ thi sắp diễn ra.</div>';
    return;
  }

  const limited = exams.slice(0, 3);

  container.innerHTML = limited
    .map((exam) => {
      const openText = formatExamDate(exam.openAt);
      const durationText = formatDuration(exam.duration);
      return `
        <div class="item-row">
            <div class="item-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="item-details">
                <h4 class="item-title">${escapeHtml(exam.title)}</h4>
                <p class="item-subtitle">${openText}</p>
                <p class="item-subtitle">Thời gian làm bài: ${durationText}</p>
            </div>
            <div class="item-actions">
                <a href="/Student/ExamInfo?examId=${encodeURIComponent(
                  exam.id
                )}" class="join-exam-btn">
                    <i class="fas fa-play"></i>
                    Tham gia
                </a>
            </div>
        </div>
    `;
    })
    .join("");
}

function renderUpcomingExamsError(message) {
  const container = document.getElementById("upcomingExamsContainer");
  if (!container) return;
  container.innerHTML = `<div class="dashboard-error">${escapeHtml(
    message
  )}</div>`;
}

