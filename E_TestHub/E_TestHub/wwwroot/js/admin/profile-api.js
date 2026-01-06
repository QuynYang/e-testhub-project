// Profile API Integration
const API_BASE_URL = 'http://localhost:3000/api';

// Get current user ID from localStorage
function getCurrentUserId() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.id || user._id || null;
        } catch (e) {
            console.error('Error parsing user from localStorage:', e);
        }
    }
    return null;
}

// Format date to dd/MM/yyyy
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Load current user info from API
async function loadCurrentUser() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
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
            throw new Error(errorData.message || 'Không thể tải thông tin người dùng');
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading user:', error);
        throw error;
    }
}

// Populate form with user data
function populateUserForm(user) {
    // Full name (readonly)
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.value = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
    }

    // Admin ID (readonly) - from info.employeeId or info.adminId
    const adminIdInput = document.getElementById('adminId');
    if (adminIdInput) {
        const adminId = user.info?.employeeId || user.info?.adminId || user.employeeId || 'N/A';
        adminIdInput.value = adminId;
    }

    // Role/Position (readonly)
    const positionInput = document.getElementById('position');
    if (positionInput) {
        const position = user.info?.position || 'Quản trị hệ thống';
        positionInput.value = position;
    }

    // Created date (readonly)
    const createdDateInput = document.getElementById('createdDate');
    if (createdDateInput) {
        const createdDate = formatDate(user.createdAt);
        createdDateInput.value = createdDate;
    }

    // Email (editable)
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = user.email || '';
    }

    // Phone (editable) - from info.phone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.value = user.info?.phone || user.phone || '';
    }
}

// Update user info via API
async function updateUserInfo(userId, updateData) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            const text = await response.text();
            console.error('Response text:', text);
            throw new Error('Lỗi phản hồi từ server. Vui lòng thử lại.');
        }

        if (!response.ok) {
            const errorMessage = data.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

// Verify current password
async function verifyPassword(userId, password) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        }

        // Get user info to verify password
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể xác thực mật khẩu');
        }

        // Note: API doesn't return password, so we need to use login endpoint to verify
        // For now, we'll assume the password is correct if we can get user info
        // In a real implementation, you might need a separate endpoint to verify password
        
        // Alternative: Try to login with current password to verify
        const user = await response.json();
        const email = user.email;
        
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                role: user.role
            })
        });

        return loginResponse.ok;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

// Show error message
function showError(message) {
    console.error(message);
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    if (successDiv) {
        successDiv.style.display = 'none';
    }
    
    // Also show alert as fallback
    alert(message);
}

// Show success message
function showSuccess(message) {
    console.log(message);
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle profile form submission
function handleProfileForm() {
    const form = document.querySelector('.profile-form form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const userId = getCurrentUserId();
        if (!userId) {
            showError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }

        // Get form values
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const currentPasswordInput = document.getElementById('currentPassword');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        const email = emailInput?.value?.trim() || '';
        const phone = phoneInput?.value?.trim() || '';
        const currentPassword = currentPasswordInput?.value || '';
        const newPassword = newPasswordInput?.value || '';
        const confirmPassword = confirmPasswordInput?.value || '';

        // Validation
        if (!email) {
            showError('Vui lòng nhập email');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Email không hợp lệ');
            return;
        }

        // Check if password change is requested
        const isChangingPassword = currentPassword || newPassword || confirmPassword;
        
        if (isChangingPassword) {
            if (!currentPassword) {
                showError('Vui lòng nhập mật khẩu hiện tại');
                return;
            }

            if (!newPassword) {
                showError('Vui lòng nhập mật khẩu mới');
                return;
            }

            if (newPassword.length < 6) {
                showError('Mật khẩu mới phải có ít nhất 6 ký tự');
                return;
            }

            if (newPassword !== confirmPassword) {
                showError('Mật khẩu xác nhận không khớp');
                return;
            }

            // Verify current password
            const isValidPassword = await verifyPassword(userId, currentPassword);
            if (!isValidPassword) {
                showError('Mật khẩu hiện tại không đúng');
                return;
            }
        }

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang lưu...';

        try {
            // Prepare update data
            // Get current user to preserve existing info
            const currentUser = await loadCurrentUser();
            
            const updateData = {
                email: email.toLowerCase(),
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                info: {
                    ...(currentUser.info || {}),
                    phone: phone
                }
            };

            // Add password if changing - API will hash it via pre-save hook
            if (isChangingPassword) {
                updateData.password = newPassword;
            }

            console.log('Updating user with data:', { ...updateData, password: '***' });

            // Update user
            const result = await updateUserInfo(userId, updateData);
            console.log('User updated successfully:', result);

            // Update localStorage with new user data
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    user.email = result.email || email;
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (e) {
                    console.error('Error updating localStorage:', e);
                }
            }

            showSuccess('Cập nhật thông tin thành công!');

            // Clear password fields
            if (currentPasswordInput) currentPasswordInput.value = '';
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';

        } catch (error) {
            console.error('Error updating profile:', error);
            showError(error.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load and populate user data
        const user = await loadCurrentUser();
        populateUserForm(user);
        
        // Handle form submission
        handleProfileForm();
    } catch (error) {
        console.error('Error initializing profile:', error);
        showError(error.message || 'Không thể tải thông tin tài khoản. Vui lòng thử lại.');
    }
});

