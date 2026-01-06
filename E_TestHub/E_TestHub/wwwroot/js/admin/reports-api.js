// Reports API Integration
const REPORTS_API_BASE_URL = 'http://localhost:3000/api';

// Get authentication token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Fetch users from API
async function fetchUsers() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${REPORTS_API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch users');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

// Fetch exams from API
async function fetchExams() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${REPORTS_API_BASE_URL}/exams`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch exams');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching exams:', error);
        throw error;
    }
}

// Fetch exam results from API
async function fetchExamResults() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${REPORTS_API_BASE_URL}/exam-results`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch exam results');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching exam results:', error);
        throw error;
    }
}

// Calculate user statistics
function calculateUserStats(users) {
    if (!Array.isArray(users)) return null;

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;

    return {
        totalUsers,
        activeUsers,
        students,
        teachers,
        admins
    };
}

// Calculate exam statistics
function calculateExamStats(exams, examResults) {
    if (!Array.isArray(exams)) return null;

    const totalExams = exams.length;
    
    // Count completed exams (exams with at least one result)
    const completedExamIds = new Set();
    if (Array.isArray(examResults)) {
        examResults.forEach(result => {
            if (result.examId) {
                completedExamIds.add(result.examId.toString());
            }
        });
    }
    const completedExams = completedExamIds.size;

    return {
        totalExams,
        completedExams
    };
}

// Get date range based on filter
function getDateRange(dateRangeValue, startDate, endDate) {
    const now = new Date();
    let start, end;

    switch (dateRangeValue) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59);
            } else {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start, end };
}

// Filter data by date range
function filterByDateRange(data, dateField, start, end) {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
        if (!item[dateField]) return false;
        const itemDate = new Date(item[dateField]);
        return itemDate >= start && itemDate <= end;
    });
}

// Calculate daily statistics for detailed report
function calculateDailyStats(users, exams, examResults, dateRange) {
    const { start, end } = dateRange;
    const dailyStats = {};
    
    // Initialize all days in range
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyStats[dateKey] = {
            date: new Date(currentDate),
            newUsers: 0,
            examsCreated: 0,
            examsCompleted: 0,
            averageScore: 0,
            totalScores: 0,
            scoreCount: 0
        };
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count new users
    if (Array.isArray(users)) {
        users.forEach(user => {
            if (user.createdAt) {
                const userDate = new Date(user.createdAt);
                if (userDate >= start && userDate <= end) {
                    const dateKey = userDate.toISOString().split('T')[0];
                    if (dailyStats[dateKey]) {
                        dailyStats[dateKey].newUsers++;
                    }
                }
            }
        });
    }

    // Count exams created
    if (Array.isArray(exams)) {
        exams.forEach(exam => {
            if (exam.createdAt) {
                const examDate = new Date(exam.createdAt);
                if (examDate >= start && examDate <= end) {
                    const dateKey = examDate.toISOString().split('T')[0];
                    if (dailyStats[dateKey]) {
                        dailyStats[dateKey].examsCreated++;
                    }
                }
            }
        });
    }

    // Count exams completed and calculate average score
    if (Array.isArray(examResults)) {
        examResults.forEach(result => {
            if (result.submittedAt) {
                const resultDate = new Date(result.submittedAt);
                if (resultDate >= start && resultDate <= end) {
                    const dateKey = resultDate.toISOString().split('T')[0];
                    if (dailyStats[dateKey]) {
                        dailyStats[dateKey].examsCompleted++;
                        if (result.score && result.score.earned !== undefined) {
                            dailyStats[dateKey].totalScores += result.score.earned;
                            dailyStats[dateKey].scoreCount++;
                        }
                    }
                }
            }
        });
    }

    // Calculate average scores
    Object.keys(dailyStats).forEach(dateKey => {
        const stats = dailyStats[dateKey];
        if (stats.scoreCount > 0) {
            stats.averageScore = (stats.totalScores / stats.scoreCount).toFixed(1);
        }
    });

    // Convert to array and sort by date
    return Object.values(dailyStats)
        .filter(stat => stat.newUsers > 0 || stat.examsCreated > 0 || stat.examsCompleted > 0)
        .sort((a, b) => b.date - a.date);
}

// Format date to dd/MM/yyyy
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Update stat cards
function updateStatCards(userStats, examStats) {
    // Total Users
    const totalUsersEl = document.getElementById('statTotalUsers');
    if (totalUsersEl && userStats) {
        totalUsersEl.textContent = userStats.totalUsers || 0;
    }

    // Active Users
    const activeUsersEl = document.getElementById('statActiveUsers');
    if (activeUsersEl && userStats) {
        activeUsersEl.textContent = userStats.activeUsers || 0;
    }

    // Students
    const studentsEl = document.getElementById('statStudents');
    if (studentsEl && userStats) {
        studentsEl.textContent = userStats.students || 0;
    }

    // Teachers
    const teachersEl = document.getElementById('statTeachers');
    if (teachersEl && userStats) {
        teachersEl.textContent = userStats.teachers || 0;
    }

    // Total Exams
    const totalExamsEl = document.getElementById('statTotalExams');
    if (totalExamsEl && examStats) {
        totalExamsEl.textContent = examStats.totalExams || 0;
    }

    // Completed Exams
    const completedExamsEl = document.getElementById('statCompletedExams');
    if (completedExamsEl && examStats) {
        completedExamsEl.textContent = examStats.completedExams || 0;
    }
}

