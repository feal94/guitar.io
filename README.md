# guitar.io

Web app for guitarists to track practice sessions, browse exercises, and manage songs and practice routines. It is a static site (HTML, Bootstrap 5, Alpine.js) with **Supabase** for authentication and cloud data.

## Setup

### 1. Supabase configuration (required)

Secrets are **not** committed. Copy the example config and add your project URL and anon key (Supabase Dashboard → Project Settings → API).

```bash
cp js/supabase-config.example.js js/supabase-config.js
```

Edit `js/supabase-config.js` and replace the placeholders. That file is listed in `.gitignore`; do not commit it.

Apply SQL migrations in order from `supabase/migrations/` in the Supabase SQL Editor (or your usual migration workflow) so tables and RLS policies match what the client expects.

### 2. Run locally

Use a local HTTP server so `fetch()` (e.g. `exercises.json`) and ES modules work. Opening `index.html` as a `file://` URL is not recommended.

```bash
python -m http.server
```

Then open `http://localhost:8000`.

## Architecture

### Frontend

- **HTML5**, **Bootstrap 5**, **Alpine.js**, **JavaScript (ES6+)**.
- **ES modules** are used where needed (e.g. `js/supabase-init.js` imports the Supabase client and config).
- **Page scripts** in `js/` attach Alpine components (`x-data`) and call shared helpers from `js/app.js` (`waitForSupabase`, `getSessionUser`, `logout`) and `js/practice-data.js` (Supabase queries for practice data).

### Backend and data

- **Supabase Auth** — email/password sign-in and session handling.
- **Supabase Postgres** — user-scoped data with **Row Level Security** (RLS): profiles, songs, routines, routine items, exercise progress, practice sessions. Schema lives under `supabase/migrations/`.
- **`exercises.json`** — canonical catalog of exercises (ids, titles, difficulty, etc.). The app loads this at runtime with `fetch`; progress is stored per user in Supabase (`exercise_progress`), not in a local database file.

### Deployment

The app is suitable for static hosting (e.g. GitHub Pages). You must supply `js/supabase-config.js` in the deployed environment (build step, secret injection, or a private deploy pipeline); the example file alone is not enough for a working production build.

## Code style and conventions

### JavaScript

- **Naming:** `camelCase` for variables and functions; `PascalCase` for classes.
- **Async:** Prefer `async`/`await` for Supabase and other async work.
- **Comments:** JSDoc-style comments for non-trivial functions are encouraged.

### Alpine.js

- Register components with **`Alpine.data('name', () => ({ ... }))`** inside `document.addEventListener('alpine:init', ...)`, and use **`x-data="name"`** in HTML (no parentheses). See existing page scripts under `js/`.
- Use `x-data`, `x-model`, `x-text` / `x-html`, and `@click` (or `x-on:click`) consistently with Bootstrap.

### HTML and CSS

- Use Bootstrap for layout and components; add overrides in `css/style.css` and page-specific CSS (`css/dashboard.css`, `css/exercise.css`) as needed.

### Supabase usage

- Always **`await waitForSupabase()`** before using the client (see `js/app.js`). Do not assume a global `supabase` object exists before initialization.
- Session-aware pages should use **`getSessionUser()`** for the current user (`email`, `emailHash`, `userId`).

## Domain overview

- **Profiles** — optional display name per auth user.
- **Songs, routines, routine items** — user-owned; routines reference songs and catalog exercise ids.
- **Exercise progress and practice sessions** — tracked in Supabase; sessions can reference songs, exercises, and optionally routines.

Details are defined in `supabase/migrations/` (apply in dependency order).

## Adding a new exercise

1. Add any assets under `images/exercises/` or `docs/` as needed.
2. Append an object to **`exercises.json`** with at least: `id`, `title`, `description`, `difficulty`, `category`; optionally `image_path`, `pdf_path`.
3. Reload the app and open the exercises UI to verify.

## Git workflow

- Use **feature branches** from `main` with prefixes such as `feature/`, `bugfix/`, or `chore/`.
- Avoid committing secrets; keep `js/supabase-config.js` local or inject it in CI/CD.
