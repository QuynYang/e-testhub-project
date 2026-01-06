// Dashboard API Integration
const API_BASE_URL = 'http://localhost:3000/api';

// Format number with thousand separator
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate percentage change
function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
}

// Get users created this month
function getUsersThisMonth(users) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return users.filter(user => {
        if (!user.createdAt) return false;
        const createdDate = new Date(user.createdAt);
        return createdDate >= monthStart && createdDate <= now;
    });
}

// Get users created last month (for comparison)
function getUsersLastMonth(users) {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return users.filter(user => {
        if (!user.createdAt) return false;
        const createdDate = new Date(user.createdAt);
        return createdDate >= lastMonthStart && createdDate <= lastMonthEnd;
    });
}

// Get most recent user creation
function getMostRecentUserCreation(users) {
    if (!users || users.length === 0) return null;
    
    const usersWithDate = users
        .filter(user => user.createdAt)
        .map(user => ({
            ...user,
            createdAt: new Date(user.createdAt)
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
    
    return usersWithDate[0] || null;
}

// Format date time for display
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let dateText = '';
    if (dateOnly.getTime() === today.getTime()) {
        dateText = 'Hôm nay';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateText = 'Hôm qua';
    } else {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        dateText = `${day}/${month}/${year}`;
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateText}, ${hours}:${minutes}`;
}

// Load users from API
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return [];
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải danh sách người dùng');
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// Update dashboard statistics
async function updateDashboardStats() {
    try {
        const users = await loadUsers();
        
        if (users.length === 0) {
            console.warn('No users found');
            return;
        }

        // Filter by role and active status
        const activeStudents = users.filter(u => u.role === 'student' && u.isActive !== false);
        const activeTeachers = users.filter(u => u.role === 'teacher' && u.isActive !== false);
        
        // Get users from last month for comparison
        const lastMonthUsers = getUsersLastMonth(users);
        const lastMonthActiveStudents = lastMonthUsers.filter(u => u.role === 'student' && u.isActive !== false);
        const lastMonthActiveTeachers = lastMonthUsers.filter(u => u.role === 'teacher' && u.isActive !== false);
        
        // Calculate percentage change
        const studentGrowth = calculatePercentageChange(activeStudents.length, lastMonthActiveStudents.length);
        const teacherGrowth = calculatePercentageChange(activeTeachers.length, lastMonthActiveTeachers.length);
        
        // Get unique departments for teachers (from info.department)
        const teacherDepartments = new Set();
        activeTeachers.forEach(teacher => {
            if (teacher.info?.department) {
                teacherDepartments.add(teacher.info.department);
            }
        });
        
        // Update student statistics
        const dashboardItems = document.querySelectorAll('.dashboard-item');
        
        // First item: Students
        if (dashboardItems.length > 0) {
            const studentItem = dashboardItems[0];
            const studentSubtitles = studentItem.querySelectorAll('.dashboard-item-subtitle');
            if (studentSubtitles.length >= 1) {
                studentSubtitles[0].textContent = `${formatNumber(activeStudents.length)} sinh viên đang hoạt động`;
            }
            if (studentSubtitles.length >= 2) {
                if (studentGrowth > 0) {
                    studentSubtitles[1].textContent = `Tăng ${studentGrowth}% so với tháng trước`;
                } else if (studentGrowth < 0) {
                    studentSubtitles[1].textContent = `Giảm ${Math.abs(studentGrowth)}% so với tháng trước`;
                } else {
                    studentSubtitles[1].textContent = 'Không thay đổi so với tháng trước';
                }
            }
        }
        
        // Second item: Teachers
        if (dashboardItems.length > 1) {
            const teacherItem = dashboardItems[1];
            const teacherSubtitles = teacherItem.querySelectorAll('.dashboard-item-subtitle');
            if (teacherSubtitles.length >= 1) {
                teacherSubtitles[0].textContent = `${formatNumber(activeTeachers.length)} giáo viên đang hoạt động`;
            }
            if (teacherSubtitles.length >= 2) {
                const deptCount = teacherDepartments.size || 0;
                teacherSubtitles[1].textContent = `Trong ${deptCount} khoa khác nhau`;
            }
        }
        
        // Update recent activities
        const thisMonthUsers = getUsersThisMonth(users);
        const newStudents = thisMonthUsers.filter(u => u.role === 'student');
        const mostRecentUser = getMostRecentUserCreation(users);
        
        // Third item: New accounts (in Recent Activities section)
        const recentActivitiesItems = document.querySelectorAll('.dashboard-content-sections .dashboard-item');
        if (recentActivitiesItems.length > 0) {
            const newAccountsItem = recentActivitiesItems[0];
            const newAccountsSubtitles = newAccountsItem.querySelectorAll('.dashboard-item-subtitle');
            if (newAccountsSubtitles.length >= 1) {
                newAccountsSubtitles[0].textContent = `${newStudents.length} tài khoản sinh viên mới`;
            }
            if (newAccountsSubtitles.length >= 2 && mostRecentUser) {
                newAccountsSubtitles[1].textContent = formatDateTime(mostRecentUser.createdAt);
            }
        }
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Update dashboard statistics
    updateDashboardStats();
});

