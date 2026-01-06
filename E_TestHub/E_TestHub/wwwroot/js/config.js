// ===========================================
// E-TestHub Frontend Configuration
// ===========================================
// Thay đổi URL này khi deploy

// API Base URL - Production (Render)
const API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// API Base URL - Development (Local)
// const API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}

