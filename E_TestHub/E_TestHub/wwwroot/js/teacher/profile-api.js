// Teacher Profile API Integration
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

// Populate form with teacher data
function populateTeacherForm(teacher) {
    // Full name (readonly)
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.value = teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'N/A';
    }

    // Teacher ID (readonly) - from info.employeeId or info.teacherId
    const teacherIdInput = document.getElementById('teacherId');
    if (teacherIdInput) {
        const teacherId = teacher.info?.employeeId || teacher.info?.teacherId || teacher.employeeId || 'N/A';
        teacherIdInput.value = teacherId;
    }

    // Department (readonly) - from info.department
    const departmentInput = document.getElementById('department');
    if (departmentInput) {
        const department = teacher.info?.department || 'N/A';
        departmentInput.value = department;
    }

    // Faculty (readonly) - from info.faculty
    const facultyInput = document.getElementById('faculty');
    if (facultyInput) {
        const faculty = teacher.info?.faculty || 'N/A';
        facultyInput.value = faculty;
    }

    // Email (editable)
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = teacher.email || '';
    }

    // Phone (editable) - from info.phone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.value = teacher.info?.phone || teacher.phone || '';
    }
}

// Update teacher info via API
async function updateTeacherInfo(teacherId, updateData) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${API_BASE_URL}/users/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể cập nhật thông tin giáo viên.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating teacher info:', error);
        throw error;
    }
}

// Verify current password by attempting a login
async function verifyPassword(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role: 'teacher' })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Mật khẩu hiện tại không đúng.');
        }

        return true;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
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
    const form = document.getElementById('profileForm');
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

        // Client-side validation
        if (!email) {
            showError('Vui lòng nhập email.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Email không hợp lệ.');
            return;
        }

        let isChangingPassword = false;
        if (newPassword || confirmPassword) {
            isChangingPassword = true;
            if (!currentPassword) {
                showError('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.');
                return;
            }
            if (newPassword.length < 6) {
                showError('Mật khẩu mới phải có ít nhất 6 ký tự.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
                return;
            }
        }

        // Disable submit button
        const submitBtn = form.querySelector('.save-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang lưu...';

        try {
            // Prepare update data
            // Get current teacher to preserve existing info (firstName, lastName, other info fields)
            const currentTeacher = await loadCurrentTeacher();
            
            const updateData = {
                email: email.toLowerCase(),
                firstName: currentTeacher.firstName, // Preserve existing first name
                lastName: currentTeacher.lastName,   // Preserve existing last name
                info: {
                    ...(currentTeacher.info || {}), // Preserve other info fields
                    phone: phone,
                    department: currentTeacher.info?.department, // Preserve department
                    faculty: currentTeacher.info?.faculty,       // Preserve faculty
                    employeeId: currentTeacher.info?.employeeId || currentTeacher.info?.teacherId // Preserve teacher ID
                }
            };

            // Add password if changing - API will hash it via pre-save hook
            if (isChangingPassword) {
                await verifyPassword(currentTeacher.email, currentPassword); // Verify old password
                updateData.password = newPassword;
            }

            console.log('Updating teacher with data:', { ...updateData, password: isChangingPassword ? '***' : '[unchanged]' });

            // Update teacher
            const result = await updateTeacherInfo(userId, updateData);
            console.log('Teacher updated successfully:', result);
            showSuccess('Cập nhật thông tin tài khoản thành công!');

            // Update localStorage with new email and full name if changed
            const updatedTeacherInStorage = JSON.parse(localStorage.getItem('user'));
            if (updatedTeacherInStorage) {
                updatedTeacherInStorage.email = result.email;
                updatedTeacherInStorage.fullName = result.fullName || `${result.firstName} ${result.lastName}`.trim();
                localStorage.setItem('user', JSON.stringify(updatedTeacherInStorage));
            }
            
            // Clear password fields after successful update
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';

            // Reload form data to reflect any server-side changes
            const updatedTeacher = await loadCurrentTeacher();
            populateTeacherForm(updatedTeacher);

        } catch (error) {
            console.error('Error updating profile:', error);
            showError(error.message || 'Không thể cập nhật thông tin tài khoản. Vui lòng thử lại.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const teacher = await loadCurrentTeacher();
        populateTeacherForm(teacher);
    } catch (error) {
        // Error already shown by loadCurrentTeacher
        console.error('Failed to initialize profile page:', error);
    }
    handleProfileForm();
});

