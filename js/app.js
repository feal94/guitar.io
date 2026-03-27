// guitar.io - Main Application JavaScript with Alpine.js

/**
 * Hash a string using SHA-256
 * @param {string} message
 * @returns {Promise<string>}
 */
async function sha256Hash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Wait for Supabase module to finish and client to exist (if configured)
 */
function waitForSupabase() {
    if (window.guitarIoSupabase) {
        return Promise.resolve(window.guitarIoSupabase);
    }
    return new Promise((resolve) => {
        window.addEventListener(
            'guitar-io-supabase-ready',
            () => resolve(window.guitarIoSupabase),
            { once: true }
        );
    });
}

/**
 * Current user for app pages (email, legacy hash, Supabase auth id)
 * @returns {Promise<{ email: string, emailHash: string, userId: string }|null>}
 */
async function getSessionUser() {
    await waitForSupabase();
    const supabase = window.guitarIoSupabase;
    if (!supabase) {
        return null;
    }
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email || !session.user.id) {
        return null;
    }
    const email = session.user.email.toLowerCase().trim();
    const emailHash = await sha256Hash(email);
    return { email, emailHash, userId: session.user.id };
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('guitar.io initialized with Alpine.js');
    checkAuthStatus();
});

/**
 * Check if user is currently authenticated (Supabase session)
 */
async function checkAuthStatus() {
    const user = await getSessionUser();
    if (user) {
        console.log('User is logged in:', user.email);
    }
}

/**
 * Logout the current user (Supabase + legacy localStorage key)
 */
async function logout() {
    await waitForSupabase();
    const supabase = window.guitarIoSupabase;
    if (supabase) {
        await supabase.auth.signOut();
    }
    localStorage.removeItem('guitar_io_current_user');
    window.location.href = 'index.html';
}

/**
 * @returns {Promise<Object|null>} Session user or null
 */
async function getCurrentUser() {
    return getSessionUser();
}

window.logout = logout;
window.waitForSupabase = waitForSupabase;
window.getSessionUser = getSessionUser;
