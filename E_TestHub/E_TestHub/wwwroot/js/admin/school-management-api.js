// School Management API Integration
const API_BASE_URL = "http://localhost:3000/api";

let allStudentsCache = [];
let selectedStudentsForClass = [];
let currentEditingClass = null;
let originalClassData = null;
let studentCheckboxFilter = "";

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "object") {
    return (
      value._id ||
      value.id ||
      value.studentId ||
      value.teacherId ||
      value.courseId ||
      (typeof value.toString === "function" ? value.toString() : "")
    );
  }
  return value.toString();
}

// Load teachers from API
async function loadTeachers() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return [];
    }

    // Fetch all users
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách giáo viên");
    }

    const users = await response.json();

    // Filter only teachers
    const teachers = users.filter(
      (user) => user.role === "teacher" && user.isActive !== false
    );

    return teachers;
  } catch (error) {
    console.error("Error loading teachers:", error);
    showError("Không thể tải danh sách giáo viên. Vui lòng thử lại.");
    return [];
  }
}

// Load courses from API
async function loadCourses() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return [];
    }

    // Fetch all courses
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách khóa học");
    }

    const courses = await response.json();
    return courses;
  } catch (error) {
    console.error("Error loading courses:", error);
    showError("Không thể tải danh sách khóa học. Vui lòng thử lại.");
    return [];
  }
}

// Load students from API
async function loadStudents() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách sinh viên");
    }

    const users = await response.json();

    const students = users.filter(
      (user) =>
        (user.role === "student" || user.role === "Student") &&
        user.isActive !== false
    );

    return students;
  } catch (error) {
    console.error("Error loading students:", error);
    showError("Không thể tải danh sách sinh viên. Vui lòng thử lại.");
    return [];
  }
}

// Populate course dropdown
async function populateCourseDropdown(selectId = "courseId") {
  const courseSelect = document.getElementById(selectId);
  if (!courseSelect) return;

  // Clear existing options except the first one
  while (courseSelect.options.length > 1) {
    courseSelect.remove(1);
  }

  // Show loading state
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Đang tải...";
  courseSelect.appendChild(loadingOption);

  // Load courses
  const courses = await loadCourses();

  // Remove loading option
  if (courseSelect.options.length > 1) {
    courseSelect.remove(1);
  }

  // Populate dropdown
  if (courses.length === 0) {
    const noCourseOption = document.createElement("option");
    noCourseOption.value = "";
    noCourseOption.textContent = "Không có khóa học nào";
    courseSelect.appendChild(noCourseOption);
  } else {
    courses.forEach((course) => {
      const option = document.createElement("option");
      option.value = course._id || course.id;
      const courseName = course.courseName || course.name || "";
      const period =
        course.period ||
        (course.startYear && course.endYear
          ? `${course.startYear}-${course.endYear}`
          : "");
      option.textContent = courseName + (period ? ` (${period})` : "");
      courseSelect.appendChild(option);
    });
  }
}

