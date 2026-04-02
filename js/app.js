// guitar.io - Main Application JavaScript with Alpine.js

/**
 * Hash a string using SHA-256 when Web Crypto is available (HTTPS or localhost).
 * On plain `http://` (e.g. LAN IP for phone testing), `crypto.subtle` is undefined — use a deterministic fallback.
 * @param {string} message
 * @returns {Promise<string>} 64 hex chars (SHA-256 shape)
 */
async function sha256Hash(message) {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    const bytes = new TextEncoder().encode(message);
    const out = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) {
        const j = i % 32;
        out[j] ^= bytes[i];
        out[(j + 1) % 32] = (out[(j + 1) % 32] + bytes[i] * 31 + i) & 0xff;
    }
    return Array.from(out)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
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

/** Log once per full page load so you can compare laptop vs phone (same id = same Supabase user). */
let _guitarIoAuthUserLogged = false;

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
    if (!_guitarIoAuthUserLogged) {
        _guitarIoAuthUserLogged = true;
        console.log(
            '[guitar.io] Supabase auth user id:',
            session.user.id,
            '|',
            session.user.email
        );
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
