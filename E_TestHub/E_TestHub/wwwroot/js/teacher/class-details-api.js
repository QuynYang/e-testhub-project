// Teacher Class Details API Integration
const CLASS_DETAILS_API_BASE_URL = "http://localhost:3000/api";

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Normalize ID
function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "object") {
    return value._id || value.id || value.value || value.toString?.() || null;
  }
  return null;
}

// Check if string is a valid MongoDB ObjectId
function isValidObjectId(str) {
  if (!str || typeof str !== "string") return false;
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(str);
}

// Find class by classCode or name if classId is not a valid ObjectId
async function findClassByCodeOrName(classCodeOrName) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực.");
    }

    console.log("🔍 Searching for class with code/name:", classCodeOrName);

    // Load all classes
    const response = await fetch(`${CLASS_DETAILS_API_BASE_URL}/classes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể tải danh sách lớp học.");
    }

    const classes = await response.json();
    const classesArray = Array.isArray(classes)
      ? classes
      : classes.data || classes.results || [];

    console.log(`📚 Loaded ${classesArray.length} classes from API`);

    // Find class by classCode or name
    const searchTerm = classCodeOrName.toString().toLowerCase();
    const foundClass = classesArray.find((cls) => {
      const code = (cls.classCode || "").toString().toLowerCase();
      const name = (cls.name || "").toString().toLowerCase();
      const id = (cls._id || cls.id || "").toString().toLowerCase();

      const matches =
        code === searchTerm || name === searchTerm || id === searchTerm;
      if (matches) {
        console.log("✅ Found matching class:", {
          _id: cls._id || cls.id,
          classCode: cls.classCode,
          name: cls.name,
        });
      }
      return matches;
    });

    if (!foundClass) {
      console.warn("⚠️ No class found with code/name:", classCodeOrName);
      console.log(
        "Available classes:",
        classesArray.map((c) => ({
          _id: c._id || c.id,
          classCode: c.classCode,
          name: c.name,
        }))
      );
    }

    return foundClass || null;
  } catch (error) {
    console.error("❌ Error finding class by code/name:", error);
    return null;
  }
}

// Get classId from query string
function getClassIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("classId") || params.get("id") || null;
}

// Fetch class details from API
async function fetchClassDetails(classId) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    let actualClassId = normalizeId(classId);

    // If classId is not a valid ObjectId, try to find it by classCode or name
    if (!isValidObjectId(actualClassId)) {
      console.log(
        `ClassId "${actualClassId}" is not a valid ObjectId, searching by classCode/name...`
      );
      const foundClass = await findClassByCodeOrName(actualClassId);

      if (foundClass) {
        actualClassId = normalizeId(foundClass._id || foundClass.id);
        console.log(`Found class with ObjectId: ${actualClassId}`);
      } else {
        throw new Error(`Không tìm thấy lớp học với mã "${classId}".`);
      }
    }

    if (!actualClassId) {
      throw new Error("ID lớp học không hợp lệ.");
    }

    const response = await fetch(
      `${CLASS_DETAILS_API_BASE_URL}/classes/${actualClassId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể tải thông tin lớp học.");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching class details:", error);
    throw error;
  }
}

// Fetch students in a class
async function fetchClassStudents(classId) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực.");
    }

    const classData = await fetchClassDetails(classId);
    const studentIds = Array.isArray(classData.students)
      ? classData.students
      : [];

    if (studentIds.length === 0) {
      return [];
    }

    // Fetch all students
    const response = await fetch(`${CLASS_DETAILS_API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách sinh viên.");
    }

    const allUsers = await response.json();

    // Filter students that are in this class
    const classStudentIds = studentIds
      .map((id) => normalizeId(id)?.toString())
      .filter(Boolean);
    const students = allUsers.filter((user) => {
      if (user.role !== "student") return false;
      const userId = normalizeId(user._id || user.id)?.toString();
      return userId && classStudentIds.includes(userId);
    });

    return students.map((student) => ({
      id:
        student.studentId ||
        student.info?.studentId ||
        student._id ||
        student.id,
      name:
        student.fullName ||
        `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
        student.email ||
        "N/A",
      email: student.email || "N/A",
      status: student.isActive !== false ? "Active" : "Inactive",
      userId: normalizeId(student._id || student.id),
    }));
  } catch (error) {
    console.error("Error fetching class students:", error);
    return [];
  }
}

