$(document).ready(function() {
    // Initialize form
    initializeCreateUserForm();

    // Handle role selection
    $('input[name="Role"]').on('change', function() {
        handleRoleChange($(this).val());
    });

    // Handle password visibility toggle
    $('.btn-toggle-password').on('click', function() {
        togglePasswordVisibility($(this));
    });

    // Handle form submission
    $('#createUserForm').on('submit', function(e) {
        if (!validateForm()) {
            e.preventDefault();
            return false;
        }

        // Show loading state
        showLoadingState(true);
    });

    // Handle cancel button
    $('#btnCancel').on('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.href = '/Admin/UserManagement';
        }
    });
});

function initializeCreateUserForm() {
    // Set default role if none selected
    if (!$('input[name="Role"]:checked').length) {
        $('input[name="Role"][value="Student"]').prop('checked', true).trigger('change');
    } else {
        handleRoleChange($('input[name="Role"]:checked').val());
    }

    // Initialize password strength indicator
    initializePasswordStrength();

    // Add real-time validation
    addRealTimeValidation();
}

function handleRoleChange(selectedRole) {
    // Hide all role-specific fields
    $('.role-specific-fields').hide();

    // Show fields for selected role
    switch(selectedRole) {
        case 'Student':
            $('#studentFields').show();
            break;
        case 'Teacher':
            $('#teacherFields').show();
            break;
        case 'Admin':
            $('#adminFields').show();
            break;
    }

    // Update role card styling
    $('.role-card').removeClass('selected');
    $(`input[name="Role"][value="${selectedRole}"]`).closest('.role-option').find('.role-card').addClass('selected');
}

function togglePasswordVisibility(button) {
    const input = button.closest('.password-input-group').find('.form-control');
    const icon = button.find('i');

    if (input.attr('type') === 'password') {
        input.attr('type', 'text');
        icon.removeClass('fa-eye').addClass('fa-eye-slash');
        button.attr('title', 'Hide password');
    } else {
        input.attr('type', 'password');
        icon.removeClass('fa-eye-slash').addClass('fa-eye');
        button.attr('title', 'Show password');
    }
}

function initializePasswordStrength() {
    $('#Password').on('input', function() {
        const password = $(this).val();
        const strength = calculatePasswordStrength(password);
        updatePasswordStrengthIndicator(strength);
    });
}

function calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return strength;
}

function updatePasswordStrengthIndicator(strength) {
    const indicator = $('#passwordStrength');
    const bars = indicator.find('.strength-bar');

    bars.removeClass('active');

    for (let i = 0; i < strength; i++) {
        bars.eq(i).addClass('active');
    }

    // Update color based on strength
    indicator.removeClass('weak medium strong very-strong');
    if (strength <= 2) indicator.addClass('weak');
    else if (strength <= 3) indicator.addClass('medium');
    else if (strength <= 4) indicator.addClass('strong');
    else indicator.addClass('very-strong');
}

function addRealTimeValidation() {
    // Email validation
    $('#Email').on('blur', function() {
        validateEmail($(this));
    });

    // Password confirmation validation
    $('#ConfirmPassword').on('input', function() {
        validatePasswordConfirmation();
    });

    // Required field validation
    $('.form-control[required]').on('blur', function() {
        validateRequiredField($(this));
    });
}

function validateForm() {
    let isValid = true;

    // Clear previous validation errors
    $('.field-validation-error').remove();
    $('.input-validation-error').removeClass('input-validation-error');

    // Validate email
    if (!validateEmail($('#Email'))) {
        isValid = false;
    }

    // Validate password
    if (!validatePassword($('#Password'))) {
        isValid = false;
    }

    // Validate password confirmation
    if (!validatePasswordConfirmation()) {
        isValid = false;
    }

    // Validate required fields
    $('.form-control[required]').each(function() {
        if (!validateRequiredField($(this))) {
            isValid = false;
        }
    });

    // Validate role-specific fields
    const selectedRole = $('input[name="Role"]:checked').val();
    if (!validateRoleSpecificFields(selectedRole)) {
        isValid = false;
    }

    return isValid;
}

function validateEmail(emailInput) {
    const email = emailInput.val().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        showFieldError(emailInput, 'Email is required.');
        return false;
    }

    if (!emailRegex.test(email)) {
        showFieldError(emailInput, 'Please enter a valid email address.');
        return false;
    }

    // Check if email already exists (AJAX call)
    checkEmailExists(email, emailInput);

    return true;
}

function validatePassword(passwordInput) {
    const password = passwordInput.val();

    if (!password) {
        showFieldError(passwordInput, 'Password is required.');
        return false;
    }

    if (password.length < 8) {
        showFieldError(passwordInput, 'Password must be at least 8 characters long.');
        return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showFieldError(passwordInput, 'Password must contain at least one uppercase letter, one lowercase letter, and one number.');
        return false;
    }

    return true;
}

function validatePasswordConfirmation() {
    const password = $('#Password').val();
    const confirmPassword = $('#ConfirmPassword').val();
    const confirmInput = $('#ConfirmPassword');

    if (password !== confirmPassword) {
        showFieldError(confirmInput, 'Passwords do not match.');
        return false;
    }

    // Remove error if it exists
    confirmInput.siblings('.field-validation-error').remove();
    confirmInput.removeClass('input-validation-error');

    return true;
}

function validateRequiredField(input) {
    const value = input.val().trim();

    if (!value) {
        const fieldName = input.attr('name') || input.attr('id');
        showFieldError(input, `${fieldName} is required.`);
        return false;
    }

    return true;
}

function validateRoleSpecificFields(role) {
    let isValid = true;

    switch(role) {
        case 'Student':
            if (!$('#StudentId').val().trim()) {
                showFieldError($('#StudentId'), 'Student ID is required.');
                isValid = false;
            }
            break;
        case 'Teacher':
            if (!$('#EmployeeId').val().trim()) {
                showFieldError($('#EmployeeId'), 'Employee ID is required.');
                isValid = false;
            }
            break;
        case 'Admin':
            if (!$('#EmployeeId').val().trim()) {
                showFieldError($('#EmployeeId'), 'Employee ID is required.');
                isValid = false;
            }
            break;
    }

    return isValid;
}

function showFieldError(input, message) {
    // Remove existing error
    input.siblings('.field-validation-error').remove();

    // Add error class to input
    input.addClass('input-validation-error');

    // Add error message
    const errorElement = $('<span class="field-validation-error"></span>').text(message);
    input.after(errorElement);
}

function checkEmailExists(email, emailInput) {
    // This would be an AJAX call to check if email exists
    // For now, we'll just simulate it
    $.ajax({
        url: '/Admin/CheckEmailExists',
        type: 'POST',
        data: { email: email },
        success: function(response) {
            if (response.exists) {
                showFieldError(emailInput, 'This email is already registered.');
            }
        },
        error: function() {
            // Handle error silently for now
        }
    });
}

function showLoadingState(isLoading) {
    const submitBtn = $('#btnSubmit');
    const cancelBtn = $('#btnCancel');

    if (isLoading) {
        submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Creating User...');
        cancelBtn.prop('disabled', true);
    } else {
        submitBtn.prop('disabled', false).html('<i class="fas fa-user-plus"></i> Create User');
        cancelBtn.prop('disabled', false);
    }
}

// Utility functions
function showSuccess(message) {
    // This would integrate with your notification system
    alert(message);
}

function showError(message) {
    // This would integrate with your notification system
    alert('Error: ' + message);
}