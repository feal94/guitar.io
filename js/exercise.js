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
            // TODO: Implement timer and metronome functionality
            console.log('Starting practice:', {
                exercise: this.exercise.title,
                time: this.practiceTime,
                bpm: this.bpm
            });
            
            // For now, just show a placeholder message
            alert(`Starting practice session:\n\nExercise: ${this.exercise.title}\nTime: ${this.practiceTime} minutes\nBPM: ${this.bpm}\n\n(Timer and metronome coming soon!)`);
            
            // Record practice session (placeholder)
            await this.recordPracticeSession();
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

