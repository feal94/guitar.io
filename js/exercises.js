// guitar.io - Exercises List JavaScript

/**
 * Alpine.js component for exercises list page
 */
function exercisesApp() {
    return {
        userEmail: '',
        currentUser: null,
        exercises: [],
        filterCategory: 'all',
        
        /**
         * Initialize exercises page
         */
        async init() {
            // Check authentication
            const userData = localStorage.getItem('guitar_io_current_user');
            if (!userData) {
                window.location.href = 'index.html';
                return;
            }
            
            this.currentUser = JSON.parse(userData);
            this.userEmail = this.currentUser.email;
            
            // Initialize database
            await db.initialize();
            
            // Load exercises
            await this.loadExercises();
        },
        
        /**
         * Load all exercises from database with user progress
         */
        async loadExercises() {
            // Get all exercises
            const exercises = db.query(`
                SELECT 
                    e.*,
                    ep.times_practiced,
                    ep.last_practiced,
                    ep.completed
                FROM exercises e
                LEFT JOIN exercise_progress ep ON e.id = ep.exercise_id 
                    AND ep.user_email_hash = ?
                ORDER BY e.difficulty, e.title
            `, [this.currentUser.emailHash]);
            
            this.exercises = exercises.map(ex => ({
                ...ex,
                progress: {
                    times_practiced: ex.times_practiced || 0,
                    last_practiced: ex.last_practiced,
                    completed: ex.completed || 0
                }
            }));
        },
        
        /**
         * Get filtered exercises based on category
         */
        get filteredExercises() {
            if (this.filterCategory === 'all') {
                return this.exercises;
            }
            return this.exercises.filter(ex => ex.category === this.filterCategory);
        },
        
        /**
         * Logout user
         */
        logout() {
            localStorage.removeItem('guitar_io_current_user');
            window.location.href = 'index.html';
        }
    };
}

