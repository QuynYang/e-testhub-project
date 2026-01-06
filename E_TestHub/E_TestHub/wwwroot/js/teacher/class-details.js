// Class Details Page JavaScript
// File: class-details.js
// Description: Handles tab switching, search, and interactions for class details page

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeSearch();
    initializeActions();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Check URL hash and open appropriate tab
    const hash = window.location.hash.substring(1); // Remove # from hash
    if (hash) {
        switchTab(hash);
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
            
            // Update URL hash without page reload
            history.replaceState(null, null, `#${tabName}`);
        });
    });

    // Function to switch tabs
    function switchTab(tabName) {
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        // Add active class to selected tab
        const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
        const targetPanel = document.querySelector(`[data-panel="${tabName}"]`);
        
        if (targetButton && targetPanel) {
            targetButton.classList.add('active');
            targetPanel.classList.add('active');
        }
    }
}

function initializeSearch() {
    const searchInput = document.getElementById('studentSearch');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.students-table tbody tr');

            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

function initializeActions() {
    // View student details
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const studentId = row.cells[0].textContent;
            const studentName = row.cells[1].textContent;

            // Show student details modal or navigate to student profile
            alert(`Xem chi tiết sinh viên: ${studentName} (${studentId})`);
        });
    });

    // Message student
    const messageButtons = document.querySelectorAll('.message-btn');
    messageButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const studentName = row.cells[1].textContent;

            // Open message modal or navigate to messaging system
            alert(`Gửi tin nhắn cho: ${studentName}`);
        });
    });

    // Export students list
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            alert('Chức năng xuất danh sách sinh viên sẽ được triển khai sau');
        });
    }

    // Create new exam
    const createExamBtn = document.querySelector('.create-exam-btn');
    if (createExamBtn) {
        createExamBtn.addEventListener('click', function() {
            // Redirect to create exam page with class pre-selected
            window.location.href = '/Teacher/CreateExam';
        });
    }
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN');
}

function formatNumber(num) {
    return num.toLocaleString('vi-VN');
}

// Status badge styling
function updateStatusBadges() {
    const badges = document.querySelectorAll('.status-badge');
    badges.forEach(badge => {
        const status = badge.textContent.toLowerCase();
        badge.classList.add(status);
    });
}

// Initialize status badges on page load
updateStatusBadges();