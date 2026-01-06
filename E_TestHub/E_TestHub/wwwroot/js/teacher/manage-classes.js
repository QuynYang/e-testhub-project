/**
 * Teacher Manage Classes Page - JavaScript
 * File: manage-classes.js
 * Description: Multiple view modes, search, sort, and filter functionality for teacher class management
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const classesGrid = document.getElementById('classesGrid');
    const classesList = document.getElementById('classesList');
    const classesTableContainer = document.getElementById('classesTableContainer');
    const classesTableBody = document.getElementById('classesTableBody');
    const emptyState = document.getElementById('emptyState');
    const classCards = document.querySelectorAll('.class-card');
    const viewBtns = document.querySelectorAll('.view-btn');
    
    // State management
    let currentView = localStorage.getItem('teacherClassesViewMode') || 'list';
    let classesData = window.classesData || [];

    // Extract data from grid cards (if not loaded from API)
    if (classesData.length === 0) {
        extractClassesData();
    }

    // Initialize view
    setActiveView(currentView);

    // View toggle event listeners
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            setActiveView(view);
            localStorage.setItem('teacherClassesViewMode', view);
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterAndDisplay();
        });
    }

    // Sort functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            filterAndDisplay();
        });
    }

    /**
     * Extract classes data from grid cards
     */
    function extractClassesData() {
        const cards = document.querySelectorAll('.class-card');
        cards.forEach(card => {
            const data = {
                name: card.getAttribute('data-class-name'),
                students: parseInt(card.getAttribute('data-students')),
                year: card.getAttribute('data-year')
            };
            classesData.push(data);
        });
    }

    // Listen for API data updates
    document.addEventListener('classesDataUpdated', function(event) {
        classesData = event.detail || window.classesData || [];
        filterAndDisplay();
    });

    /**
     * Set active view mode
     * @param {string} view - The view mode (grid, list, table)
     */
    function setActiveView(view) {
        currentView = view;

        // Update button states
        viewBtns.forEach(btn => {
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Hide all views
        classesGrid.style.display = 'none';
        classesList.style.display = 'none';
        classesTableContainer.style.display = 'none';

        // Display and populate the selected view
        filterAndDisplay();
    }

    /**
     * Filter and display classes based on search and sort
     */
    function filterAndDisplay() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const sortValue = sortSelect.value;

        // Filter classes
        let filteredClasses = classesData.filter(classItem => {
            return classItem.name.toLowerCase().includes(searchTerm) ||
                   classItem.students.toString().includes(searchTerm) ||
                   classItem.year.toLowerCase().includes(searchTerm);
        });

        // Sort classes
        filteredClasses = sortClasses(filteredClasses, sortValue);

        // Display based on current view
        if (filteredClasses.length === 0) {
            hideAllViews();
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            
            switch(currentView) {
                case 'grid':
                    displayGridView(filteredClasses);
                    break;
                case 'list':
                    displayListView(filteredClasses);
                    break;
                case 'table':
                    displayTableView(filteredClasses);
                    break;
            }
        }
    }

    /**
     * Sort classes based on selected criteria
     * @param {Array} classes - Array of class objects
     * @param {string} sortValue - Sort criteria
     * @returns {Array} Sorted array
     */
    function sortClasses(classes, sortValue) {
        const sorted = [...classes];
        
        switch(sortValue) {
            case 'name-asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'students-asc':
                sorted.sort((a, b) => a.students - b.students);
                break;
            case 'students-desc':
                sorted.sort((a, b) => b.students - a.students);
                break;
        }
        
        return sorted;
    }

    /**
     * Hide all view containers
     */
    function hideAllViews() {
        classesGrid.style.display = 'none';
        classesList.style.display = 'none';
        classesTableContainer.style.display = 'none';
    }

    /**
     * Display grid view
     * @param {Array} classes - Filtered classes array
     */
    function displayGridView(classes) {
        classesGrid.style.display = 'grid';
        
        // Get all cards (including dynamically created ones)
        const allCards = document.querySelectorAll('.class-card');
        
        // Show/hide cards based on filtered data
        allCards.forEach(card => {
            const cardName = card.getAttribute('data-class-name');
            const shouldShow = classes.some(c => c.name === cardName);
            
            card.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) {
                card.style.animation = 'fadeIn 0.3s ease';
            }
        });
    }

    /**
     * Display list view
     * @param {Array} classes - Filtered classes array
     */
    function displayListView(classes) {
        classesList.style.display = 'flex';
        classesList.innerHTML = '';

        classes.forEach((classItem, index) => {
            const listItem = createListItem(classItem);
            listItem.style.opacity = '0';
            listItem.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s forwards`;
            classesList.appendChild(listItem);
        });
    }

    /**
     * Create list item element
     * @param {Object} classItem - Class data object
     * @returns {HTMLElement} List item element
     */
    function createListItem(classItem) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.dataset.classId = classItem.name;
        div.innerHTML = `
            <div class="list-item-content">
                <div class="class-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="list-item-info">
                    <div class="list-item-column">
                        <h3>${classItem.name}</h3>
                        <p class="label">Mã lớp học</p>
                    </div>
                    <div class="list-item-column">
                        <p><strong>${classItem.students}</strong> sinh viên</p>
                        <p class="label">Sĩ số</p>
                    </div>
                    <div class="list-item-column">
                        <p>${classItem.year}</p>
                        <p class="label">Khoá học</p>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="list-action-btn view-detail-btn" data-class-id="${classItem.name}">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                </div>
            </div>
        `;
        
        // Add click event for the button
        const button = div.querySelector('.view-detail-btn');
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            manageClassDetail(this.dataset.classId);
        });
        
        // Add click event for the whole item
        div.addEventListener('click', function(e) {
            if (!e.target.closest('.list-action-btn')) {
                manageClassDetail(this.dataset.classId);
            }
        });
        
        return div;
    }

    /**
     * Display table view
     * @param {Array} classes - Filtered classes array
     */
    function displayTableView(classes) {
        classesTableContainer.style.display = 'block';
        classesTableBody.innerHTML = '';

        classes.forEach((classItem, index) => {
            const row = createTableRow(classItem);
            row.style.opacity = '0';
            row.style.animation = `fadeIn 0.3s ease ${index * 0.03}s forwards`;
            classesTableBody.appendChild(row);
        });
    }

    /**
     * Create table row element
     * @param {Object} classItem - Class data object
     * @returns {HTMLElement} Table row element
     */
    function createTableRow(classItem) {
        const tr = document.createElement('tr');
        tr.dataset.classId = classItem.name;
        tr.innerHTML = `
            <td>${classItem.name}</td>
            <td>${classItem.students} sinh viên</td>
            <td>${classItem.year}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn view-detail-btn" data-class-id="${classItem.name}">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                </div>
            </td>
        `;
        
        // Add click events for buttons
        const viewDetailBtn = tr.querySelector('.view-detail-btn');
        
        viewDetailBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            viewClassStudents(this.dataset.classId);
        });
        
        // Add click event for the whole row
        tr.addEventListener('click', function(e) {
            if (!e.target.closest('.table-action-btn')) {
                viewClassStudents(this.dataset.classId);
            }
        });
        
        return tr;
    }

    /**
     * Handle class card click - Navigate to class detail page
     * Only trigger if not clicking on action button
     * Use event delegation for dynamically created cards
     */
    if (classesGrid) {
        classesGrid.addEventListener('click', function(e) {
            const card = e.target.closest('.class-card');
            if (!card) return;
            
            // Don't navigate if clicking on action button
            if (e.target.closest('.class-action-btn')) {
                return;
            }
            const classId = card.getAttribute('data-class-name');
            if (classId) {
                manageClassDetail(classId);
            }
        });
    }

    /**
     * Add keyboard navigation support
     */
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            filterAndDisplay();
            this.blur();
        }
    });

    // Table header sorting
    const tableSortHeaders = document.querySelectorAll('.classes-table th.sortable');
    tableSortHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortType = this.getAttribute('data-sort');
            handleTableSort(sortType);
        });
    });

    /**
     * Handle table header sorting
     * @param {string} sortType - Sort type (name, students, year)
     */
    function handleTableSort(sortType) {
        const currentSort = sortSelect.value;
        let newSort = '';

        // Toggle sort direction
        if (currentSort.startsWith(sortType)) {
            newSort = currentSort.endsWith('asc') ? `${sortType}-desc` : `${sortType}-asc`;
        } else {
            newSort = `${sortType}-asc`;
        }

        sortSelect.value = newSort;
        filterAndDisplay();
    }
});

/**
 * Global function to navigate to class detail page (opens exams tab)
 * @param {string} classId - The class ID
 */
function manageClassDetail(classId) {
    window.location.href = `/Teacher/ClassDetails?classId=${classId}#exams`;
}

/**
 * Global function to view class students (opens students tab)
 * @param {string} classId - The class ID
 */
function viewClassStudents(classId) {
    window.location.href = `/Teacher/ClassDetails?classId=${classId}#students`;
}

/**
 * Add CSS animations dynamically
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
