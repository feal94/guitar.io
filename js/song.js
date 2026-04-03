// guitar.io - Individual Song JavaScript

document.addEventListener('alpine:init', () => {
    Alpine.data('songApp', () => ({
        userEmail: '',
        currentUser: null,
        song: null,
        practiceTime: 5,  // Default 5 minutes
        bpm: 60,          // Default 60 BPM
        
        // Timer state
        isTimerRunning: false,
        isTimerPaused: false,
        timerSeconds: 0,
        timerDisplay: '00:00',
        timerInterval: null,
        
        // Metronome state
        isMetronomeOn: false,
        metronomeInterval: null,
        audioContext: null,

        pendingRecordMinutes: null,
        practiceFeedbackMessage: '',
        practiceFeedbackVariant: 'success',
        
        /**
         * Initialize song page
         */
        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            this.currentUser = user;
            this.userEmail = user.email;

            // Get song ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const songId = urlParams.get('id');
            
            if (!songId) {
                window.location.href = 'songs.html';
                return;
            }
            
            // Load song
            await this.loadSong(songId);
        },

        setPracticeFeedback(variant, message) {
            this.practiceFeedbackVariant = variant;
            this.practiceFeedbackMessage = message;
        },

        clearPracticeFeedback() {
            this.practiceFeedbackMessage = '';
        },

        openRecordPracticeModal() {
            const el = document.getElementById('recordPracticeModal');
            if (el) {
                bootstrap.Modal.getOrCreateInstance(el).show();
            }
        },

        hideRecordPracticeModal() {
            const el = document.getElementById('recordPracticeModal');
            if (el) {
                bootstrap.Modal.getOrCreateInstance(el).hide();
            }
        },
        
        /**
         * Load song details
         */
        async loadSong(songId) {
            const supabase = await waitForSupabase();
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', songId)
                .single();

            if (error) {
                console.error('Error fetching song:', error);
                alert('Song not found');
                window.location.href = 'songs.html';
                return;
            }

            if (data.tab_path) {
                const { data: signedUrlData, error: signedUrlError } = await supabase
                    .storage
                    .from('song_tabs')
                    .createSignedUrl(data.tab_path, 3600); // 1 hour expiry

                if (signedUrlError) {
                    console.error('Error creating signed URL:', signedUrlError);
                } else {
                    data.tab_url = signedUrlData.signedUrl;
                }
            }

            this.song = data;
            if (this.song.bpm) {
                this.bpm = this.song.bpm;
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
         * Validate and constrain practice time input
         */
        validatePracticeTime() {
            // Ensure it's a number
            this.practiceTime = parseInt(this.practiceTime) || 5;
            
            // Constrain to valid range
            if (this.practiceTime < 5) {
                this.practiceTime = 5;
            } else if (this.practiceTime > 60) {
                this.practiceTime = 60;
            }
            
            // Round to nearest 5 minutes for consistency
            this.practiceTime = Math.round(this.practiceTime / 5) * 5;
        },
        
        /**
         * Increase BPM by 1
         */
        increaseBpm() {
            if (this.bpm < 200) {
                this.bpm += 1;
                this.updateMetronomeBPM();
            }
        },
        
        /**
         * Decrease BPM by 1
         */
        decreaseBpm() {
            if (this.bpm > 40) {
                this.bpm -= 1;
                this.updateMetronomeBPM();
            }
        },
        
        /**
         * Validate and constrain BPM input
         */
        validateBpm() {
            // Ensure it's a number
            this.bpm = parseInt(this.bpm) || 60;
            
            // Constrain to valid range
            if (this.bpm < 40) {
                this.bpm = 40;
            } else if (this.bpm > 200) {
                this.bpm = 200;
            }
            
            // Update metronome if it's running
            this.updateMetronomeBPM();
        },
        
        /**
         * Start practice session
         */
        async startPractice() {
            if (this.isTimerRunning && !this.isTimerPaused) {
                return; // Already running
            }
            
            console.log('Starting practice:', {
                song: this.song.title,
                time: this.practiceTime,
                bpm: this.bpm
            });
            
            // Start the timer
            this.isTimerRunning = true;
            this.isTimerPaused = false;
            this.timerSeconds = this.practiceTime * 60; // Convert minutes to seconds
            this.updateTimerDisplay();
            
            // Start metronome by default
            this.isMetronomeOn = true;
            this.startMetronome();
            
            // Start countdown
            this.timerInterval = setInterval(() => {
                if (!this.isTimerPaused) {
                    this.timerSeconds--;
                    this.updateTimerDisplay();
                    
                    if (this.timerSeconds <= 0) {
                        this.completePractice();
                    }
                }
            }, 1000);
        },
        
        /**
         * Initialize audio context for metronome
         */
        initAudioContext() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        },
        
        /**
         * Play a single metronome click
         */
        playClick() {
            if (!this.audioContext) {
                this.initAudioContext();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Create a short, sharp click sound
            oscillator.frequency.value = 1000; // 1000 Hz tone
            gainNode.gain.value = 0.3; // Volume
            
            const now = this.audioContext.currentTime;
            
            // Quick attack and decay for click sound
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            oscillator.start(now);
            oscillator.stop(now + 0.05);
        },
        
        /**
         * Start the metronome
         */
        startMetronome() {
            // Initialize audio context
            this.initAudioContext();
            
            // Stop any existing metronome
            this.stopMetronome();
            
            // Calculate interval in milliseconds (60000ms / BPM)
            const interval = 60000 / this.bpm;
            
            // Play first click immediately
            this.playClick();
            
            // Set up recurring clicks
            this.metronomeInterval = setInterval(() => {
                if (!this.isTimerPaused) {
                    this.playClick();
                }
            }, interval);
        },
        
        /**
         * Stop the metronome
         */
        stopMetronome() {
            if (this.metronomeInterval) {
                clearInterval(this.metronomeInterval);
                this.metronomeInterval = null;
            }
        },
        
        /**
         * Toggle metronome on/off
         */
        toggleMetronome() {
            this.isMetronomeOn = !this.isMetronomeOn;
            
            if (this.isMetronomeOn) {
                this.startMetronome();
            } else {
                this.stopMetronome();
            }
        },
        
        /**
         * Update BPM and restart metronome if running
         */
        updateMetronomeBPM() {
            if (this.isMetronomeOn) {
                // Restart metronome with new BPM
                this.startMetronome();
            }
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
         * Stop the timer (clears UI; does not record stats)
         */
        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Stop metronome
            this.stopMetronome();
            this.isMetronomeOn = false;
            
            this.isTimerRunning = false;
            this.isTimerPaused = false;
            this.timerSeconds = 0;
            this.timerDisplay = '00:00';
        },

        /**
         * Stop from the UI: offer to record elapsed time for stats
         */
        confirmStopPractice() {
            if (!this.isTimerRunning) {
                return;
            }
            const plannedSeconds = this.practiceTime * 60;
            const remainingSeconds = this.timerSeconds;
            this.stopTimer();
            const elapsedSeconds = plannedSeconds - remainingSeconds;
            if (elapsedSeconds <= 0) {
                return;
            }
            const durationMinutes = Math.min(
                this.practiceTime,
                Math.max(1, Math.ceil(elapsedSeconds / 60))
            );
            this.pendingRecordMinutes = durationMinutes;
            this.openRecordPracticeModal();
        },

        async submitPendingRecord() {
            const mins = this.pendingRecordMinutes;
            if (mins == null) {
                return;
            }
            try {
                await this.recordPracticeSession(mins);
                this.hideRecordPracticeModal();
                this.setPracticeFeedback('success', 'Practice recorded. Great work! 🎸');
            } catch (e) {
                console.error(e);
                this.hideRecordPracticeModal();
                this.setPracticeFeedback('danger', 'Could not save this practice session.');
            }
        },
        
        /**
         * Complete practice session
         */
        async completePractice() {
            // Stop the timer
            this.stopTimer();
            
            try {
                await this.recordPracticeSession(this.practiceTime);
                this.setPracticeFeedback('success', 'Practice session complete, well done! 🎸');
            } catch (e) {
                console.error(e);
                this.setPracticeFeedback('danger', 'Could not save this practice session.');
            }
        },
        
        /**
         * Record practice session in database
         * @param {number} [durationMinutes] — defaults to planned session length
         */
        async recordPracticeSession(durationMinutes) {
            const mins = durationMinutes ?? this.practiceTime;
            await recordSongPracticeSession(
                this.currentUser.userId,
                this.song.id,
                mins
            );

            await this.loadSong(this.song.id);
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
        async logout() {
            await window.logout();
        },
    }));
});
