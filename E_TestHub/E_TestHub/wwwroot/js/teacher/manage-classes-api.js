// Teacher Manage Classes API Integration
const API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// Get current user ID from localStorage
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? (user.id || user._id) : null;
}

// Load current teacher data from API
async function loadCurrentTeacher() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải thông tin giáo viên.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading teacher:', error);
        throw error;
    }
}

// Load all classes from API
async function loadAllClasses() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/classes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải danh sách lớp học.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading classes:', error);
        throw error;
    }
}

// Get course info by ID
async function getCourseInfo(courseId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Không tìm thấy token xác thực.');
        }

        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Could not fetch course ${courseId}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching course ${courseId}:`, error);
        return null;
    }
}

// Format academic year
function formatAcademicYear(academicYear) {
    if (!academicYear) return 'N/A';
    
    // If it's already formatted (e.g., "2023 - 2027")
    if (typeof academicYear === 'string' && academicYear.includes(' - ')) {
        return academicYear;
    }
    
    // If it's in format "2023-2027"
    if (typeof academicYear === 'string' && academicYear.includes('-')) {
        return academicYear.replace('-', ' - ');
    }
    
    // If it's an object with startYear and endYear
    if (typeof academicYear === 'object' && academicYear.startYear && academicYear.endYear) {
        return `${academicYear.startYear} - ${academicYear.endYear}`;
    }
    
    return academicYear.toString();
}

// Load classes taught by current teacher
async function loadTeacherClasses() {
    try {
        // Load current teacher to get teachingSubjects
        const teacher = await loadCurrentTeacher();
        const teachingSubjects = teacher.teachingSubjects || [];
        
        if (teachingSubjects.length === 0) {
            console.log('Teacher has no assigned classes');
            return [];
        }

        // Load all classes
        const allClasses = await loadAllClasses();
        
        // Filter classes that are in teachingSubjects
        const teacherClasses = allClasses.filter(cls => {
            const classId = cls._id || cls.id;
            return teachingSubjects.includes(classId);
        });

        // Enrich classes with course information
        const enrichedClasses = await Promise.all(
            teacherClasses.map(async (cls) => {
                let academicYear = cls.academicYear;
                
                // If class has courseId, try to get academicYear from course
                if (cls.courseId && !academicYear) {
                    const course = await getCourseInfo(cls.courseId);
                    if (course) {
                        if (course.academicYear) {
                            academicYear = course.academicYear;
                        } else if (course.startYear && course.endYear) {
                            academicYear = `${course.startYear} - ${course.endYear}`;
                        }
                    }
                }

                return {
                    id: cls._id || cls.id,
                    name: cls.classCode || cls.name || 'N/A',
                    students: Array.isArray(cls.students) ? cls.students.length : (cls.studentCount || 0),
                    year: formatAcademicYear(academicYear),
                    classCode: cls.classCode || cls.name || 'N/A'
                };
            })
        );

        return enrichedClasses;
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        return [];
    }
}

// Update classes data in the existing manage-classes.js
async function updateClassesFromAPI() {
    try {
        const classesGrid = document.getElementById('classesGrid');
        const classesList = document.getElementById('classesList');
        const classesTableBody = document.getElementById('classesTableBody');
        const emptyState = document.getElementById('emptyState');

        // Show loading state
        if (classesGrid) {
            classesGrid.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Đang tải dữ liệu...</p></div>';
        }

        // Load classes from API
        const classes = await loadTeacherClasses();

        if (classes.length === 0) {
            // Show empty state
            if (classesGrid) classesGrid.innerHTML = '';
            if (classesList) classesList.innerHTML = '';
            if (classesTableBody) classesTableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';

        // Clear existing hardcoded cards
        if (classesGrid) {
            classesGrid.innerHTML = '';
        }

        // Render grid view cards
        classes.forEach((classItem) => {
            const card = createClassCard(classItem);
            if (classesGrid) {
                classesGrid.appendChild(card);
            }
        });

        // Update the classesData array used by manage-classes.js
        window.classesData = classes;

        // Dispatch event to notify manage-classes.js
        const event = new CustomEvent('classesDataUpdated', { detail: classes });
        document.dispatchEvent(event);
        
        // Also trigger re-render if manage-classes.js is already loaded
        if (typeof filterAndDisplay === 'function') {
            setTimeout(() => {
                filterAndDisplay();
            }, 100);
        }

    } catch (error) {
        console.error('Error updating classes from API:', error);
        const classesGrid = document.getElementById('classesGrid');
        if (classesGrid) {
            classesGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: red;"><i class="fas fa-exclamation-triangle"></i><p>Không thể tải dữ liệu lớp học. Vui lòng thử lại sau.</p></div>';
        }
    }
}

// Create class card element
function createClassCard(classItem) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.setAttribute('data-class-name', classItem.name);
    card.setAttribute('data-students', classItem.students);
    card.setAttribute('data-year', classItem.year);
    
    card.innerHTML = `
        <div class="class-card-content">
            <div class="class-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="class-info">
                <h3 class="class-name">${classItem.name}</h3>
                <p class="class-students">${classItem.students} sinh viên</p>
                <p class="class-year">Khoá: ${classItem.year}</p>
            </div>
            <div class="class-actions">
                <a href="/Teacher/ClassDetails?classId=${classItem.name}" class="class-action-btn" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </a>
            </div>
        </div>
    `;
    
    // Add click event for card navigation
    card.addEventListener('click', function(e) {
        if (e.target.closest('.class-action-btn')) {
            return;
        }
        if (typeof manageClassDetail === 'function') {
            manageClassDetail(classItem.name);
        } else {
            window.location.href = `/Teacher/ClassDetails?classId=${classItem.name}`;
        }
    });
    
    return card;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for manage-classes.js to load first
    setTimeout(() => {
        updateClassesFromAPI();
    }, 100);
});

