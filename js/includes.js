/**
 * Loads shared navbar HTML from partials/ before Alpine starts.
 * In your page (inside the Alpine root), add one placeholder:
 *   <div data-nav-include="dashboard"></div>
 * Keys: dashboard | back-dashboard | back-routines | back-exercises | back-songs
 * Requires a local HTTP server (same as the rest of the app).
 */

const NAV_PARTIALS = {
    dashboard: 'partials/nav-app-dashboard.html',
    'back-dashboard': 'partials/nav-app-back-dashboard.html',
    'back-routines': 'partials/nav-app-back-routines.html',
    'back-exercises': 'partials/nav-app-back-exercises.html',
    'back-songs': 'partials/nav-app-back-songs.html',
};

async function loadNavIncludes() {
    const nodes = document.querySelectorAll('[data-nav-include]');
    for (const el of nodes) {
        const key = el.getAttribute('data-nav-include');
        const rel = NAV_PARTIALS[key];
        if (!rel) {
            console.error('includes.js: unknown data-nav-include:', key);
            continue;
        }
        const url = new URL(rel, window.location.href);
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`includes.js: ${res.status} ${url}`);
        }
        const html = await res.text();
        el.outerHTML = html;
    }
}

await loadNavIncludes();
