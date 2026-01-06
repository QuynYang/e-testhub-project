// User Management API Integration
const API_BASE_URL = 'http://localhost:3000/api';

// Map API role to display role
function mapRoleToDisplay(apiRole) {
    const roleMap = {
        'student': 'Sinh Viên',
        'teacher': 'Giáo Viên',
        'admin': 'Quản Trị Viên'
    };
    return roleMap[apiRole] || 'Không Xác Định';
}

// Map API role to C# role for filtering
function mapRoleToFilter(apiRole) {
    const roleMap = {
        'student': 'Student',
        'teacher': 'Teacher',
        'admin': 'Admin'
    };
    return roleMap[apiRole] || '';
}

// Format date to dd/MM/yyyy
function formatDate(dateString) {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Chưa có';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format date with time to dd/MM/yyyy HH:mm
function formatDateTime(dateString) {
    if (!dateString) return 'Chưa đăng nhập';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Chưa đăng nhập';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Calculate users created this week
function getUsersThisWeek(users) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return users.filter(user => {
        if (!user.createdAt) return false;
        const createdDate = new Date(user.createdAt);
        return createdDate >= weekAgo && createdDate <= now;
    }).length;
}

// Load users from API
async function loadUsersFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            showError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
            return;
        }

        // Fetch users
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải danh sách người dùng');
        }

        const users = await response.json();
        
        // Update statistics
        updateStatistics(users);
        
        // Update users table
        updateUsersTable(users);
        
        return users;
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Không thể tải danh sách người dùng. Vui lòng thử lại.');
    }
}

// Update statistics cards
function updateStatistics(users) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length; // Default to true if undefined
    const inactiveUsers = users.filter(u => u.isActive === false).length;
    const newThisWeek = getUsersThisWeek(users);

    // Update stat cards
    const statCards = document.querySelectorAll('.stat-number');
    if (statCards.length >= 4) {
        statCards[0].textContent = totalUsers || 0;
        statCards[1].textContent = activeUsers || 0;
        statCards[2].textContent = inactiveUsers || 0;
        statCards[3].textContent = newThisWeek || 0;
    }
}

// Update users table
function updateUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có người dùng nào</td></tr>';
        updateTableInfo(0, 0);
        return;
    }

    // Create rows for each user
    users.forEach(user => {
        const userId = user._id || user.id;
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
        const email = user.email || 'N/A';
        const role = mapRoleToDisplay(user.role);
        const roleClass = user.role ? `role-${user.role.toLowerCase()}` : '';
        const isActive = user.isActive !== false; // Default to true
        const statusClass = isActive ? 'status-active' : 'status-inactive';
        const statusText = isActive ? 'Hoạt Động' : 'Không Hoạt Động';
        const createdDate = formatDate(user.createdAt);
        const lastLogin = formatDateTime(user.lastLogin || user.updatedAt);
        
        // Get studentId or employeeId from info object or direct field
        const studentId = user.info?.studentId || user.studentId || '';
        const employeeId = user.info?.employeeId || user.employeeId || '';
        const userIdDisplay = studentId || employeeId || 'N/A';

        const row = document.createElement('tr');
        row.setAttribute('data-user-id', userId);
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-checkbox" value="${userId}" />
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${fullName}</div>
                        <div class="user-id">${userIdDisplay}</div>
                    </div>
                </div>
            </td>
            <td>${email}</td>
            <td>
                <span class="role-badge ${roleClass}">${role}</span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>${createdDate}</td>
            <td>${lastLogin}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" title="Xem chi tiết" data-user-id="${userId}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" title="Chỉnh sửa" data-user-id="${userId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isActive ? 
                        `<button class="btn-action btn-deactivate" title="Vô hiệu hóa" data-user-id="${userId}">
                            <i class="fas fa-pause"></i>
                        </button>` :
                        `<button class="btn-action btn-activate" title="Kích hoạt" data-user-id="${userId}">
                            <i class="fas fa-play"></i>
                        </button>`
                    }
                    <button class="btn-action btn-delete" title="Xóa" data-user-id="${userId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Update table info
    updateTableInfo(users.length, users.length);
    
    // Re-attach event listeners
    attachEventListeners();
    
    // Re-attach select all checkbox
    if (window.attachSelectAll) {
        window.attachSelectAll();
    }
}

// Update table info
function updateTableInfo(visible, total) {
    const tableInfo = document.getElementById('tableInfo');
    if (tableInfo) {
        tableInfo.textContent = `Hiển thị ${visible} / ${total} người dùng`;
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
    // You can implement a toast notification here
    console.log(message);
    alert(message);
}

// Delete a single user via API
async function deleteUser(userId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể xóa người dùng');
        }

        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

// Delete multiple users via API
async function deleteUsers(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Không có người dùng nào được chọn');
    }

    const results = {
        success: [],
        failed: []
    };

    for (const userId of userIds) {
        try {
            await deleteUser(userId);
            results.success.push(userId);
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            results.failed.push({ userId, error: error.message });
        }
    }

    return results;
}

// Attach event listeners to dynamically created elements
function attachEventListeners() {
    // View user details
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            alert('Xem chi tiết người dùng ID: ' + userId + ' (Tính năng sẽ được triển khai sau)');
        });
    });

    // Edit user
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            alert('Chỉnh sửa người dùng ID: ' + userId + ' (Tính năng sẽ được triển khai sau)');
        });
    });

    // Activate/Deactivate user
    document.querySelectorAll('.btn-activate, .btn-deactivate').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const action = this.classList.contains('btn-activate') ? 'kích hoạt' : 'vô hiệu hóa';
            if (confirm('Bạn có chắc muốn ' + action + ' người dùng này?')) {
                alert('Đang ' + action + ' người dùng... (Tính năng sẽ được triển khai sau)');
                loadUsersFromAPI(); // Reload users
            }
        });
    });

    // Delete user
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async function() {
            const userId = this.getAttribute('data-user-id');
            if (!userId) {
                showError('Không tìm thấy ID người dùng');
                return;
            }

            if (confirm('Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
                try {
                    // Disable button during deletion
                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                    await deleteUser(userId);
                    showSuccess('Xóa người dùng thành công!');
                    
                    // Reload users list
                    await loadUsersFromAPI();
                } catch (error) {
                    showError(error.message || 'Không thể xóa người dùng. Vui lòng thử lại.');
                    // Restore button
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-trash"></i>';
                }
            }
        });
    });

    // User checkboxes
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = document.querySelectorAll('.user-checkbox:checked').length === document.querySelectorAll('.user-checkbox').length;
            const selectAll = document.getElementById('selectAll');
            if (selectAll) {
                selectAll.checked = allChecked;
            }
            updateBulkActions();
        });
    });
}