// Fetch exams for a class
async function fetchClassExams(classId) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Không tìm thấy token xác thực.");
    }

    // Fetch all exams
    const response = await fetch(`${CLASS_DETAILS_API_BASE_URL}/exams`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách đề thi.");
    }

    const allExams = await response.json();
    const normalizedClassId = normalizeId(classId)?.toString();

    // Filter exams that belong to this class
    const classExams = allExams.filter((exam) => {
      const examClassIds = Array.isArray(exam.classIds) ? exam.classIds : [];
      return examClassIds.some((cid) => {
        const examClassId = normalizeId(cid?._id || cid?.id || cid)?.toString();
        return examClassId === normalizedClassId;
      });
    });

    // Fetch exam results to calculate submission counts
    const examResultsResponse = await fetch(
      `${CLASS_DETAILS_API_BASE_URL}/exam-results`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    let examResults = [];
    if (examResultsResponse.ok) {
      examResults = await examResultsResponse.json();
    }

    // Format exams with status and submission counts
    const now = new Date();
    return classExams
      .map((exam) => {
        const examId = normalizeId(exam._id || exam.id)?.toString();
        const openAt = exam.openAt ? new Date(exam.openAt) : null;
        const closeAt = exam.closeAt ? new Date(exam.closeAt) : null;

        // Determine status
        let status = "upcoming";
        if (closeAt && closeAt < now) {
          status = "completed";
        } else if (openAt && openAt <= now && closeAt && closeAt >= now) {
          status = "in-progress";
        }

        // Count submissions for this exam
        const submissions = examResults.filter((result) => {
          const resultExamId = normalizeId(result.examId)?.toString();
          return resultExamId === examId;
        });
        const submittedCount = submissions.length;

        // Get total students (from class - use the classData we'll fetch)
        // For now, we'll get it from the class data passed to renderExamsGrid
        const totalStudents = 0; // Will be set when we have class data

        return {
          id: examId,
          name: exam.title || exam.name || "Bài thi không tên",
          date: openAt || new Date(),
          status: status,
          submittedCount: submittedCount,
          totalStudents: totalStudents || 0,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  } catch (error) {
    console.error("Error fetching class exams:", error);
    return [];
  }
}

// Fetch course info
async function fetchCourseInfo(courseId) {
  try {
    const token = getToken();
    if (!token) return null;

    const normalizedId = normalizeId(courseId);
    if (!normalizedId) return null;

    const response = await fetch(
      `${CLASS_DETAILS_API_BASE_URL}/courses/${normalizedId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.warn("Error fetching course info:", error);
    return null;
  }
}

// Fetch teacher info
async function fetchTeacherInfo(teacherId) {
  try {
    const token = getToken();
    if (!token) return null;

    const normalizedId = normalizeId(teacherId);
    if (!normalizedId) return null;

    const response = await fetch(
      `${CLASS_DETAILS_API_BASE_URL}/users/${normalizedId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.warn("Error fetching teacher info:", error);
    return null;
  }
}

// Format academic year
function formatAcademicYear(academicYear) {
  if (!academicYear) return "Unknown";
  if (typeof academicYear === "string") return academicYear;
  return academicYear.toString();
}

// Initialize class details page
async function initializeClassDetailsPage() {
  const classIdFromQuery = getClassIdFromQuery();
  console.log("🔍 ClassId from query:", classIdFromQuery);

  if (!classIdFromQuery) {
    showError("Không tìm thấy mã lớp học trong đường dẫn.");
    return;
  }

  try {
    // Show loading state
    setLoadingState(true);
    console.log("📥 Starting to fetch class details...");

    // Fetch class details (this will resolve classCode to ObjectId if needed)
    const classData = await fetchClassDetails(classIdFromQuery);
    console.log("✅ Class data fetched:", classData);

    // Get the actual ObjectId from the fetched class data
    const actualClassId = normalizeId(
      classData._id || classData.id || classIdFromQuery
    );
    console.log("🆔 Actual class ID:", actualClassId);

    if (!actualClassId) {
      throw new Error("Không thể xác định ID lớp học.");
    }

    // Fetch related data using the actual ObjectId
    console.log("📥 Fetching related data...");
    const [students, exams, course, teacher] = await Promise.all([
      fetchClassStudents(actualClassId),
      fetchClassExams(actualClassId),
      classData.courseId
        ? fetchCourseInfo(classData.courseId)
        : Promise.resolve(null),
      classData.teacherId
        ? fetchTeacherInfo(classData.teacherId)
        : Promise.resolve(null),
    ]);

    console.log("✅ Related data fetched:", {
      students: students.length,
      exams: exams.length,
      course: course ? "Yes" : "No",
      teacher: teacher ? "Yes" : "No",
    });

    // Render all data
    console.log("🎨 Rendering data...");
    renderClassHeader(classData, course, teacher);
    renderStatistics(classData, students, exams);
    renderStudentsTable(students);
    renderExamsGrid(exams, actualClassId, students.length);

    console.log("✅ All data rendered successfully");
    // Hide loading state
    setLoadingState(false);
  } catch (error) {
    console.error("❌ Error initializing class details:", error);
    console.error("❌ Error stack:", error.stack);
    showError(error.message || "Không thể tải thông tin lớp học.");
    setLoadingState(false);
  }
}

// Set loading state
function setLoadingState(isLoading) {
  // Don't replace HTML structure, just show/hide loading indicators
  // The structure should remain intact for rendering
  if (isLoading) {
    // Show loading in header if exists
    const header = document.querySelector(".class-details-header");
    if (header && !header.querySelector(".loading")) {
      const loadingEl = document.createElement("div");
      loadingEl.className = "loading";
      loadingEl.textContent = "Đang tải...";
      loadingEl.style.cssText = "text-align: center; padding: 20px;";
      header.appendChild(loadingEl);
    }

    // Show loading in stats if exists
    const stats = document.querySelector(".stats-grid");
    if (stats && !stats.querySelector(".loading")) {
      const loadingEl = document.createElement("div");
      loadingEl.className = "loading";
      loadingEl.textContent = "Đang tải...";
      loadingEl.style.cssText =
        "text-align: center; padding: 20px; grid-column: 1 / -1;";
      stats.appendChild(loadingEl);
    }

    // Show loading in tabs if exists
    const tabs = document.querySelector(".tab-content");
    if (tabs && !tabs.querySelector(".loading")) {
      const loadingEl = document.createElement("div");
      loadingEl.className = "loading";
      loadingEl.textContent = "Đang tải...";
      loadingEl.style.cssText = "text-align: center; padding: 20px;";
      tabs.appendChild(loadingEl);
    }
  } else {
    // Remove loading indicators
    document.querySelectorAll(".loading").forEach((el) => {
      if (el.textContent === "Đang tải...") {
        el.remove();
      }
    });
  }
}

// Show error message
function showError(message) {
  const header = document.querySelector(".class-details-header");
  if (header) {
    header.innerHTML = `<div class="error-message">${message}</div>`;
  }
  alert(message);
}

// Render class header
function renderClassHeader(classData, course, teacher) {
  console.log("🎨 Rendering class header:", { classData, course, teacher });

  const titleEl =
    document.getElementById("classTitle") ||
    document.querySelector(".class-title");
  const studentCountEl = document.getElementById("studentCount");
  const academicYearEl = document.getElementById("academicYear");
  const subjectNameEl = document.getElementById("subjectName");

  if (titleEl) {
    const className = classData.name || classData.classCode || "Lớp học";
    titleEl.textContent = className;
    console.log("✅ Class title set:", className);
  } else {
    console.warn("⚠️ Class title element not found");
  }

  if (studentCountEl) {
    const studentCount = Array.isArray(classData.students)
      ? classData.students.length
      : 0;
    studentCountEl.textContent = studentCount;
    console.log("✅ Student count set:", studentCount);
  } else {
    console.warn("⚠️ Student count element not found");
  }

  if (academicYearEl) {
    const academicYear = formatAcademicYear(
      classData.academicYear || course?.academicYear
    );
    academicYearEl.textContent = academicYear;
    console.log("✅ Academic year set:", academicYear);
  } else {
    console.warn("⚠️ Academic year element not found");
  }

  if (subjectNameEl) {
    const subjectName =
      course?.courseName || course?.name || classData.name || "Unknown";
    subjectNameEl.textContent = subjectName;
    console.log("✅ Subject name set:", subjectName);
  } else {
    console.warn("⚠️ Subject name element not found");
  }
}

// Render statistics
function renderStatistics(classData, students, exams) {
  const statCards = document.querySelectorAll(".stat-card .stat-number");

  if (statCards.length >= 4) {
    // Total exams
    statCards[0].textContent = exams.length || 0;

    // Completed exams
    const completedExams = exams.filter((e) => e.status === "completed").length;
    statCards[1].textContent = completedExams || 0;

    // Submission rate
    const totalSubmissions = exams.reduce(
      (sum, e) => sum + e.submittedCount,
      0
    );
    const totalPossible = exams.reduce((sum, e) => sum + e.totalStudents, 0);
    const submissionRate =
      totalPossible > 0
        ? Math.round((totalSubmissions / totalPossible) * 100)
        : 0;
    statCards[2].textContent = `${submissionRate}%`;

    // Total students
    statCards[3].textContent = students.length || 0;
  }
}

// Render students table
function renderStudentsTable(students) {
  const tbody = document.querySelector(".students-table tbody");
  const header = document.querySelector(
    '[data-panel="students"] .panel-header h3'
  );

  if (header) {
    header.textContent = `Danh sách sinh viên (${students.length})`;
  }

  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Không có sinh viên nào</td></tr>';
    return;
  }

  tbody.innerHTML = students
    .map(
      (student) => `
        <tr>
            <td>${student.id || "N/A"}</td>
            <td>${student.name || "N/A"}</td>
            <td>${student.email || "N/A"}</td>
            <td>
                <span class="status-badge ${student.status.toLowerCase()}">
                    ${student.status}
                </span>
            </td>
            <td>
                <div class="action-buttons-group">
                    <button class="action-btn view-btn" title="Xem kết quả thi" disabled>
                        <i class="fas fa-chart-bar"></i>
                        Kết quả
                    </button>
                    <button class="action-btn message-btn" title="Nhắn tin">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");

  // Re-initialize action buttons
  initializeActions();
}

// Render exams grid
function renderExamsGrid(exams, classId, totalStudents) {
  const grid = document.querySelector(".exams-grid");
  const header = document.querySelector(
    '[data-panel="exams"] .panel-header h3'
  );

  if (header) {
    header.textContent = `Đề thi đã giao (${exams.length})`;
  }

  if (!grid) return;

  if (exams.length === 0) {
    grid.innerHTML =
      '<div class="no-exams">Chưa có đề thi nào được giao cho lớp này</div>';
    return;
  }

  grid.innerHTML = exams
    .map((exam) => {
      const statusText =
        exam.status === "upcoming"
          ? "Sắp diễn ra"
          : exam.status === "in-progress"
          ? "Đang diễn ra"
          : "Đã hoàn thành";
      const statusClass =
        exam.status === "completed" ? "completed" : "upcoming";
      const dateStr =
        exam.date instanceof Date
          ? exam.date.toLocaleDateString("vi-VN")
          : new Date(exam.date).toLocaleDateString("vi-VN");

      // Use totalStudents from parameter if exam.totalStudents is 0
      const examTotalStudents =
        exam.totalStudents > 0 ? exam.totalStudents : totalStudents;

      return `
            <div class="exam-card">
                <div class="exam-header">
                    <h4 class="exam-title">${
                      exam.name || "Bài thi không tên"
                    }</h4>
                    <span class="exam-status ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="exam-meta">
                    <div class="exam-meta-item">
                        <i class="fas fa-calendar"></i>
                        ${dateStr}
                    </div>
                    <div class="exam-meta-item">
                        <i class="fas fa-users"></i>
                        ${exam.submittedCount}/${examTotalStudents} đã nộp
                    </div>
                </div>
                <div class="exam-actions">
                    <a href="/Teacher/ExamDetails?examId=${
                      exam.id
                    }" class="exam-action-btn">
                        <i class="fas fa-eye"></i>
                        Xem chi tiết
                    </a>
                    ${
                      exam.status === "completed"
                        ? `
                        <a href="/Teacher/ViewResults?examId=${exam.id}" class="exam-action-btn">
                            <i class="fas fa-chart-bar"></i>
                            Xem kết quả
                        </a>
                    `
                        : ""
                    }
                </div>
            </div>
        `;
    })
    .join("");
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM Content Loaded, initializing class details page...");

  // Wait a bit to ensure all elements are rendered
  setTimeout(() => {
    initializeClassDetailsPage();
  }, 100);
});
