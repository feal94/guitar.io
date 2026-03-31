# guitar.io Project Documentation

This document provides a comprehensive overview of the guitar.io project, its architecture, and development workflows. It is intended for developers working on the project to ensure consistency and maintainability.

## 1. Project Overview

guitar.io is a web application designed to help guitarists track their practice sessions and progress. It provides a dashboard to visualize practice statistics, a library of exercises, and tools for managing practice routines and songs.

The application is a static website deployed on GitHub Pages, with dynamic features powered by client-side JavaScript and a Supabase backend for user authentication.

## 2. Tech Stack

The project uses the following technologies:

-   **Frontend:**
    -   **HTML5:** The core markup language for the application's pages.
    -   **Bootstrap 5:** A CSS framework for responsive design and pre-built UI components.
    -   **Alpine.js:** A minimal JavaScript framework for composing behavior directly in the markup. It is used for light-weight client-side interactivity and data binding.
    -   **JavaScript (ES6+):** The primary programming language for application logic.

-   **Backend & Data:**
    -   **Supabase:** Used for user authentication (email/password login).
    -   **sql.js:** A JavaScript library that provides a SQLite database in the browser. It is used to store all user-specific data (practice sessions, songs, routines) in the browser's `localStorage`.
    -   **JSON:** A static `exercises.json` file is used to store the library of guitar exercises. This data is loaded into the local SQLite database on application startup.

-   **Deployment:**
    -   **GitHub Pages:** The application is hosted as a static website on GitHub Pages.

## 3. Code Style & Conventions

To maintain a clean and consistent codebase, please adhere to the following style guidelines:

### JavaScript (ES6+)

-   **Modules:** Use ES6 modules (`import`/`export`) for organizing code.
-   **Naming Conventions:**
    -   `camelCase` for variables and functions (e.g., `practiceSession`, `calculateStats`).
    -   `PascalCase` for classes (e.g., `DatabaseManager`).
-   **Asynchronous Code:** Use `async/await` for handling asynchronous operations, especially for database queries and Supabase calls.
-   **Comments:** Use JSDoc-style comments for functions to explain their purpose, parameters, and return values.

### Alpine.js

-   **Component Structure:** Encapsulate Alpine.js logic within a dedicated function that returns the component's data and methods. For example:
    ```javascript
    function practiceDashboard() {
      return {
        stats: { sessions: 0, minutes: 0 },
        routines: [],
        loadStats() {
          // ... logic to load stats
        }
      };
    }
    ```
-   **Data Binding:** Use `x-data` to define a component's scope, `x-model` for two-way data binding on form inputs, and `x-text` or `x-html` for displaying data.
-   **Event Handling:** Use `@click` or `x-on:click` for handling user interactions.

### HTML & CSS

-   **Bootstrap:** Leverage Bootstrap's grid system, utility classes, and components as much as possible to maintain a consistent UI.
-   **Custom CSS:** For custom styles, use a separate CSS file (e.g., `css/style.css`). Keep custom CSS minimal and well-organized.

### Supabase Usage

-   **Accessing Supabase:** The Supabase client instance is initialized asynchronously. To ensure you have a valid client object, you **must** use the `waitForSupabase()` helper function before making any calls to Supabase.
    ```javascript
    async function someFunction() {
      const supabase = await waitForSupabase();
      // Now you can use the supabase object
      const { data, error } = await supabase.from('your_table').select('*');
    }
    ```
-   **No Global `supabase`:** Do not assume a global `supabase` object is available. Always obtain it via `waitForSupabase()`.

## 4. Domain Logic

This section outlines the specific constraints and logic for handling the application's data.

### Practice Data

-   **User Data:** All user-specific data is stored in a local SQLite database in the browser's `localStorage`. This includes:
    -   `users`: Stores user profile information, with the email address hashed for privacy.
    -   `practice_sessions`: Records each practice session, including date, duration, and what was practiced (exercise, song, or routine).
    -   `songs`: A user's personal library of songs to practice.
    -   `routines`: User-created practice routines.
    -   `exercise_progress`: Tracks a user's progress for each exercise.
-   **Data Integrity:** The `js/database.js` file is responsible for all database operations. It ensures data integrity through a defined schema and foreign key constraints where applicable.

### Exercises

-   **Source of Truth:** The `exercises.json` file is the single source of truth for all guitar exercises.
-   **Structure:** Each exercise in the JSON file must have the following fields:
    -   `id` (string): A unique identifier for the exercise (e.g., `"major-scale"`).
    -   `title` (string): The display name of the exercise.
    -   `description` (string): A detailed description of the exercise.
    -   `difficulty` (string): The difficulty level (e.g., `"beginner"`, `"intermediate"`, `"advanced"`).
    -   `category` (string): The category of the exercise (e.g., `"scales"`, `"chords"`, `"picking"`).
    -   `image_path` (string, optional): The path to an image associated with the exercise.
    -   `pdf_path` (string, optional): The path to a PDF document for the exercise.

## 5. Workflow: Adding New Exercises

To add a new exercise to the application, follow these steps:

1.  **Add Media (if any):**
    -   If the exercise has an image, add it to the `images/exercises/` directory.
    -   If the exercise has a PDF, add it to the `docs/` directory.

2.  **Update `exercises.json`:**
    -   Open the `exercises.json` file.
    -   Add a new JSON object to the array for the new exercise.
    -   Ensure the new object has all the required fields (`id`, `title`, `description`, `difficulty`, `category`).
    -   Make sure the `id` is unique.
    -   If you added an image or PDF, provide the correct path in the `image_path` or `pdf_path` field.

3.  **Verify the Changes:**
    -   The `js/database.js` file contains a mechanism to automatically import exercises from `exercises.json` when the application loads.
    -   When a user loads the application, the new exercise will be automatically added to their local SQLite database.
    -   Open the application in a browser and navigate to the exercises page to verify that the new exercise is displayed correctly.

**Important:** Do not manually edit the SQLite database in the browser's developer tools. The application is designed to handle data updates automatically.

## 6. Git Workflow

To ensure a clean and manageable git history, the following rules must be followed:

1.  **Feature Branching:** For each new feature or significant change, a new branch must be created from the `main` branch. The branch name should be descriptive and prefixed with `feature/`, `bugfix/`, or `chore/`. For example: `feature/add-practice-log-chart`.

2.  **Commits and Pushing:** No files should be committed or pushed to the remote repository without explicit consent. All changes should be reviewed and approved before being merged.