// Update bulk action buttons
function updateBulkActions() {
    const selectedCount = document.querySelectorAll('.user-checkbox:checked').length;
    const bulkButtons = ['bulkActivate', 'bulkDeactivate', 'bulkDelete'];
    
    bulkButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = selectedCount === 0;
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load users from API
    loadUsersFromAPI();
    
    // Select all checkbox - attach after table is loaded
    function attachSelectAll() {
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            // Remove existing listeners by cloning
            const newSelectAll = selectAll.cloneNode(true);
            selectAll.parentNode.replaceChild(newSelectAll, selectAll);
            
            newSelectAll.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.user-checkbox');
                checkboxes.forEach(cb => cb.checked = this.checked);
                updateBulkActions();
            });
        }
    }
    
    // Attach initially
    attachSelectAll();
    
    // Re-attach after table update (will be called from updateUsersTable)
    window.attachSelectAll = attachSelectAll;
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const value = this.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTable tbody tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const isVisible = text.indexOf(value) > -1;
                row.style.display = isVisible ? '' : 'none';
                if (isVisible) visibleCount++;
            });
            
            const totalCount = rows.length;
            updateTableInfo(visibleCount, totalCount);
        });
    }
    
    // Clear search
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            const rows = document.querySelectorAll('#usersTable tbody tr');
            rows.forEach(row => row.style.display = '');
            const totalCount = rows.length;
            updateTableInfo(totalCount, totalCount);
        });
    }
    
    // Filters
    const applyFilters = document.getElementById('applyFilters');
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            const roleFilter = document.getElementById('roleFilter')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            const rows = document.querySelectorAll('#usersTable tbody tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                let show = true;
                
                if (roleFilter) {
                    const roleBadge = row.querySelector('.role-badge');
                    const roleText = roleBadge ? roleBadge.textContent.trim() : '';
                    const roleMap = {
                        'Sinh Viên': 'Student',
                        'Giáo Viên': 'Teacher',
                        'Quản Trị Viên': 'Admin'
                    };
                    if (roleMap[roleText] !== roleFilter) show = false;
                }
                
                if (statusFilter !== '') {
                    const isActive = row.querySelector('.status-badge')?.classList.contains('status-active');
                    const filterActive = statusFilter === 'true';
                    if (isActive !== filterActive) show = false;
                }
                
                row.style.display = show ? '' : 'none';
                if (show) visibleCount++;
            });
            
            const totalCount = rows.length;
            updateTableInfo(visibleCount, totalCount);
        });
    }
    
    // Reset filters
    const resetFilters = document.getElementById('resetFilters');
    if (resetFilters) {
        resetFilters.addEventListener('click', function() {
            const roleFilter = document.getElementById('roleFilter');
            const statusFilter = document.getElementById('statusFilter');
            if (roleFilter) roleFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            
            const rows = document.querySelectorAll('#usersTable tbody tr');
            rows.forEach(row => row.style.display = '');
            const totalCount = rows.length;
            updateTableInfo(totalCount, totalCount);
        });
    }
});

