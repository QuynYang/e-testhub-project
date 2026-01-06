// Admin Audit Logs API Integration
const AUDIT_LOGS_API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Normalize ID
function normalizeId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
        return value._id || value.id || value.value || value.toString?.() || null;
    }
    return null;
}

// State management
const auditLogsState = {
    logs: [],
    filteredLogs: [],
    currentPage: 1,
    itemsPerPage: 25,
    filters: {
        dateFrom: null,
        dateTo: null,
        userRole: '',
        action: ''
    }
};

// Fetch audit logs from API
async function fetchAuditLogs(filters = {}) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        console.log('📥 Fetching audit logs with filters:', filters);

        // Build query string
        const queryParams = new URLSearchParams();
        if (filters.dateFrom) {
            queryParams.append('dateFrom', filters.dateFrom);
        }
        if (filters.dateTo) {
            queryParams.append('dateTo', filters.dateTo);
        }
        if (filters.userRole) {
            queryParams.append('role', filters.userRole);
        }
        if (filters.action) {
            queryParams.append('action', filters.action);
        }

        const queryString = queryParams.toString();
        const url = `${AUDIT_LOGS_API_BASE_URL}/audit-logs${queryString ? `?${queryString}` : ''}`;

        console.log('🌐 Request URL:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tải nhật ký hệ thống.');
        }

        const logs = await response.json();
        const logsArray = Array.isArray(logs) ? logs : (logs.data || logs.results || []);
        
        console.log(`✅ Fetched ${logsArray.length} audit logs`);
        return logsArray;
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
    }
}

// Map API role to display role
function mapRoleToDisplay(apiRole) {
    const roleMap = {
        'admin': 'Quản Trị Viên',
        'teacher': 'Giáo Viên',
        'student': 'Sinh Viên'
    };
    return roleMap[apiRole] || 'Không Xác Định';
}

// Map API action to display action
function mapActionToDisplay(apiAction) {
    const actionMap = {
        'login': 'Đăng Nhập',
        'logout': 'Đăng Xuất',
        'create': 'Tạo',
        'update': 'Cập Nhật',
        'delete': 'Xóa',
        'view': 'Xem',
        'read': 'Xem'
    };
    return actionMap[apiAction] || apiAction || 'Không Xác Định';
}

// Get role badge class
function getRoleBadgeClass(role) {
    const roleMap = {
        'admin': 'role-admin',
        'teacher': 'role-teacher',
        'student': 'role-student'
    };
    return roleMap[role] || 'role-unknown';
}

// Get action badge class
function getActionBadgeClass(action) {
    const actionMap = {
        'login': 'action-login',
        'logout': 'action-logout',
        'create': 'action-create',
        'update': 'action-update',
        'delete': 'action-delete',
        'view': 'action-view',
        'read': 'action-view'
    };
    return actionMap[action] || 'action-unknown';
}

// Format date to dd/MM/yyyy HH:mm:ss
function formatDateTime(dateString) {
    if (!dateString) return 'Chưa có';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Chưa có';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return 'Chưa có';
    }
}

// Normalize audit log
function normalizeAuditLog(raw) {
    if (!raw) return null;

    const userId = normalizeId(raw.userId || raw.user?._id || raw.user?.id);
    const userEmail = raw.userEmail || raw.user?.email || 'N/A';
    const userRole = raw.userRole || raw.user?.role || 'unknown';
    const action = raw.action || raw.actionType || 'unknown';
    const description = raw.description || raw.message || raw.details || 'Không có mô tả';
    const ipAddress = raw.ipAddress || raw.ip || raw.clientIp || 'N/A';
    const status = raw.status || raw.success !== false ? 'success' : 'failed';
    const timestamp = raw.timestamp || raw.createdAt || raw.date || raw.time || new Date().toISOString();

    return {
        id: normalizeId(raw._id || raw.id),
        timestamp,
        userEmail,
        userRole,
        action,
        description,
        ipAddress,
        status,
        userAgent: raw.userAgent || raw.agent || 'N/A',
        raw
    };
}