// Update user role chart
function updateUserRoleChart(userStats) {
    if (!userStats) return;

    const chartElement = document.getElementById('userRoleChart');
    if (!chartElement) return;

    const ctx = chartElement.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.userRoleChart) {
        window.userRoleChart.destroy();
    }

    window.userRoleChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sinh Viên', 'Giáo Viên', 'Quản Trị Viên'],
            datasets: [{
                data: [
                    userStats.students || 0,
                    userStats.teachers || 0,
                    userStats.admins || 0
                ],
                backgroundColor: [
                    '#2E8BE9',
                    '#10B981',
                    '#F59E0B'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update exam activity chart
function updateExamActivityChart(exams, examResults, dateRange) {
    const chartElement = document.getElementById('examActivityChart');
    if (!chartElement) return;

    const { start, end } = dateRange;
    
    // Group by week
    const weeks = [];
    const currentWeekStart = new Date(start);
    
    while (currentWeekStart <= end) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > end) weekEnd = new Date(end);
        
        weeks.push({
            start: new Date(currentWeekStart),
            end: weekEnd,
            label: `Tuần ${weeks.length + 1}`
        });
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    const examsCreatedData = weeks.map(week => {
        return (exams || []).filter(exam => {
            if (!exam.createdAt) return false;
            const examDate = new Date(exam.createdAt);
            return examDate >= week.start && examDate <= week.end;
        }).length;
    });

    const examsCompletedData = weeks.map(week => {
        return (examResults || []).filter(result => {
            if (!result.submittedAt) return false;
            const resultDate = new Date(result.submittedAt);
            return resultDate >= week.start && resultDate <= week.end;
        }).length;
    });

    const ctx = chartElement.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.examActivityChart) {
        window.examActivityChart.destroy();
    }

    window.examActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(w => w.label),
            datasets: [{
                label: 'Kỳ Thi Tạo',
                data: examsCreatedData,
                borderColor: '#2E8BE9',
                backgroundColor: 'rgba(46, 139, 233, 0.1)',
                tension: 0.4
            }, {
                label: 'Kỳ Thi Hoàn Thành',
                data: examsCompletedData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update detailed reports table
function updateReportsTable(dailyStats) {
    const tbody = document.querySelector('#reportsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!dailyStats || dailyStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Không có dữ liệu</td></tr>';
        return;
    }

    dailyStats.forEach(stat => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(stat.date)}</td>
            <td>${stat.newUsers || 0}</td>
            <td>${stat.examsCreated || 0}</td>
            <td>${stat.examsCompleted || 0}</td>
            <td>${stat.averageScore || '0.0'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Show error message
function showError(message) {
    // You can implement a toast notification here
    console.error(message);
    alert(message);
}

// Load and update all statistics
async function loadReportsData() {
    try {
        // Show loading state
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(el => {
            if (el.textContent.trim() === '') {
                el.textContent = '...';
            }
        });

        // Fetch all data in parallel
        const [users, exams, examResults] = await Promise.all([
            fetchUsers().catch(err => {
                console.error('Error fetching users:', err);
                return [];
            }),
            fetchExams().catch(err => {
                console.error('Error fetching exams:', err);
                return [];
            }),
            fetchExamResults().catch(err => {
                console.error('Error fetching exam results:', err);
                return [];
            })
        ]);

        // Calculate statistics
        const userStats = calculateUserStats(users);
        const examStats = calculateExamStats(exams, examResults);

        // Update stat cards
        updateStatCards(userStats, examStats);

        // Get current date range
        const dateRangeValue = document.getElementById('dateRange')?.value || 'week';
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const dateRange = getDateRange(dateRangeValue, startDate, endDate);

        // Update charts
        updateUserRoleChart(userStats);
        updateExamActivityChart(exams, examResults, dateRange);

        // Calculate and update daily stats
        const dailyStats = calculateDailyStats(users, exams, examResults, dateRange);
        updateReportsTable(dailyStats);

    } catch (error) {
        console.error('Error loading reports data:', error);
        showError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    }
}

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadReportsData();

    // Handle date range change
    const dateRangeSelect = document.getElementById('dateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            const isCustom = this.value === 'custom';
            const dateRangeGroups = document.querySelectorAll('.date-range-group');
            dateRangeGroups.forEach(group => {
                group.style.display = isCustom ? 'block' : 'none';
            });
            
            // Reload data with new date range
            if (!isCustom) {
                loadReportsData();
            }
        });
    }

    // Handle custom date range inputs
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            if (dateRangeSelect?.value === 'custom') {
                loadReportsData();
            }
        });
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            if (dateRangeSelect?.value === 'custom') {
                loadReportsData();
            }
        });
    }

    // Handle generate report button
    const generateReportBtn = document.getElementById('generateReport');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            loadReportsData();
        });
    }

    // Handle export report button
    const exportReportBtn = document.getElementById('exportReport');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            // TODO: Implement export functionality
            alert('Tính năng xuất báo cáo sẽ được triển khai sau.');
        });
    }
});

