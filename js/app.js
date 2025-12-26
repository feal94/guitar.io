// guitar.io - Main Application JavaScript with Alpine.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('guitar.io initialized with Alpine.js');
    
    // Check if user is already logged in
    checkAuthStatus();
});

/**
 * Check if user is currently authenticated
 */
function checkAuthStatus() {
    const currentUser = localStorage.getItem('guitar_io_current_user');
    
    if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('User is logged in:', user.username);
        
        // Optional: Redirect to dashboard if on login page
        // Uncomment when dashboard is ready
        // if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        //     window.location.href = 'dashboard.html';
        // }
    }
}

/**
 * Logout the current user
 */
function logout() {
    localStorage.removeItem('guitar_io_current_user');
    window.location.href = 'index.html';
}

/**
 * Get current logged in user
 * @returns {Object|null} Current user object or null
 */
function getCurrentUser() {
    const userData = localStorage.getItem('guitar_io_current_user');
    return userData ? JSON.parse(userData) : null;
}

