// Student Profile API Integration
const STUDENT_API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    initializeStudentProfile();
});

function initializeStudentProfile() {
    loadStudentProfile();
    const form = document.getElementById('studentProfileForm');
    if (form) {
        form.addEventListener('submit', handleProfileSubmit);
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUserId() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user ? (user.id || user._id || user.userId) : null;
    } catch (error) {
        console.error('Không thể đọc thông tin người dùng:', error);
        return null;
    }
}

async function loadStudentProfile() {
    try {
        setStatus('Đang tải thông tin...', 'loading');

        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID sinh viên. Vui lòng đăng nhập lại.');
        }

        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(`${STUDENT_API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(errorPayload?.message || 'Không thể tải thông tin sinh viên.');
        }

        const user = await response.json();
        populateProfileForm(user);
        setStatus('');
    } catch (error) {
        console.error('loadStudentProfile error:', error);
        setStatus(error.message || 'Đã xảy ra lỗi khi tải thông tin.', 'error');
    }
}

function populateProfileForm(user) {
    document.getElementById('studentFullName').value = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    document.getElementById('studentClass').value = user.className || user.classCode || (user.classInfo?.name) || '—';
    document.getElementById('studentBirthday').value = formatDate(user.dateOfBirth || user.birthday);
    document.getElementById('studentCode').value = user.studentCode || user.studentId || '—';
    document.getElementById('studentEmail').value = user.email || '';
    document.getElementById('studentPhone').value = user.phoneNumber || user.phone || '';
}

async function handleProfileSubmit(event) {
    event.preventDefault();

    clearErrors();

    const email = document.getElementById('studentEmail').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();

    if (!validateEmail(email)) {
        showError('studentEmailError', 'Email không hợp lệ.');
        return;
    }

    if (phone && !validatePhone(phone)) {
        showError('studentPhoneError', 'Số điện thoại không hợp lệ.');
        return;
    }

    if (newPassword && newPassword.length < 6) {
        showError('studentPhoneError', 'Mật khẩu mới phải dài ít nhất 6 ký tự.');
        return;
    }

    try {
        setStatus('Đang lưu thông tin...', 'loading');

        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID sinh viên. Vui lòng đăng nhập lại.');
        }

        const token = getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const updatePayload = {
            email,
            phoneNumber: phone
        };

        if (newPassword) {
            updatePayload.password = newPassword;
            if (!currentPassword) {
                throw new Error('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.');
            }
        }

        const response = await fetch(`${STUDENT_API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(errorPayload?.message || 'Không thể cập nhật thông tin.');
        }

        setStatus('Cập nhật thông tin thành công!', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
    } catch (error) {
        console.error('handleProfileSubmit error:', error);
        setStatus(error.message || 'Đã xảy ra lỗi khi cập nhật thông tin.', 'error');
    }
}

function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\+?\d{8,15}$/;
    return phoneRegex.test(phone);
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
    }
}

function clearErrors() {
    ['studentEmailError', 'studentPhoneError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

function setStatus(message, type) {
    const statusEl = document.getElementById('profileStatusMessage');
    if (!statusEl) return;

    statusEl.textContent = message || '';
    statusEl.className = 'form-status';

    if (!message) return;

    if (type === 'loading') {
        statusEl.classList.add('status-loading');
    } else if (type === 'success') {
        statusEl.classList.add('status-success');
    } else if (type === 'error') {
        statusEl.classList.add('status-error');
    }
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
