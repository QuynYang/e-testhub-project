// Create User API Integration
const API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// Map C# UserRole enum to API role string
function mapRoleToAPI(roleValue) {
    const roleMap = {
        // Numeric values
        '1': 'student',
        '2': 'teacher',
        '3': 'admin',
        // String values (from C# enum ToString())
        'Student': 'student',
        'Teacher': 'teacher',
        'Admin': 'admin',
        // Lowercase variants
        'student': 'student',
        'teacher': 'teacher',
        'admin': 'admin'
    };
    return roleMap[roleValue] || 'student';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    if (successDiv) {
        successDiv.style.display = 'none';
    }
    
    // Scroll to top to show error
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show success message
function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Clear messages
function clearMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

// Show loading state
function setLoading(isLoading) {
    const createBtn = document.getElementById('createUserBtn');
    
    if (createBtn) {
        createBtn.disabled = isLoading;
        if (isLoading) {
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
        } else {
            createBtn.innerHTML = '<i class="fas fa-user-plus"></i> Tạo Người Dùng';
        }
    }
}

// Validate form
function validateForm() {
    clearMessages();
    
    const email = document.getElementById('Email')?.value?.trim() || '';
    const firstName = document.getElementById('firstName')?.value?.trim() || '';
    const lastName = document.getElementById('lastName')?.value?.trim() || '';
    const role = document.getElementById('roleSelect')?.value || '';
    const password = document.getElementById('Password')?.value || '';
    const confirmPassword = document.getElementById('ConfirmPassword')?.value || '';
    
    let isValid = true;
    let errorMessage = '';
    
    if (!email) {
        errorMessage += 'Vui lòng nhập email.\n';
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorMessage += 'Email không hợp lệ.\n';
        isValid = false;
    }
    
    if (!firstName) {
        errorMessage += 'Vui lòng nhập họ.\n';
        isValid = false;
    }
    
    if (!lastName) {
        errorMessage += 'Vui lòng nhập tên.\n';
        isValid = false;
    }
    
    if (!role) {
        errorMessage += 'Vui lòng chọn vai trò.\n';
        isValid = false;
    }
    
    if (!password) {
        errorMessage += 'Vui lòng nhập mật khẩu.\n';
        isValid = false;
    } else if (password.length < 6) {
        errorMessage += 'Mật khẩu phải có ít nhất 6 ký tự.\n';
        isValid = false;
    }
    
    // Validate confirm password
    if (password) {
        if (!confirmPassword) {
            errorMessage += 'Vui lòng xác nhận mật khẩu.\n';
            isValid = false;
        } else if (password !== confirmPassword) {
            errorMessage += 'Mật khẩu xác nhận không khớp.\n';
            isValid = false;
        }
    }
    
    if (!isValid) {
        showError(errorMessage.trim());
    }
    
    return isValid;
}

// Check email exists via API
async function checkEmailExistsAPI(email) {
    if (!email || !email.trim()) {
        return;
    }
    
    try {
        // Try to check email via a simple validation
        // Since /api/auth/register doesn't require token, we can't check via /api/users
        // We'll rely on the API error response when creating the user
        const emailInput = document.getElementById('Email');
        const emailError = document.getElementById('emailExistsError');
        
        if (emailInput) {
            emailInput.classList.remove('is-invalid');
            if (emailError) emailError.remove();
        }
    } catch (error) {
        console.error('Error checking email:', error);
    }
}

// Create user via API
async function createUser() {
    try {
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        clearMessages();
        
        // Get form values
        const email = document.getElementById('Email')?.value?.trim() || '';
        const firstName = document.getElementById('firstName')?.value?.trim() || '';
        const lastName = document.getElementById('lastName')?.value?.trim() || '';
        const roleValue = document.getElementById('roleSelect')?.value || '';
        const password = document.getElementById('Password')?.value || '';
        const confirmPassword = document.getElementById('ConfirmPassword')?.value || '';
        const role = mapRoleToAPI(roleValue);
        
        // Double-check password match before sending
        if (password !== confirmPassword) {
            showError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
            setLoading(false);
            return;
        }
        
        // Get role-specific fields
        const studentId = document.getElementById('StudentId')?.value.trim() || '';
        const classId = document.getElementById('Class')?.value.trim() || '';
        const employeeId = document.getElementById('EmployeeId')?.value.trim() || '';
        const department = document.getElementById('Department')?.value.trim() || '';
        const position = document.getElementById('Position')?.value.trim() || '';
        
        // Prepare request body
        const requestBody = {
            email: email.toLowerCase(),
            password: password,
            firstName: firstName,
            lastName: lastName,
            role: role,
            isActive: true
        };
        
        // Add classId if provided and valid ObjectId format
        // Note: classId should be a valid MongoDB ObjectId
        // If Class field contains a class name (string), we'll skip it for now
        // You may need to look up the class by name first to get its ObjectId
        if (classId && /^[0-9a-fA-F]{24}$/.test(classId)) {
            requestBody.classId = classId;
        }
        
        // Store role-specific info in info object
        const info = {};
        if (role === 'student' && studentId) {
            info.studentId = studentId;
        }
        if ((role === 'teacher' || role === 'admin') && employeeId) {
            info.employeeId = employeeId;
        }
        if (role === 'teacher' && department) {
            info.department = department;
        }
        if (role === 'admin' && position) {
            info.position = position;
        }
        if (Object.keys(info).length > 0) {
            requestBody.info = info;
        }
        
        console.log('Creating user with data:', requestBody);
        
        // Call API - using /api/auth/register endpoint
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMessage = data.message || 'Không thể tạo người dùng. Vui lòng thử lại.';
            showError(errorMessage);
            setLoading(false);
            return;
        }
        
        // Success
        showSuccess('Tạo người dùng thành công! Đang chuyển hướng...');
        
        // Redirect to user management page after a short delay
        setTimeout(() => {
            window.location.href = '/Admin/UserManagement';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối.');
        setLoading(false);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Handle create user button click
    const createBtn = document.getElementById('createUserBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createUser();
        });
    }
    
    // Prevent default form submission
    const form = document.getElementById('createUserForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            createUser();
        });
    }
});

