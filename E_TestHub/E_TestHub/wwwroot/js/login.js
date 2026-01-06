// eTestHub Login JavaScript - API Integration
const API_BASE_URL = 'http://localhost:3000/api';

// Store selected role
let selectedRole = '';

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    
    // Clear individual field errors
    clearFieldErrors();
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

// Clear all error messages
function clearMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    clearFieldErrors();
}

// Clear field-specific errors
function clearFieldErrors() {
    const roleError = document.getElementById('roleError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    
    if (roleError) roleError.textContent = '';
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
}

// Set field error
function setFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Show loading state
function setLoading(isLoading) {
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const loginButtonSpinner = document.getElementById('loginButtonSpinner');
    
    if (loginButton) {
        loginButton.disabled = isLoading;
    }
    if (loginButtonText) {
        loginButtonText.textContent = isLoading ? 'Đang đăng nhập...' : 'Đăng nhập';
    }
    if (loginButtonSpinner) {
        loginButtonSpinner.style.display = isLoading ? 'inline-block' : 'none';
    }
}

// Select role function
function selectRole(role) {
    selectedRole = role;
    const selectedRoleInput = document.getElementById('selectedRole');
    if (selectedRoleInput) {
        selectedRoleInput.value = role;
    }
    
    // Get all role buttons
    const roleButtons = document.querySelectorAll('.role-btn');
    
    // Reset all buttons to outline state
    roleButtons.forEach(btn => {
        const btnRole = btn.getAttribute('data-role');
        
        // Remove active and solid classes
        btn.classList.remove('active', 'btn-primary', 'btn-success', 'btn-warning');
        
        // Ensure outline class is present based on button's role
        btn.classList.remove('btn-outline-primary', 'btn-outline-success', 'btn-outline-warning');
        if (btnRole === 'student') {
            btn.classList.add('btn-outline-primary');
        } else if (btnRole === 'teacher') {
            btn.classList.add('btn-outline-success');
        } else if (btnRole === 'admin') {
            btn.classList.add('btn-outline-warning');
        }
    });
    
    // Set selected button to active and solid state
    const selectedBtn = document.querySelector(`.role-btn[data-role="${role}"]`);
    if (selectedBtn) {
        // Remove outline class first
        selectedBtn.classList.remove('btn-outline-primary', 'btn-outline-success', 'btn-outline-warning');
        
        // Add active and solid class
        selectedBtn.classList.add('active');
        if (role === 'student') {
            selectedBtn.classList.add('btn-primary');
        } else if (role === 'teacher') {
            selectedBtn.classList.add('btn-success');
        } else if (role === 'admin') {
            selectedBtn.classList.add('btn-warning');
        }
    }
    
    // Clear role error
    clearFieldErrors();
    clearMessages();
}

// Login function - Call Node.js API
async function login(email, password, role) {
    try {
        setLoading(true);
        clearMessages();
        
        // Validation
        if (!role) {
            setFieldError('role', 'Vui lòng chọn vai trò');
            setLoading(false);
            return;
        }
        
        if (!email) {
            setFieldError('email', 'Vui lòng nhập email');
            setLoading(false);
            return;
        }
        
        if (!isValidEmail(email)) {
            setFieldError('email', 'Email không hợp lệ');
            setLoading(false);
            return;
        }
        
        if (!password) {
            setFieldError('password', 'Vui lòng nhập mật khẩu');
            setLoading(false);
            return;
        }
        
        // Call API
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email.toLowerCase().trim(),
                password: password,
                role: role
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Handle error response
            const errorMessage = data.message || 'Đăng nhập thất bại';
            showError(errorMessage);
            setLoading(false);
            return;
        }
        
        // Login successful - verify role matches
        if (data.token && data.user) {
            console.log('Login successful, user data:', data.user);
            
            // Kiểm tra role đã chọn có khớp với role từ API không
            const apiRole = data.user.role;
            const selectedRoleLower = role.toLowerCase();
            const apiRoleLower = apiRole ? apiRole.toLowerCase() : '';
            
            if (selectedRoleLower !== apiRoleLower) {
                // Role không khớp - không cho phép đăng nhập
                showError(`Vai trò không khớp. Tài khoản này có vai trò: ${apiRole}. Vui lòng chọn đúng vai trò.`);
                setLoading(false);
                return;
            }
            
            // Role khớp - tiếp tục xử lý đăng nhập
            // Get user ID - check both id and _id
            const userId = data.user.id || data.user._id || null;
            
            // Validate user data before sending
            if (!userId) {
                console.error('Invalid user data - missing id:', data.user);
                console.error('Full response data:', data);
                showError('Dữ liệu người dùng không hợp lệ. Vui lòng thử lại.');
                setLoading(false);
                return;
            }
            
            // Save token and user info to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.role);
            
            // Set session in C# application - MUST complete before redirect
            try {
                const sessionRequest = {
                    userId: userId.toString(), // Ensure it's a string
                    email: data.user.email || '',
                    firstName: data.user.firstName || '',
                    lastName: data.user.lastName || '',
                    fullName: data.user.fullName || '',
                    role: data.user.role || ''
                };
                
                console.log('Setting session with data:', sessionRequest);
                
                const setSessionResponse = await fetch('/Home/SetSession', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin', // Ensure cookies are sent
                    body: JSON.stringify(sessionRequest)
                });
                
                // Read response once
                const sessionData = await setSessionResponse.json().catch(() => ({}));
                
                if (!setSessionResponse.ok) {
                    console.error('Failed to set session - Status:', setSessionResponse.status);
                    console.error('Failed to set session - Response:', sessionData);
                    const errorMessage = sessionData.message || sessionData.error || 'Không thể thiết lập phiên đăng nhập. Vui lòng thử lại.';
                    showError(errorMessage);
                    setLoading(false);
                    return;
                }
                
                // Verify session was set successfully
                console.log('Session set successfully:', sessionData);
                
                // Show success message
                showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
                
                // Redirect to server-side redirect endpoint to ensure session cookie is sent
                // This endpoint will check session and redirect to appropriate dashboard
                setTimeout(() => {
                    console.log('Redirecting via server endpoint...');
                    // Use server-side redirect endpoint to ensure session cookie is sent
                    window.location.href = '/Home/RedirectToDashboard';
                }, 500);
                
            } catch (sessionError) {
                console.error('Error setting session:', sessionError);
                showError('Lỗi khi thiết lập phiên đăng nhập. Vui lòng thử lại.');
                setLoading(false);
                return;
            }
        } else {
            showError('Phản hồi từ server không hợp lệ');
            setLoading(false);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối.');
        setLoading(false);
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    // Role button click handlers
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const role = this.getAttribute('data-role');
            selectRole(role);
        });
    });
    
    // Login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            // Use selectedRole from button selection
            if (!selectedRole) {
                setFieldError('role', 'Vui lòng chọn vai trò');
                return;
            }

            login(email, password, selectedRole);
        });
    }

    // Google login button
    const googleBtn = document.querySelector(".etesthub-btn-google");
    if (googleBtn) {
        googleBtn.addEventListener("click", function() {
            console.log("Google login clicked");
            alert("Chức năng đăng nhập Google sẽ được triển khai sau");
        });
    }

    // Forgot password functionality
    const loginFormElement = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    if (forgotPasswordLink && loginFormElement && forgotPasswordForm) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormElement.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
        });
    }

    if (backToLoginLink && loginFormElement && forgotPasswordForm) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormElement.style.display = 'block';
            forgotPasswordForm.style.display = 'none';
        });
    }
    
    // Clear validation classes on input
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            this.classList.remove('is-invalid', 'is-valid');
            clearFieldErrors();
            clearMessages();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            this.classList.remove('is-invalid', 'is-valid');
            clearFieldErrors();
            clearMessages();
        });
    }
});
