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
            
            // Sync exercises from JSON file
            await this.syncExercisesFromJSON();
            
            // Load exercises
            await this.loadExercises();
        },
        
        /**
         * Sync exercises from JSON file to database
         */
        async syncExercisesFromJSON() {
            try {
                const response = await fetch('exercises.json');
                const exercises = await response.json();
                
                // Get list of IDs from JSON
                const jsonIds = exercises.map(ex => ex.id);
                
                // Delete exercises that are no longer in JSON
                const existingExercises = db.query('SELECT id FROM exercises');
                for (const existing of existingExercises) {
                    if (!jsonIds.includes(existing.id)) {
                        db.execute('DELETE FROM exercises WHERE id = ?', [existing.id]);
                        console.log(`Deleted exercise: ${existing.id}`);
                    }
                }
                
                // Insert or update exercises from JSON
                for (const exercise of exercises) {
                    // Check if exercise exists
                    const existing = db.queryOne('SELECT created_at FROM exercises WHERE id = ?', [exercise.id]);
                    const createdAt = existing ? existing.created_at : new Date().toISOString();
                    
                    db.execute(`
                        INSERT OR REPLACE INTO exercises (id, title, description, difficulty, category, image_path, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [exercise.id, exercise.title, exercise.description, exercise.difficulty, exercise.category, exercise.image_path || null, createdAt]);
                }
                
                console.log(`Synced ${exercises.length} exercises from JSON`);
            } catch (error) {
                console.error('Error syncing exercises:', error);
            }
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