// Populate teacher dropdown
async function populateTeacherDropdown(selectId = "teacherId") {
  const teacherSelect = document.getElementById(selectId);
  if (!teacherSelect) return;

  // Clear existing options except the first one
  while (teacherSelect.options.length > 1) {
    teacherSelect.remove(1);
  }

  // Show loading state
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Đang tải...";
  teacherSelect.appendChild(loadingOption);

  // Load teachers
  const teachers = await loadTeachers();

  // Remove loading option
  if (teacherSelect.options.length > 1) {
    teacherSelect.remove(1);
  }

  // Populate dropdown
  if (teachers.length === 0) {
    const noTeacherOption = document.createElement("option");
    noTeacherOption.value = "";
    noTeacherOption.textContent = "Không có giáo viên nào";
    teacherSelect.appendChild(noTeacherOption);
  } else {
    teachers.forEach((teacher) => {
      const option = document.createElement("option");
      option.value = teacher._id || teacher.id;
      const fullName =
        teacher.fullName ||
        `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
      option.textContent = fullName || teacher.email || "N/A";
      teacherSelect.appendChild(option);
    });
  }
}

// Update teacher's teachingSubjects
async function updateTeacherTeachingSubjects(teacherId, classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    // Get current teacher data
    const getResponse = await fetch(`${API_BASE_URL}/users/${teacherId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!getResponse.ok) {
      throw new Error("Không thể lấy thông tin giáo viên");
    }

    const teacher = await getResponse.json();

    // Add classId to teachingSubjects if not already present
    const teachingSubjects = teacher.teachingSubjects || [];
    if (!teachingSubjects.includes(classId)) {
      teachingSubjects.push(classId);
    }

    // Update teacher
    const updateResponse = await fetch(`${API_BASE_URL}/users/${teacherId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teachingSubjects: teachingSubjects,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.message || "Không thể cập nhật giáo viên");
    }

    return await updateResponse.json();
  } catch (error) {
    console.error("Error updating teacher teachingSubjects:", error);
    throw error;
  }
}

// Update course's classes
async function updateCourseClasses(courseId, classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    // Get current course data
    const getResponse = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!getResponse.ok) {
      throw new Error("Không thể lấy thông tin khóa học");
    }

    const course = await getResponse.json();

    // Add classId to classes if not already present
    const classes = course.classes || [];
    if (!classes.includes(classId)) {
      classes.push(classId);
    }

    // Update course
    const updateResponse = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classes: classes,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.message || "Không thể cập nhật khóa học");
    }

    return await updateResponse.json();
  } catch (error) {
    console.error("Error updating course classes:", error);
    throw error;
  }
}

// Get course info to extract academicYear
async function getCourseInfo(courseId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể lấy thông tin khóa học");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting course info:", error);
    throw error;
  }
}

// Create new class via API
async function createClass(classData) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    console.log("Creating class with data:", classData);

    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(classData),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      const text = await response.text();
      console.error("Response text:", text);
      throw new Error("Lỗi phản hồi từ server. Vui lòng thử lại.");
    }

    if (!response.ok) {
      const errorMessage =
        data.message || "Không thể tạo lớp học. Vui lòng thử lại.";
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("Error creating class:", error);
    throw error;
  }
}

async function removeClassFromTeacher(teacherId, classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_BASE_URL}/users/${teacherId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const teacher = await response.json();
    const teachingSubjects = (teacher.teachingSubjects || []).filter(
      (id) => (id?._id || id?.id || id)?.toString() !== classId.toString()
    );

    await fetch(`${API_BASE_URL}/users/${teacherId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teachingSubjects }),
    });
  } catch (error) {
    console.warn("Không thể loại bỏ lớp khỏi giáo viên:", error);
  }
}

async function removeClassFromCourse(courseId, classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const course = await response.json();
    const classes = (course.classes || []).filter(
      (id) => (id?._id || id?.id || id)?.toString() !== classId.toString()
    );

    await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ classes }),
    });
  } catch (error) {
    console.warn("Không thể loại bỏ lớp khỏi khóa học:", error);
  }
}

async function getClassById(classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_BASE_URL}/classes/${classId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể lấy thông tin lớp học.");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching class details:", error);
    throw error;
  }
}

async function updateClassDetails(classId, updateData) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_BASE_URL}/classes/${classId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (!response.ok) {
      let message = data?.message || "Không thể cập nhật lớp học.";
      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error("Error updating class:", error);
    throw error;
  }
}

// Show error message
function showError(message) {
  // You can implement a toast notification or alert here
  console.error(message);
  alert(message);
}

// Show success message
function showSuccess(message) {
  // You can implement a toast notification or alert here
  console.log(message);
  alert(message);
}

