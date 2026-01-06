/**
 * Student Classes Page - JavaScript
 * File: classes.js
 * Description: Multiple view modes, search, sort, and filter functionality
 */

const STUDENT_CLASSES_API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const classesGrid = document.getElementById("classesGrid");
  const classesList = document.getElementById("classesList");
  const classesTableContainer = document.getElementById(
    "classesTableContainer"
  );
  const classesTableBody = document.getElementById("classesTableBody");
  const emptyState = document.getElementById("emptyState");
  const viewBtns = document.querySelectorAll(".view-btn");

  let currentView = localStorage.getItem("classesViewMode") || "list";
  let classesData = [];
  let filteredClasses = [];
  let isLoading = false;

  init();

  function init() {
    setActiveView(currentView);
    attachEventListeners();
    loadClassesFromApi();
  }

  function attachEventListeners() {
    viewBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const view = this.getAttribute("data-view");
        if (view === currentView) return;
        setActiveView(view);
        localStorage.setItem("classesViewMode", view);
        renderCurrentView();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", debounce(filterAndRender, 200));
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", filterAndRender);
    }

    const tableSortHeaders = document.querySelectorAll(
      ".classes-table th.sortable"
    );
    tableSortHeaders.forEach((header) => {
      header.addEventListener("click", function () {
        const sortType = this.getAttribute("data-sort");
        handleTableSort(sortType);
      });
    });

    if (searchInput) {
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          this.value = "";
          filterAndRender();
          this.blur();
        }
      });
    }
  }

  async function loadClassesFromApi() {
    try {
      isLoading = true;
      showLoadingState();

      const classes = await fetchStudentClasses();
      classesData = classes;

      if (!classesData.length) {
        showEmptyState();
        return;
      }

      filterAndRender();
    } catch (error) {
      console.error("Không thể tải danh sách lớp:", error);
      showErrorState(error?.message || "Không thể tải danh sách lớp.");
    } finally {
      isLoading = false;
    }
  }

  function setActiveView(view) {
    currentView = view;
    viewBtns.forEach((btn) => {
      if (btn.getAttribute("data-view") === view) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function filterAndRender() {
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const sortValue = sortSelect?.value || "name-asc";

    filteredClasses = classesData.filter((classItem) => {
      if (!searchTerm) return true;
      return (
        (classItem.code || "")
          .toString()
          .toLowerCase()
          .includes(searchTerm) ||
        (classItem.name || "").toLowerCase().includes(searchTerm) ||
        (classItem.studentCount || 0).toString().includes(searchTerm) ||
        (classItem.academicYear || "").toLowerCase().includes(searchTerm)
      );
    });

    filteredClasses = sortClasses(filteredClasses, sortValue);

    renderCurrentView();
  }

  function renderCurrentView() {
    if (isLoading) return;

    if (!filteredClasses.length) {
      showEmptyState();
      return;
    }

    hideEmptyState();

    switch (currentView) {
      case "grid":
        displayGridView(filteredClasses);
        break;
      case "list":
        displayListView(filteredClasses);
        break;
      case "table":
        displayTableView(filteredClasses);
        break;
      default:
        displayListView(filteredClasses);
        break;
    }
  }

    function sortClasses(classes, sortValue) {
      const sorted = [...classes];

      switch (sortValue) {
        case "name-asc":
          sorted.sort((a, b) => a.code.localeCompare(b.code));
          break;
        case "name-desc":
          sorted.sort((a, b) => b.code.localeCompare(a.code));
          break;
        case "students-asc":
          sorted.sort((a, b) => a.studentCount - b.studentCount);
          break;
        case "students-desc":
          sorted.sort((a, b) => b.studentCount - a.studentCount);
          break;
        default:
          break;
      }

      return sorted;
    }

  function displayGridView(classes) {
    hideAllViews();
    classesGrid.style.display = "grid";
    classesGrid.innerHTML = classes
      .map(
        (classItem, index) => `
        <a href="/Student/ClassDetails?classId=${encodeURIComponent(
          classItem.id
        )}" class="class-card" style="animation-delay: ${index * 0.05}s">
            <div class="class-card-content">
                <div class="class-icon">
                    <i class="fas fa-book-open"></i>
                </div>
                <div class="class-info">
                    <h3 class="class-name">${escapeHtml(classItem.code)}</h3>
                    <p class="class-students">${classItem.studentCount} sinh viên</p>
                    <p class="class-year">Khoá: ${escapeHtml(
                      classItem.academicYear || "—"
                    )}</p>
                </div>
            </div>
        </a>
      `
      )
      .join("");
  }

  function displayListView(classes) {
    hideAllViews();
    classesList.style.display = "flex";
    classesList.innerHTML = "";

    classes.forEach((classItem, index) => {
      const listItem = createListItem(classItem);
      listItem.style.opacity = "0";
      listItem.style.animation = `fadeInUp 0.5s ease ${
        index * 0.05
      }s forwards`;
      classesList.appendChild(listItem);
    });
  }

  function createListItem(classItem) {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
            <div class="list-item-content">
                <div class="class-icon">
                    <i class="fas fa-book-open"></i>
                </div>
                <div class="list-item-info">
                    <div class="list-item-column">
                        <h3>${escapeHtml(classItem.code)}</h3>
                        <p class="label">Mã lớp học</p>
                    </div>
                    <div class="list-item-column">
                        <p><strong>${classItem.studentCount}</strong> sinh viên</p>
                        <p class="label">Sĩ số</p>
                    </div>
                    <div class="list-item-column">
                        <p>${escapeHtml(classItem.academicYear || "—")}</p>
                        <p class="label">Khoá học</p>
                    </div>
                </div>
                <div class="list-item-actions">
                    <a href="/Student/ClassDetails?classId=${encodeURIComponent(
                      classItem.id
                    )}" class="list-action-btn">
                        <i class="fas fa-eye"></i> Chi tiết
                    </a>
                </div>
            </div>
        `;
    return div;
  }

  function displayTableView(classes) {
    hideAllViews();
    classesTableContainer.style.display = "block";
    classesTableBody.innerHTML = "";

    classes.forEach((classItem, index) => {
      const row = createTableRow(classItem);
      row.style.opacity = "0";
      row.style.animation = `fadeIn 0.3s ease ${index * 0.03}s forwards`;
      classesTableBody.appendChild(row);
    });
  }

  function createTableRow(classItem) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${escapeHtml(classItem.code)}</td>
            <td>${classItem.studentCount} sinh viên</td>
            <td>${escapeHtml(classItem.academicYear || "—")}</td>
            <td>
                <div class="table-actions">
                    <a href="/Student/ClassDetails?classId=${encodeURIComponent(
                      classItem.id
                    )}" class="table-action-btn">
                        <i class="fas fa-eye"></i> Xem
                    </a>
                </div>
            </td>
        `;
    return tr;
  }

  function hideAllViews() {
    classesGrid.style.display = "none";
    classesList.style.display = "none";
    classesTableContainer.style.display = "none";
  }

  function showLoadingState() {
    if (classesGrid) {
      classesGrid.style.display = "grid";
      classesGrid.innerHTML =
        '<div class="dashboard-loading"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách lớp...</div>';
    }
    if (classesList) {
      classesList.style.display = "none";
      classesList.innerHTML = "";
    }
    if (classesTableBody) {
      classesTableBody.innerHTML = "";
    }
    hideEmptyState();
  }

  function showEmptyState() {
    hideAllViews();
    if (emptyState) {
      emptyState.style.display = "block";
    }
  }

  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.display = "none";
    }
  }

  function showErrorState(message) {
    hideAllViews();
    if (classesGrid) {
      classesGrid.style.display = "grid";
      classesGrid.innerHTML = `<div class="dashboard-error">${escapeHtml(
        message
      )}</div>`;
    }
  }

  function handleTableSort(sortType) {
    const currentSort = sortSelect?.value || "name-asc";
    let newSort = "";

    if (currentSort.startsWith(sortType)) {
      newSort = currentSort.endsWith("asc")
        ? `${sortType}-desc`
        : `${sortType}-asc`;
    } else {
      newSort = `${sortType}-asc`;
    }

    if (sortSelect) {
      sortSelect.value = newSort;
    }
    filterAndRender();
  }

  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function fetchStudentClasses() {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    const user = getCurrentUser();
    const userId = normalizeId(
      user?.id || user?._id || user?.userId || user?._id?.$oid
    );

    if (!userId) {
      throw new Error("Không tìm thấy ID sinh viên. Vui lòng đăng nhập lại.");
    }

    const [userResponse, classResponse] = await Promise.all([
      fetch(`${STUDENT_CLASSES_API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${STUDENT_CLASSES_API_BASE_URL}/classes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
    ]);

    if (!userResponse.ok) {
      let message = "Không thể tải thông tin sinh viên.";
      try {
        const payload = await userResponse.json();
        message = payload?.message || message;
      } catch (err) {
        // ignore parse error
      }
      throw new Error(message);
    }

    if (!classResponse.ok) {
      let message = "Không thể tải danh sách lớp học.";
      try {
        const payload = await classResponse.json();
        message = payload?.message || message;
      } catch (err) {
        // ignore parse error
      }
      throw new Error(message);
    }

    const student = await userResponse.json();
    const classesPayload = await classResponse.json();

    const allClasses = unwrapListResponse(classesPayload).map(normalizeClass);

    const classIds = extractClassIds(student);
    const classIdSet = new Set(classIds);
    const studentIdStr = normalizeId(student?.id || student?._id || studentId);

    const enrolled = allClasses.filter((cls) => {
      if (classIdSet.has(cls.id)) return true;
      if (
        studentIdStr &&
        Array.isArray(cls.students) &&
        cls.students.some((st) => normalizeId(st) === studentIdStr)
      ) {
        return true;
      }
      return false;
    });

    return enrolled;
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Không thể đọc thông tin người dùng:", error);
      return null;
    }
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
});

/**
 * Add CSS animations dynamically
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
