// guitar.io - Individual Exercise JavaScript

/**
 * Alpine.js component for individual exercise page
 */
function exerciseApp() {
    return {
        userEmail: '',
        currentUser: null,
        exercise: null,
        progress: {
            times_practiced: 0,
            last_practiced: null,
            completed: 0
        },
        practiceTime: 5,  // Default 5 minutes
        bpm: 60,          // Default 60 BPM
        
        // Timer state
        isTimerRunning: false,
        isTimerPaused: false,
        timerSeconds: 0,
        timerDisplay: '00:00',
        timerInterval: null,
        
        /**
         * Initialize exercise page
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
            
            // Get exercise ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const exerciseId = urlParams.get('id');
            
            if (!exerciseId) {
                window.location.href = 'exercises.html';
                return;
            }
            
            // Load exercise
            await this.loadExercise(exerciseId);
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
         * Load exercise details and user progress
         */
        async loadExercise(exerciseId) {
            // Get exercise details
            const exercise = db.queryOne(`
                SELECT * FROM exercises WHERE id = ?
            `, [exerciseId]);
            
            if (!exercise) {
                alert('Exercise not found');
                window.location.href = 'exercises.html';
                return;
            }
            
            this.exercise = exercise;
            
            // Get user's progress for this exercise
            const progress = db.queryOne(`
                SELECT * FROM exercise_progress 
                WHERE user_email_hash = ? AND exercise_id = ?
            `, [this.currentUser.emailHash, exerciseId]);
            
            if (progress) {
                this.progress = progress;
            }
        },
        
        /**
         * Increase practice time by 5 minutes
         */
        increaseTime() {
            if (this.practiceTime < 60) {
                this.practiceTime += 5;
            }
        },
        
        /**
         * Decrease practice time by 5 minutes
         */
        decreaseTime() {
            if (this.practiceTime > 5) {
                this.practiceTime -= 5;
            }
        },
        
        /**
         * Increase BPM by 1
         */
        increaseBpm() {
            if (this.bpm < 200) {
                this.bpm += 1;
            }
        },
        
        /**
         * Decrease BPM by 1
         */
        decreaseBpm() {
            if (this.bpm > 40) {
                this.bpm -= 1;
            }
        },
        
        /**
         * Start practice session
         */
        async startPractice() {
            if (this.isTimerRunning && !this.isTimerPaused) {
                return; // Already running
            }
            
            console.log('Starting practice:', {
                exercise: this.exercise.title,
                time: this.practiceTime,
                bpm: this.bpm
            });
            
            // Start the timer
            this.isTimerRunning = true;
            this.isTimerPaused = false;
            this.timerSeconds = this.practiceTime * 60; // Convert minutes to seconds
            this.updateTimerDisplay();
            
            // Start countdown
            this.timerInterval = setInterval(() => {
                if (!this.isTimerPaused) {
                    this.timerSeconds--;
                    this.updateTimerDisplay();
                    
                    if (this.timerSeconds <= 0) {
                        this.completeExercise();
                    }
                }
            }, 1000);
        },
        
        /**
         * Pause the timer
         */
        pauseTimer() {
            this.isTimerPaused = true;
        },
        
        /**
         * Resume the timer
         */
        resumeTimer() {
            this.isTimerPaused = false;
        },
        
        /**
         * Update timer display
         */
        updateTimerDisplay() {
            const minutes = Math.floor(this.timerSeconds / 60);
            const seconds = this.timerSeconds % 60;
            this.timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },
        
        /**
         * Stop the timer
         */
        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.isTimerRunning = false;
            this.isTimerPaused = false;
            this.timerSeconds = 0;
            this.timerDisplay = '00:00';
        },
        
        /**
         * Complete exercise session
         */
        async completeExercise() {
            // Stop the timer
            this.stopTimer();
            
            // Record the session
            await this.recordPracticeSession();
            
            // Show completion message
            alert('Exercise complete, well done! 🎸');
            
            // Reload progress to show updated stats
            await this.loadExercise(this.exercise.id);
        },
        
        /**
         * Record practice session in database
         */
        async recordPracticeSession() {
            // Update or create exercise progress
            const existing = db.queryOne(`
                SELECT id FROM exercise_progress 
                WHERE user_email_hash = ? AND exercise_id = ?
            `, [this.currentUser.emailHash, this.exercise.id]);
            
            if (existing) {
                // Update existing progress
                db.execute(`
                    UPDATE exercise_progress 
                    SET times_practiced = times_practiced + 1,
                        last_practiced = datetime('now'),
                        completed = 1
                    WHERE user_email_hash = ? AND exercise_id = ?
                `, [this.currentUser.emailHash, this.exercise.id]);
            } else {
                // Create new progress record
                db.execute(`
                    INSERT INTO exercise_progress (user_email_hash, exercise_id, times_practiced, last_practiced, completed)
                    VALUES (?, ?, 1, datetime('now'), 1)
                `, [this.currentUser.emailHash, this.exercise.id]);
            }
            
            // Record in practice sessions
            db.execute(`
                INSERT INTO practice_sessions (user_email_hash, session_date, duration_minutes, exercise_id, created_at)
                VALUES (?, datetime('now'), ?, ?, datetime('now'))
            `, [this.currentUser.emailHash, this.practiceTime, this.exercise.id]);
            
            // Reload progress
            await this.loadExercise(this.exercise.id);
            
            console.log('Practice session recorded');
        },
        
        /**
         * Format date for display
         */
        formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            
            return date.toLocaleDateString();
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