// Render audit logs table
function renderAuditLogsTable(logs) {
    const tbody = document.querySelector('#logsTable tbody');
    if (!tbody) {
        console.warn('⚠️ Logs table tbody not found');
        return;
    }

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có nhật ký nào</td></tr>';
        updateLogCount(0, 0);
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const roleDisplay = mapRoleToDisplay(log.userRole);
        const actionDisplay = mapActionToDisplay(log.action);
        const roleClass = getRoleBadgeClass(log.userRole);
        const actionClass = getActionBadgeClass(log.action);
        const statusClass = log.status === 'success' ? 'status-success' : 'status-failed';
        const statusText = log.status === 'success' ? 'Thành Công' : 'Thất Bại';
        const formattedTime = formatDateTime(log.timestamp);

        return `
            <tr data-log-id="${log.id || ''}" style="cursor: pointer;">
                <td>${formattedTime}</td>
                <td>${escapeHtml(log.userEmail)}</td>
                <td><span class="role-badge ${roleClass}">${roleDisplay}</span></td>
                <td><span class="action-badge ${actionClass}">${actionDisplay}</span></td>
                <td>${escapeHtml(log.description)}</td>
                <td>${escapeHtml(log.ipAddress)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');

    // Attach click handlers for log details
    attachLogDetailsHandlers();

    updateLogCount(logs.length, auditLogsState.logs.length);
}

// Attach click handlers for log details modal
function attachLogDetailsHandlers() {
    const rows = document.querySelectorAll('#logsTable tbody tr');
    rows.forEach(row => {
        row.addEventListener('click', function() {
            const logId = this.getAttribute('data-log-id');
            const log = auditLogsState.filteredLogs.find(l => (l.id || '').toString() === logId);
            
            if (log) {
                showLogDetails(log);
            } else {
                // Fallback: get data from table row
                const cells = this.querySelectorAll('td');
                if (cells.length >= 7) {
                    const logData = {
                        timestamp: cells[0].textContent,
                        userEmail: cells[1].textContent,
                        userRole: cells[2].textContent,
                        action: cells[3].textContent,
                        description: cells[4].textContent,
                        ipAddress: cells[5].textContent,
                        status: cells[6].textContent
                    };
                    showLogDetailsFromTable(logData);
                }
            }
        });
    });
}

// Show log details modal
function showLogDetails(log) {
    const modal = document.getElementById('logDetailsModal');
    if (!modal) return;

    const roleDisplay = mapRoleToDisplay(log.userRole);
    const actionDisplay = mapActionToDisplay(log.action);
    const statusText = log.status === 'success' ? 'Thành Công' : 'Thất Bại';
    const formattedTime = formatDateTime(log.timestamp);

    document.getElementById('detailTimestamp').textContent = formattedTime;
    document.getElementById('detailUser').textContent = log.userEmail;
    document.getElementById('detailRole').textContent = roleDisplay;
    document.getElementById('detailAction').textContent = actionDisplay;
    document.getElementById('detailDescription').textContent = log.description;
    document.getElementById('detailIP').textContent = log.ipAddress;
    document.getElementById('detailUserAgent').textContent = log.userAgent || 'N/A';
    document.getElementById('detailStatus').textContent = statusText;

    // Show modal using Bootstrap
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Show log details from table row (fallback)
function showLogDetailsFromTable(logData) {
    const modal = document.getElementById('logDetailsModal');
    if (!modal) return;

    document.getElementById('detailTimestamp').textContent = logData.timestamp || 'N/A';
    document.getElementById('detailUser').textContent = logData.userEmail || 'N/A';
    document.getElementById('detailRole').textContent = logData.userRole || 'N/A';
    document.getElementById('detailAction').textContent = logData.action || 'N/A';
    document.getElementById('detailDescription').textContent = logData.description || 'N/A';
    document.getElementById('detailIP').textContent = logData.ipAddress || 'N/A';
    document.getElementById('detailUserAgent').textContent = 'N/A';
    document.getElementById('detailStatus').textContent = logData.status || 'N/A';

    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Update log count
function updateLogCount(visible, total) {
    const totalLogsEl = document.getElementById('totalLogs');
    if (totalLogsEl) {
        totalLogsEl.textContent = `Hiển thị ${visible} / ${total} nhật ký`;
    }
}

// Apply filters
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom')?.value || null;
    const dateTo = document.getElementById('dateTo')?.value || null;
    const userRole = document.getElementById('userFilter')?.value || '';
    const action = document.getElementById('actionFilter')?.value || '';

    auditLogsState.filters = {
        dateFrom,
        dateTo,
        userRole,
        action
    };

    console.log('🔍 Applying filters:', auditLogsState.filters);
    loadAuditLogs();
}

// Clear filters
function clearFilters() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const userFilter = document.getElementById('userFilter');
    const actionFilter = document.getElementById('actionFilter');

    if (dateFromInput) {
        dateFromInput.value = weekAgo.toISOString().split('T')[0];
    }
    if (dateToInput) {
        dateToInput.value = today.toISOString().split('T')[0];
    }
    if (userFilter) {
        userFilter.value = '';
    }
    if (actionFilter) {
        actionFilter.value = '';
    }

    auditLogsState.filters = {
        dateFrom: weekAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
        userRole: '',
        action: ''
    };

    loadAuditLogs();
}

// Export logs
function exportLogs() {
    const logs = auditLogsState.filteredLogs.length > 0 ? auditLogsState.filteredLogs : auditLogsState.logs;
    
    if (logs.length === 0) {
        alert('Không có dữ liệu để xuất');
        return;
    }

    // Convert to CSV
    const headers = ['Thời Gian', 'Người Dùng', 'Vai Trò', 'Hành Động', 'Mô Tả', 'IP Address', 'Trạng Thái'];
    const rows = logs.map(log => {
        const roleDisplay = mapRoleToDisplay(log.userRole);
        const actionDisplay = mapActionToDisplay(log.action);
        const statusText = log.status === 'success' ? 'Thành Công' : 'Thất Bại';
        const formattedTime = formatDateTime(log.timestamp);
        
        return [
            formattedTime,
            log.userEmail,
            roleDisplay,
            actionDisplay,
            log.description,
            log.ipAddress,
            statusText
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`Đã xuất ${logs.length} nhật ký thành công!`);
}

// Load audit logs
async function loadAuditLogs() {
    try {
        const tbody = document.querySelector('#logsTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';
        }

        console.log('📥 Loading audit logs...');
        const logs = await fetchAuditLogs(auditLogsState.filters);
        
        // Normalize logs
        const normalizedLogs = logs.map(normalizeAuditLog).filter(Boolean);
        
        auditLogsState.logs = normalizedLogs;
        auditLogsState.filteredLogs = normalizedLogs;
        auditLogsState.currentPage = 1;

        console.log(`✅ Loaded ${normalizedLogs.length} logs`);
        renderAuditLogsTable(normalizedLogs);
    } catch (error) {
        console.error('❌ Error loading audit logs:', error);
        const tbody = document.querySelector('#logsTable tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi: ${error.message || 'Không thể tải nhật ký'}</td></tr>`;
        }
        alert('Không thể tải nhật ký hệ thống: ' + (error.message || 'Lỗi không xác định'));
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize audit logs page
function initializeAuditLogsPage() {
    console.log('📄 Initializing audit logs page...');
    
    // Set default date range
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');

    if (dateFromInput && !dateFromInput.value) {
        dateFromInput.value = weekAgo.toISOString().split('T')[0];
    }
    if (dateToInput && !dateToInput.value) {
        dateToInput.value = today.toISOString().split('T')[0];
    }

    // Load initial data
    loadAuditLogs();

    // Setup event listeners
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const exportLogsBtn = document.getElementById('exportLogs');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', exportLogs);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded, initializing audit logs page...');
    
    // Wait a bit to ensure all elements are rendered
    setTimeout(() => {
        initializeAuditLogsPage();
    }, 100);
});

