// guitar.io — run a practice routine (steps: songs + exercises)

document.addEventListener('alpine:init', () => {
    Alpine.data('routineApp', () => ({
        userEmail: '',
        currentUser: null,
        routineMeta: null,
        steps: [],
        currentIndex: 0,
        currentKind: '',
        song: null,
        exercise: null,
        exerciseProgress: {
            times_practiced: 0,
            last_practiced: null,
            completed: 0,
        },
        practiceTime: 5,
        sessionPlannedMinutes: 5,
        bpm: 60,
        isTimerRunning: false,
        isTimerPaused: false,
        timerSeconds: 0,
        timerDisplay: '00:00',
        timerInterval: null,
        isMetronomeOn: false,
        metronomeInterval: null,
        audioContext: null,
        isLoading: true,
        loadError: '',

        pendingRecordMinutes: null,
        practiceFeedbackMessage: '',
        practiceFeedbackVariant: 'success',

        get currentStep() {
            return this.steps[this.currentIndex] || null;
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

        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            this.currentUser = user;
            this.userEmail = user.email;

            const params = new URLSearchParams(window.location.search);
            const routineId = params.get('id');
            if (!routineId) {
                window.location.href = 'routines.html';
                return;
            }

            await this.loadRoutine(routineId);
        },

        async loadRoutine(routineId) {
            this.isLoading = true;
            this.loadError = '';
            try {
                const bundle = await fetchRoutineWithItems(routineId);
                if (!bundle || !bundle.routine) {
                    this.loadError = 'Routine not found.';
                    return;
                }

                this.routineMeta = {
                    id: bundle.routine.id,
                    name: bundle.routine.name,
                    description: bundle.routine.description || '',
                };

                const catalog = await fetchExercisesCatalog();
                const supabase = await waitForSupabase();
                const built = [];

                for (const it of bundle.items) {
                    if (it.item_type === 'song' && it.song_id) {
                        const { data, error } = await supabase
                            .from('songs')
                            .select('*')
                            .eq('id', it.song_id)
                            .single();
                        if (error || !data) {
                            console.error('Routine song missing', error);
                            continue;
                        }
                        if (data.tab_path) {
                            const { data: signed, error: signedErr } = await supabase.storage
                                .from('song_tabs')
                                .createSignedUrl(data.tab_path, 3600);
                            if (!signedErr && signed?.signedUrl) {
                                data.tab_url = signed.signedUrl;
                            }
                        }
                        built.push({
                            item_type: 'song',
                            duration_minutes: it.duration_minutes,
                            song: data,
                        });
                    } else if (it.item_type === 'exercise' && it.exercise_id) {
                        const ex = (catalog || []).find((e) => e.id === it.exercise_id);
                        if (!ex) {
                            console.error('Routine exercise not in catalog', it.exercise_id);
                            continue;
                        }
                        built.push({
                            item_type: 'exercise',
                            duration_minutes: it.duration_minutes,
                            exercise: ex,
                        });
                    }
                }

                this.steps = built;
                if (!this.steps.length) {
                    this.loadError = 'This routine has no items you can open (missing songs or exercises).';
                    return;
                }

                await this.applyStep(0);
            } catch (e) {
                console.error(e);
                this.loadError = 'Could not load this routine.';
            } finally {
                this.isLoading = false;
            }
        },

        async applyStep(index) {
            this.stopTimer();
            this.currentIndex = index;
            const step = this.steps[index];
            if (!step) {
                this.currentKind = '';
                this.song = null;
                this.exercise = null;
                return;
            }

            this.practiceTime = step.duration_minutes || 5;
            this.validatePracticeTime();

            if (step.item_type === 'song') {
                this.currentKind = 'song';
                this.song = step.song;
                this.exercise = null;
                this.bpm = step.song.bpm || 60;
            } else {
                this.currentKind = 'exercise';
                this.exercise = step.exercise;
                this.song = null;
                this.bpm = 60;
                const progressRow = await fetchSingleExerciseProgress(
                    this.currentUser.userId,
                    step.exercise.id
                );
                if (progressRow) {
                    this.exerciseProgress = {
                        times_practiced: progressRow.times_practiced ?? 0,
                        last_practiced: progressRow.last_practiced,
                        completed: progressRow.completed ? 1 : 0,
                    };
                } else {
                    this.exerciseProgress = {
                        times_practiced: 0,
                        last_practiced: null,
                        completed: 0,
                    };
                }
            }
        },

        increaseTime() {
            if (this.practiceTime < 180) {
                this.practiceTime += 1;
            }
        },

        decreaseTime() {
            if (this.practiceTime > 1) {
                this.practiceTime -= 1;
            }
        },

        validatePracticeTime() {
            let n = parseInt(this.practiceTime, 10);
            if (Number.isNaN(n) || n < 1) {
                n = 1;
            } else if (n > 180) {
                n = 180;
            }
            this.practiceTime = n;
        },

        increaseBpm() {
            if (this.bpm < 200) {
                this.bpm += 1;
                this.updateMetronomeBPM();
            }
        },

        decreaseBpm() {
            if (this.bpm > 40) {
                this.bpm -= 1;
                this.updateMetronomeBPM();
            }
        },

        validateBpm() {
            this.bpm = parseInt(this.bpm, 10) || 60;
            if (this.bpm < 40) {
                this.bpm = 40;
            } else if (this.bpm > 200) {
                this.bpm = 200;
            }
            this.updateMetronomeBPM();
        },

        async startPractice() {
            if (this.isTimerRunning && !this.isTimerPaused) {
                return;
            }
            this.validatePracticeTime();
            this.sessionPlannedMinutes = this.practiceTime;

            this.isTimerRunning = true;
            this.isTimerPaused = false;
            this.timerSeconds = this.practiceTime * 60;
            this.updateTimerDisplay();

            this.isMetronomeOn = true;
            this.startMetronome();

            this.timerInterval = setInterval(() => {
                if (!this.isTimerPaused) {
                    this.timerSeconds -= 1;
                    this.updateTimerDisplay();
                    if (this.timerSeconds <= 0) {
                        this.completeCurrentStep();
                    }
                }
            }, 1000);
        },

        initAudioContext() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        },

        playClick() {
            if (!this.audioContext) {
                this.initAudioContext();
            }
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.3;
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.05);
        },

        startMetronome() {
            this.initAudioContext();
            this.stopMetronome();
            const interval = 60000 / this.bpm;
            this.playClick();
            this.metronomeInterval = setInterval(() => {
                if (!this.isTimerPaused) {
                    this.playClick();
                }
            }, interval);
        },

        stopMetronome() {
            if (this.metronomeInterval) {
                clearInterval(this.metronomeInterval);
                this.metronomeInterval = null;
            }
        },

        toggleMetronome() {
            this.isMetronomeOn = !this.isMetronomeOn;
            if (this.isMetronomeOn) {
                this.startMetronome();
            } else {
                this.stopMetronome();
            }
        },

        updateMetronomeBPM() {
            if (this.isMetronomeOn) {
                this.startMetronome();
            }
        },

        pauseTimer() {
            this.isTimerPaused = true;
        },

        resumeTimer() {
            this.isTimerPaused = false;
        },

        updateTimerDisplay() {
            const minutes = Math.floor(this.timerSeconds / 60);
            const seconds = this.timerSeconds % 60;
            this.timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.stopMetronome();
            this.isMetronomeOn = false;
            this.isTimerRunning = false;
            this.isTimerPaused = false;
            this.timerSeconds = 0;
            this.timerDisplay = '00:00';
        },

        async recordCurrentStepSession(durationMinutes) {
            const step = this.steps[this.currentIndex];
            if (!step || !this.routineMeta) {
                return;
            }
            if (step.item_type === 'song') {
                await recordSongPracticeSession(
                    this.currentUser.userId,
                    step.song.id,
                    durationMinutes,
                    this.routineMeta.id
                );
            } else {
                await recordExercisePracticeSession(
                    this.currentUser.userId,
                    step.exercise.id,
                    durationMinutes,
                    this.routineMeta.id
                );
            }
        },

        confirmStopPractice() {
            if (!this.isTimerRunning) {
                return;
            }
            const plannedSeconds = this.sessionPlannedMinutes * 60;
            const remainingSeconds = this.timerSeconds;
            this.stopTimer();
            const elapsedSeconds = plannedSeconds - remainingSeconds;
            if (elapsedSeconds <= 0) {
                return;
            }
            const durationMinutes = Math.min(
                this.sessionPlannedMinutes,
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
                await this.recordCurrentStepSession(mins);
                await this.applyStep(this.currentIndex);
                this.hideRecordPracticeModal();
                this.setPracticeFeedback('success', 'Practice recorded. Great work! 🎸');
            } catch (e) {
                console.error(e);
                this.hideRecordPracticeModal();
                this.setPracticeFeedback('danger', 'Could not save this practice session.');
            }
        },

        async completeCurrentStep() {
            this.stopTimer();
            const step = this.steps[this.currentIndex];
            if (!step || !this.routineMeta) {
                return;
            }
            const mins = this.sessionPlannedMinutes;
            try {
                await this.recordCurrentStepSession(mins);
            } catch (e) {
                console.error(e);
                this.setPracticeFeedback(
                    'danger',
                    'Could not save this practice session. You can still continue the routine.'
                );
                return;
            }

            if (this.currentIndex >= this.steps.length - 1) {
                this.setPracticeFeedback('success', 'Routine complete — great work!');
                return;
            }

            this.currentIndex += 1;
            await this.applyStep(this.currentIndex);
            this.setPracticeFeedback('success', 'Step complete! Continue when you are ready.');
        },

        async goPrev() {
            if (this.isTimerRunning || this.currentIndex <= 0) {
                return;
            }
            await this.applyStep(this.currentIndex - 1);
        },

        async goNext() {
            if (this.isTimerRunning || this.currentIndex >= this.steps.length - 1) {
                return;
            }
            await this.applyStep(this.currentIndex + 1);
        },

        formatDate(dateString) {
            if (!dateString) {
                return 'Never';
            }
            const date = new Date(dateString);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return 'Today';
            }
            if (diffDays === 1) {
                return 'Yesterday';
            }
            if (diffDays < 7) {
                return `${diffDays} days ago`;
            }
            return date.toLocaleDateString();
        },

        async logout() {
            await window.logout();
        },
    }));
});