// Delete a class via API
async function deleteClass(classId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    // First, get class details to clean up relationships
    let classData = null;
    try {
      classData = await getClassById(classId);
    } catch (error) {
      console.warn("Could not fetch class details before deletion:", error);
    }

    // Delete the class
    const response = await fetch(`${API_BASE_URL}/classes/${classId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || "Không thể xóa lớp học. Vui lòng thử lại."
      );
    }

    // Clean up relationships if class data was fetched
    if (classData) {
      const relationUpdates = [];

      // Remove class from teacher's teachingSubjects
      if (classData.teacherId) {
        const teacherId = normalizeId(classData.teacherId);
        if (teacherId) {
          relationUpdates.push(removeClassFromTeacher(teacherId, classId));
        }
      }

      // Remove class from course's classes
      if (classData.courseId) {
        const courseId = normalizeId(classData.courseId);
        if (courseId) {
          relationUpdates.push(removeClassFromCourse(courseId, classId));
        }
      }

      // Execute all relation updates in parallel (don't wait for failures)
      if (relationUpdates.length > 0) {
        Promise.allSettled(relationUpdates).catch((error) => {
          console.warn("Some relation updates failed:", error);
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error deleting class:", error);
    throw error;
  }
}

function setEditClassStatus(message, type) {
  const statusEl = document.getElementById("editClassStatusMessage");
  if (!statusEl) return;

  statusEl.textContent = message || "";
  statusEl.className = "form-status";

  if (!message) return;
  if (type === "loading") {
    statusEl.classList.add("status-loading");
  } else if (type === "success") {
    statusEl.classList.add("status-success");
  } else if (type === "error") {
    statusEl.classList.add("status-error");
  }
}

async function openEditClassModal(classId) {
  try {
    setEditClassStatus("Đang tải thông tin lớp...", "loading");

    if (!allStudentsCache.length) {
      allStudentsCache = await loadStudents();
    }

    const classData = await getClassById(classId);
    originalClassData = classData;
    currentEditingClass = classData;

    await populateCourseDropdown("editCourseId");
    await populateTeacherDropdown("editTeacherId");

    document.getElementById("editClassCode").value = classData.classCode || "";
    document.getElementById("editClassName").value = classData.name || "";
    document.getElementById("editCourseId").value =
      normalizeId(classData.courseId) || "";
    document.getElementById("editTeacherId").value =
      normalizeId(classData.teacherId) || "";
    document.getElementById("editAcademicYear").value =
      classData.academicYear || "";
    document.getElementById("editClassStatus").checked =
      classData.isActive !== false;

    const searchInput = document.getElementById("studentCheckboxSearch");
    if (searchInput) {
      searchInput.value = "";
    }
    studentCheckboxFilter = "";

    selectedStudentsForClass = [];
    if (Array.isArray(classData.students)) {
      classData.students.forEach((studentItem) => {
        const studentId = normalizeId(studentItem);
        if (!studentId) return;
        const match = (allStudentsCache || []).find(
          (student) => normalizeId(student) === studentId
        );
        selectedStudentsForClass.push({
          id: studentId,
          fullName: match
            ? formatStudentDisplayName(match)
            : studentItem.fullName || "Sinh viên",
          email: match?.email || studentItem.email || "",
        });
      });
    }

    renderSelectedStudents();
    renderStudentCheckboxList();
    setEditClassStatus("");

    const modalEl = document.getElementById("editClassModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } catch (error) {
    console.error("openEditClassModal error:", error);
    showError(error.message || "Không thể mở cửa sổ chỉnh sửa lớp học.");
  }
}

async function handleEditClassForm(event) {
  if (event) {
    event.preventDefault();
  }

  if (!currentEditingClass) {
    showError("Không có lớp học nào được chọn để chỉnh sửa.");
    return;
  }

  const classId =
    normalizeId(currentEditingClass._id) ||
    normalizeId(currentEditingClass.id) ||
    "";

  if (!classId) {
    showError("Không xác định được lớp học cần chỉnh sửa.");
    return;
  }

  const saveBtn = document.getElementById("saveEditClassBtn");
  const originalBtnText = saveBtn ? saveBtn.textContent : "";

  const classCode =
    document.getElementById("editClassCode")?.value?.trim() || "";
  const className =
    document.getElementById("editClassName")?.value?.trim() || "";
  const courseId = document.getElementById("editCourseId")?.value?.trim() || "";
  const teacherId =
    document.getElementById("editTeacherId")?.value?.trim() || "";
  const academicYear =
    document.getElementById("editAcademicYear")?.value?.trim() || "";
  const isActive =
    document.getElementById("editClassStatus")?.checked !== false;

  const errors = [];

  if (!classCode) errors.push("Mã lớp");
  if (!className) errors.push("Tên lớp");
  if (!courseId) errors.push("Khóa học");
  if (!teacherId) errors.push("Giáo viên chủ nhiệm");

  if (errors.length) {
    showError("Vui lòng điền đầy đủ các trường: " + errors.join(", "));
    return;
  }

  if (!/^[0-9a-fA-F]{24}$/.test(courseId)) {
    showError("Khóa học không hợp lệ");
    return;
  }

  if (!/^[0-9a-fA-F]{24}$/.test(teacherId)) {
    showError("Giáo viên không hợp lệ");
    return;
  }

  const studentIds = Array.from(
    new Set(
      (selectedStudentsForClass || [])
        .map((student) => normalizeId(student.id))
        .filter(Boolean)
    )
  );

  const updateData = {
    classCode,
    name: className,
    courseId,
    teacherId,
    academicYear: academicYear || undefined,
    isActive,
    students: studentIds,
  };

  const originalTeacherId = normalizeId(originalClassData?.teacherId);
  const originalCourseId = normalizeId(originalClassData?.courseId);

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Đang lưu...";
    }
    setEditClassStatus("Đang lưu thay đổi...", "loading");

    const result = await updateClassDetails(classId, updateData);

    const relationUpdates = [];

    if (teacherId) {
      if (originalTeacherId && originalTeacherId !== teacherId) {
        relationUpdates.push(
          removeClassFromTeacher(originalTeacherId, classId)
        );
      }
      relationUpdates.push(updateTeacherTeachingSubjects(teacherId, classId));
    }

    if (courseId) {
      if (originalCourseId && originalCourseId !== courseId) {
        relationUpdates.push(removeClassFromCourse(originalCourseId, classId));
      }
      relationUpdates.push(updateCourseClasses(courseId, classId));
    }

    if (relationUpdates.length) {
      await Promise.allSettled(relationUpdates);
    }

    currentEditingClass = result;
    originalClassData = result;

    setEditClassStatus("Cập nhật lớp học thành công.", "success");
    showSuccess("Cập nhật lớp học thành công!");

    const modalElement = document.getElementById("editClassModal");
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    setTimeout(() => {
      renderClassesTable();
    }, 500);
  } catch (error) {
    console.error("handleEditClassForm error:", error);
    setEditClassStatus(error.message || "Không thể cập nhật lớp học.", "error");
    showError(error.message || "Không thể cập nhật lớp học. Vui lòng thử lại.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }
  }
}

// Handle add class form submission
function handleAddClassForm() {
  const form = document.getElementById("addClassForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const classCode = document.getElementById("classCode")?.value?.trim() || "";
    const className = document.getElementById("className")?.value?.trim() || "";
    const courseId = document.getElementById("courseId")?.value?.trim() || "";
    const teacherId = document.getElementById("teacherId")?.value?.trim() || "";

    // Validation
    const errors = [];
    if (!classCode) errors.push("Mã lớp");
    if (!className) errors.push("Tên lớp");
    if (!courseId) errors.push("Khóa học");
    if (!teacherId) errors.push("Giáo viên chủ nhiệm");

    if (errors.length > 0) {
      showError("Vui lòng điền đầy đủ các trường: " + errors.join(", "));
      return;
    }

    // Validate courseId is ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(courseId)) {
      showError("Khóa học không hợp lệ");
      return;
    }

    // Validate teacherId is ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(teacherId)) {
      showError("Giáo viên không hợp lệ");
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang tạo...";

    try {
      // Get course info to extract academicYear
      const courseInfo = await getCourseInfo(courseId);
      const academicYear =
        courseInfo.academicYear ||
        (courseInfo.startYear && courseInfo.endYear
          ? `${courseInfo.startYear}-${courseInfo.endYear}`
          : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

      // Prepare request data according to API requirements
      const classData = {
        name: className,
        classCode: classCode,
        teacherId: teacherId,
        courseId: courseId,
        academicYear: academicYear,
        students: [],
        courses: [],
      };

      console.log("Creating class with data:", classData);

      // Create class
      const result = await createClass(classData);
      const classId = result._id || result.id;

      console.log("Class created successfully:", result);

      // Update teacher's teachingSubjects
      try {
        await updateTeacherTeachingSubjects(teacherId, classId);
        console.log("Teacher teachingSubjects updated");
      } catch (updateError) {
        console.error("Error updating teacher:", updateError);
        // Continue even if update fails
      }

      // Update course's classes
      try {
        await updateCourseClasses(courseId, classId);
        console.log("Course classes updated");
      } catch (updateError) {
        console.error("Error updating course:", updateError);
        // Continue even if update fails
      }

      showSuccess("Tạo lớp học thành công!");

      // Close modal
      const modalElement = document.getElementById("addClassModal");
      if (modalElement) {
        // Use Bootstrap 5 modal API
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        } else {
          // Fallback: use jQuery if Bootstrap modal instance not available
          $("#addClassModal").modal("hide");
        }
      }

      // Reset form
      form.reset();

      // Refresh class list
      setTimeout(() => {
        renderClassesTable();
      }, 500);
    } catch (error) {
      console.error("Error creating class:", error);
      showError(error.message || "Không thể tạo lớp học. Vui lòng thử lại.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Create new course via API
async function createCourse(courseData) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
    }

    // Ensure all required fields are present
    if (
      !courseData.courseCode ||
      !courseData.courseName ||
      !courseData.startYear ||
      !courseData.endYear
    ) {
      throw new Error(
        "Thiếu các trường bắt buộc: courseCode, courseName, startYear, endYear"
      );
    }

    console.log("Sending request to:", `${API_BASE_URL}/courses`);
    console.log("Request data:", courseData);

    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(courseData),
    });

    console.log("Response status:", response.status);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      const text = await response.text();
      console.error("Response text:", text);
      throw new Error("Lỗi phản hồi từ server. Vui lòng thử lại.");
    }

    if (!response.ok) {
      // Handle different error formats
      let errorMessage = "Không thể tạo khóa học. Vui lòng thử lại.";

      if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === "string") {
        errorMessage = data;
      } else if (data.errors) {
        // Handle validation errors
        const errorMessages = Object.values(data.errors).flat();
        errorMessage = errorMessages.join(", ");
      }

      console.error("API Error:", data);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
}

// Handle add course form submission
function handleAddCourseForm() {
  const form = document.getElementById("addCourseForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get all form values
    const courseCode =
      document.getElementById("courseCode")?.value?.trim() || "";
    const courseName =
      document.getElementById("courseName")?.value?.trim() || "";
    const startYear = document.getElementById("startYear")?.value?.trim() || "";
    const endYear = document.getElementById("endYear")?.value?.trim() || "";

    // Comprehensive validation
    const errors = [];

    if (!courseCode) {
      errors.push("Mã khóa học");
    }

    if (!courseName) {
      errors.push("Tên khóa học");
    }

    if (!startYear) {
      errors.push("Năm bắt đầu");
    }

    if (!endYear) {
      errors.push("Năm kết thúc");
    }

    if (errors.length > 0) {
      showError("Vui lòng điền đầy đủ các trường: " + errors.join(", "));
      return;
    }

    const startYearNum = parseInt(startYear);
    const endYearNum = parseInt(endYear);

    if (isNaN(startYearNum) || startYearNum < 2000 || startYearNum > 2100) {
      showError("Năm bắt đầu phải là số hợp lệ từ 2000 đến 2100");
      return;
    }

    if (isNaN(endYearNum) || endYearNum < 2000 || endYearNum > 2100) {
      showError("Năm kết thúc phải là số hợp lệ từ 2000 đến 2100");
      return;
    }

    if (startYearNum >= endYearNum) {
      showError("Năm bắt đầu phải nhỏ hơn năm kết thúc");
      return;
    }

    // Prepare request data - ensure all required fields are included
    const courseData = {
      courseCode: courseCode,
      courseName: courseName,
      startYear: startYearNum,
      endYear: endYearNum,
    };

    // Log data being sent for debugging
    console.log("Creating course with data:", courseData);

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang tạo...";

    try {
      const result = await createCourse(courseData);
      console.log("Course created successfully:", result);
      showSuccess("Tạo khóa học thành công!");

      // Close modal
      const modalElement = document.getElementById("addCourseModal");
      if (modalElement) {
        // Use Bootstrap 5 modal API
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        } else {
          // Fallback: use jQuery if Bootstrap modal instance not available
          $("#addCourseModal").modal("hide");
        }
      }

      // Reset form
      form.reset();

      // Refresh course list
      setTimeout(() => {
        renderCoursesTable();
      }, 500);
    } catch (error) {
      console.error("Error creating course:", error);
      const errorMessage =
        error.message || "Không thể tạo khóa học. Vui lòng thử lại.";
      showError(errorMessage);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Load classes from API
async function loadClasses() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return [];
    }

    // Fetch all classes
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách lớp học");
    }

    const classes = await response.json();
    return classes;
  } catch (error) {
    console.error("Error loading classes:", error);
    showError("Không thể tải danh sách lớp học. Vui lòng thử lại.");
    return [];
  }
}

// Get teacher name by ID
async function getTeacherName(teacherId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "N/A";

    const response = await fetch(`${API_BASE_URL}/users/${teacherId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return "N/A";

    const teacher = await response.json();
    return (
      teacher.fullName ||
      `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
      teacher.email ||
      "N/A"
    );
  } catch (error) {
    console.error("Error getting teacher name:", error);
    return "N/A";
  }
}

// Get course name by ID
async function getCourseName(courseId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "N/A";

    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return "N/A";

    const course = await response.json();
    const courseName = course.courseName || course.name || "";
    const period =
      course.period ||
      (course.startYear && course.endYear
        ? `${course.startYear}-${course.endYear}`
        : "");
    return courseName + (period ? ` ${period}` : "");
  } catch (error) {
    console.error("Error getting course name:", error);
    return "N/A";
  }
}

// Render classes table
async function renderClassesTable() {
  const tbody = document.querySelector("#classesTable tbody");
  if (!tbody) return;

  // Show loading state
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';

  try {
    const classes = await loadClasses();

    if (classes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">Không có lớp học nào</td></tr>';
      return;
    }

    // Clear loading state
    tbody.innerHTML = "";

    // Render each class
    for (const classItem of classes) {
      const row = document.createElement("tr");
      row.setAttribute("data-class-id", classItem._id || classItem.id);

      // Get teacher name and course name
      const teacherName = classItem.teacherId
        ? await getTeacherName(classItem.teacherId)
        : "Chưa có";
      const courseName = classItem.courseId
        ? await getCourseName(classItem.courseId)
        : "Chưa có";

      // Get student count
      const studentCount = classItem.students
        ? Array.isArray(classItem.students)
          ? classItem.students.length
          : 0
        : 0;

      // Determine status
      const isActive = classItem.isActive !== false;
      const statusClass = isActive ? "status-active" : "status-inactive";
      const statusText = isActive ? "Hoạt Động" : "Không Hoạt Động";

      row.innerHTML = `
                <td>${classItem.classCode || "N/A"}</td>
                <td>${classItem.name || "N/A"}</td>
                <td>${courseName}</td>
                <td>${studentCount}</td>
                <td>${teacherName}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action btn-edit" title="Chỉnh sửa" data-class-id="${
                      classItem._id || classItem.id
                    }">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Xóa" data-class-id="${
                      classItem._id || classItem.id
                    }">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    }

    // Attach event listeners for action buttons
    attachClassActionListeners();
  } catch (error) {
    console.error("Error rendering classes table:", error);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
  }
}

// Render courses table
async function renderCoursesTable() {
  const tbody = document.querySelector("#coursesTable tbody");
  if (!tbody) return;

  // Show loading state
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';

  try {
    const courses = await loadCourses();

    if (courses.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">Không có khóa học nào</td></tr>';
      return;
    }

    // Clear loading state
    tbody.innerHTML = "";

    // Render each course
    courses.forEach((course) => {
      const row = document.createElement("tr");
      row.setAttribute("data-course-id", course._id || course.id);

      // Get class count
      const classCount = course.classes
        ? Array.isArray(course.classes)
          ? course.classes.length
          : 0
        : 0;

      // Determine status
      const isActive = course.isActive !== false;
      const statusClass = isActive ? "status-active" : "status-inactive";
      const statusText = isActive ? "Đang Học" : "Đã Kết Thúc";

      row.innerHTML = `
                <td>${course.courseCode || "N/A"}</td>
                <td>${course.courseName || course.name || "N/A"}</td>
                <td>${course.startYear || "N/A"}</td>
                <td>${course.endYear || "N/A"}</td>
                <td>${classCount}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action btn-edit" title="Chỉnh sửa" data-course-id="${
                      course._id || course.id
                    }">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Xóa" data-course-id="${
                      course._id || course.id
                    }">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    // Attach event listeners for action buttons
    attachCourseActionListeners();
  } catch (error) {
    console.error("Error rendering courses table:", error);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
  }
}

// Attach event listeners for class action buttons
function attachClassActionListeners() {
  // Edit button
  document.querySelectorAll("#classesTable .btn-edit").forEach((btn) => {
    const hydratedButton = btn.cloneNode(true);
    btn.replaceWith(hydratedButton);
    hydratedButton.addEventListener("click", function () {
      const classId = this.getAttribute("data-class-id");
      if (classId) {
        openEditClassModal(classId);
      }
    });
  });

  // Delete button
  document.querySelectorAll("#classesTable .btn-delete").forEach((btn) => {
    const hydratedButton = btn.cloneNode(true);
    btn.replaceWith(hydratedButton);
    hydratedButton.addEventListener("click", async function () {
      const classId = this.getAttribute("data-class-id");
      if (!classId) {
        showError("Không tìm thấy ID lớp học");
        return;
      }

      if (
        confirm(
          "Bạn có chắc muốn xóa lớp học này? Hành động này không thể hoàn tác."
        )
      ) {
        // Store original HTML before modification
        const originalHtml = this.innerHTML;
        const buttonElement = this;

        try {
          // Disable button during deletion
          buttonElement.disabled = true;
          buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

          await deleteClass(classId);
          showSuccess("Xóa lớp học thành công!");

          // Reload classes table
          await renderClassesTable();
        } catch (error) {
          showError(
            error.message || "Không thể xóa lớp học. Vui lòng thử lại."
          );
          // Restore button
          buttonElement.disabled = false;
          buttonElement.innerHTML = originalHtml;
        }
      }
    });
  });
}

// Attach event listeners for course action buttons
function attachCourseActionListeners() {
  // Edit button
  document.querySelectorAll("#coursesTable .btn-edit").forEach((btn) => {
    btn.addEventListener("click", function () {
      const courseId = this.getAttribute("data-course-id");
      alert(
        "Chỉnh sửa khóa học ID: " +
          courseId +
          " (Tính năng sẽ được triển khai sau)"
      );
    });
  });

  // Delete button
  document.querySelectorAll("#coursesTable .btn-delete").forEach((btn) => {
    btn.addEventListener("click", function () {
      const courseId = this.getAttribute("data-course-id");
      if (confirm("Bạn có chắc muốn xóa khóa học này?")) {
        alert(
          "Xóa khóa học ID: " + courseId + " (Tính năng sẽ được triển khai sau)"
        );
      }
    });
  });
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

function formatStudentDisplayName(student) {
  const fullName =
    student.fullName ||
    `${student.firstName || ""} ${student.lastName || ""}`.trim();
  return fullName || student.email || "Sinh viên";
}

function renderSelectedStudents() {
  const container = document.getElementById("selectedStudentsContainer");
  if (!container) return;

  if (
    !Array.isArray(selectedStudentsForClass) ||
    selectedStudentsForClass.length === 0
  ) {
    container.innerHTML =
      '<div class="text-muted">Chưa có sinh viên nào được chọn.</div>';
    return;
  }

  container.innerHTML = selectedStudentsForClass
    .map((student) => {
      return `
        <div class="selected-student-chip" data-student-id="${student.id}">
            <div>
                <strong>${formatStudentDisplayName(student)}</strong>
                <div class="text-muted small">${student.email || ""}</div>
            </div>
        </div>
      `;
    })
    .join("");
}

function renderStudentCheckboxList(filterTerm = "") {
  const container = document.getElementById("studentCheckboxList");
  if (!container) return;

  studentCheckboxFilter = (filterTerm || "").trim().toLowerCase();

  const students = (allStudentsCache || [])
    .filter((student) => {
      if (!studentCheckboxFilter) return true;
      const name = formatStudentDisplayName(student).toLowerCase();
      const email = (student.email || "").toLowerCase();
      const studentCode = (
        student.studentCode ||
        student.studentId ||
        ""
      ).toLowerCase();
      return (
        name.includes(studentCheckboxFilter) ||
        email.includes(studentCheckboxFilter) ||
        (studentCode && studentCode.includes(studentCheckboxFilter))
      );
    })
    .sort((a, b) =>
      formatStudentDisplayName(a)
        .toLowerCase()
        .localeCompare(formatStudentDisplayName(b).toLowerCase())
    );

  if (!students.length) {
    container.innerHTML =
      '<div class="text-muted">Không tìm thấy sinh viên phù hợp.</div>';
    return;
  }

  container.innerHTML = students
    .map((student) => {
      const studentId = normalizeId(student);
      const isChecked = selectedStudentsForClass.some(
        (item) => normalizeId(item.id) === studentId
      );
      return `
        <label class="student-checkbox-item">
            <input type="checkbox" class="student-checkbox form-check-input" data-student-id="${studentId}" ${
        isChecked ? "checked" : ""
      }>
            <div>
                <strong>${formatStudentDisplayName(student)}</strong>
                <div class="text-muted small">${student.email || ""}</div>
                ${
                  student.studentCode || student.studentId
                    ? `<div class="text-muted small">MSSV: ${
                        student.studentCode || student.studentId
                      }</div>`
                    : ""
                }
            </div>
        </label>
      `;
    })
    .join("");
}

function addStudentToSelection(student) {
  if (!student || !student.id) return;
  const normalizedId = normalizeId(student.id);
  if (!normalizedId) return;

  const exists = selectedStudentsForClass.some(
    (item) => normalizeId(item.id) === normalizedId
  );
  if (exists) return;

  const cacheStudent =
    student.raw || getStudentFromCache(normalizedId) || student;

  selectedStudentsForClass.push({
    id: normalizedId,
    fullName: student.fullName || formatStudentDisplayName(cacheStudent || {}),
    email: student.email || cacheStudent?.email || "",
  });

  renderSelectedStudents();
}

function removeStudentFromSelection(studentId) {
  const normalizedId = normalizeId(studentId);
  selectedStudentsForClass = selectedStudentsForClass.filter(
    (student) => normalizeId(student.id) !== normalizedId
  );

  const checkbox = document.querySelector(
    `.student-checkbox[data-student-id="${normalizedId}"]`
  );
  if (checkbox) {
    checkbox.checked = false;
  }

  renderSelectedStudents();
}

function getStudentFromCache(studentId) {
  if (!studentId) return null;
  return (allStudentsCache || []).find(
    (student) =>
      (student._id || student.id)?.toString() === studentId.toString()
  );
}

function handleStudentCheckboxChange(event) {
  const checkbox = event.target.closest(".student-checkbox");
  if (!checkbox) return;

  const studentId = checkbox.getAttribute("data-student-id");
  const cacheStudent = getStudentFromCache(studentId);
  if (checkbox.checked) {
    addStudentToSelection({
      id: studentId,
      fullName: cacheStudent ? formatStudentDisplayName(cacheStudent) : "",
      email: cacheStudent?.email || "",
      raw: cacheStudent,
    });
  } else {
    removeStudentFromSelection(studentId);
  }
}

function handleStudentCheckboxSearch(event) {
  const term = event?.target?.value || "";
  renderStudentCheckboxList(term);
}

function handleSelectedStudentsClick(event) {
  const chip = event.target.closest(".selected-student-chip");
  if (!chip) return;
  const studentId = chip.getAttribute("data-student-id");
  if (studentId) {
    removeStudentFromSelection(studentId);
  }
}

function resetEditClassState() {
  selectedStudentsForClass = [];
  currentEditingClass = null;
  originalClassData = null;
  const searchInput = document.getElementById("studentCheckboxSearch");
  if (searchInput) {
    searchInput.value = "";
  }
  studentCheckboxFilter = "";
  setEditClassStatus("");
  renderStudentCheckboxList();
  renderSelectedStudents();
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  renderClassesTable();
  renderCoursesTable();

  const addClassModal = document.getElementById("addClassModal");
  if (addClassModal) {
    addClassModal.addEventListener("show.bs.modal", function () {
      populateCourseDropdown("courseId");
      populateTeacherDropdown("teacherId");
    });
  }

  handleAddClassForm();
  handleAddCourseForm();

  const saveEditClassBtn = document.getElementById("saveEditClassBtn");
  if (saveEditClassBtn) {
    saveEditClassBtn.addEventListener("click", handleEditClassForm);
  }

  const studentCheckboxSearch = document.getElementById(
    "studentCheckboxSearch"
  );
  if (studentCheckboxSearch) {
    studentCheckboxSearch.addEventListener(
      "input",
      handleStudentCheckboxSearch
    );
  }

  const studentCheckboxList = document.getElementById("studentCheckboxList");
  if (studentCheckboxList) {
    studentCheckboxList.addEventListener("change", handleStudentCheckboxChange);
  }

  const selectedStudentsContainer = document.getElementById(
    "selectedStudentsContainer"
  );
  if (selectedStudentsContainer) {
    selectedStudentsContainer.addEventListener(
      "click",
      handleSelectedStudentsClick
    );
  }

  const editClassModal = document.getElementById("editClassModal");
  if (editClassModal) {
    editClassModal.addEventListener("hidden.bs.modal", resetEditClassState);
  }

  const classSearch = document.getElementById("classSearch");
  if (classSearch) {
    classSearch.addEventListener("keyup", function () {
      const value = this.value.toLowerCase();
      const rows = document.querySelectorAll("#classesTable tbody tr");
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(value) > -1 ? "" : "none";
      });
    });
  }

  const courseSearch = document.getElementById("courseSearch");
  if (courseSearch) {
    courseSearch.addEventListener("keyup", function () {
      const value = this.value.toLowerCase();
      const rows = document.querySelectorAll("#coursesTable tbody tr");
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(value) > -1 ? "" : "none";
      });
    });
  }
});
