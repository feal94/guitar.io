// guitar.io — create a practice routine (ordered songs + exercises)

document.addEventListener('alpine:init', () => {
    Alpine.data('addRoutineApp', () => ({
        routineName: '',
        description: '',
        songs: [],
        exercises: [],
        songSelectId: '',
        exerciseSelectId: '',
        draftItems: [],
        isLoadingData: true,
        isSaving: false,
        errorMessage: '',
        editLoadError: '',
        editingId: null,
        /** True when URL has `?id=` (edit flow); set before async init. */
        isEditUrl: !!new URLSearchParams(window.location.search).get('id'),
        user: null,

        async init() {
            this.isLoadingData = true;
            this.editLoadError = '';
            try {
                const user = await getSessionUser();
                if (!user) {
                    window.location.href = 'index.html';
                    return;
                }
                this.user = user;

                const editId = new URLSearchParams(window.location.search).get('id');

                const [songRows, catalog] = await Promise.all([
                    fetchAllUserSongs(user.userId),
                    fetchExercisesCatalog(),
                ]);
                this.songs = songRows;
                this.exercises = catalog || [];

                if (editId) {
                    await this.loadRoutineForEdit(editId);
                }
            } catch (e) {
                console.error(e);
                this.errorMessage = 'Could not load songs or exercises. Please refresh.';
            } finally {
                this.isLoadingData = false;
            }
        },

        async loadRoutineForEdit(routineId) {
            const bundle = await fetchRoutineWithItems(routineId);
            if (!bundle || !bundle.routine) {
                this.editLoadError = 'Routine not found.';
                return;
            }
            const { routine, items } = bundle;
            if (routine.user_id !== this.user.userId) {
                this.editLoadError = 'You cannot edit this routine.';
                return;
            }

            this.editingId = routineId;
            this.routineName = routine.name ?? '';
            this.description = routine.description ?? '';

            const supabase = await waitForSupabase();
            const draft = [];

            for (const it of items) {
                if (it.item_type === 'song' && it.song_id) {
                    let song = this.songs.find((s) => s.id === it.song_id);
                    if (!song && supabase) {
                        const { data } = await supabase
                            .from('songs')
                            .select('id, title, artist')
                            .eq('id', it.song_id)
                            .maybeSingle();
                        if (data) {
                            song = data;
                        }
                    }
                    draft.push({
                        clientId: crypto.randomUUID(),
                        item_type: 'song',
                        song_id: it.song_id,
                        title: song?.title ?? 'Unknown song',
                        subtitle: song?.artist ?? '',
                        duration_minutes: it.duration_minutes ?? 5,
                    });
                } else if (it.item_type === 'exercise' && it.exercise_id) {
                    const ex = this.exercises.find((e) => e.id === it.exercise_id);
                    draft.push({
                        clientId: crypto.randomUUID(),
                        item_type: 'exercise',
                        exercise_id: it.exercise_id,
                        title: ex?.title ?? 'Unknown exercise',
                        subtitle: ex?.category ?? '',
                        duration_minutes: it.duration_minutes ?? 5,
                    });
                }
            }

            this.draftItems = draft;
        },

        addSongToDraft() {
            if (!this.songSelectId) {
                return;
            }
            const song = this.songs.find((s) => s.id === this.songSelectId);
            if (!song) {
                return;
            }
            if (this.draftItems.some((i) => i.item_type === 'song' && i.song_id === song.id)) {
                return;
            }
            this.draftItems.push({
                clientId: crypto.randomUUID(),
                item_type: 'song',
                song_id: song.id,
                title: song.title,
                subtitle: song.artist || '',
                duration_minutes: 5,
            });
            this.songSelectId = '';
        },

        addExerciseToDraft() {
            if (!this.exerciseSelectId) {
                return;
            }
            const ex = this.exercises.find((e) => e.id === this.exerciseSelectId);
            if (!ex) {
                return;
            }
            if (this.draftItems.some((i) => i.item_type === 'exercise' && i.exercise_id === ex.id)) {
                return;
            }
            this.draftItems.push({
                clientId: crypto.randomUUID(),
                item_type: 'exercise',
                exercise_id: ex.id,
                title: ex.title,
                subtitle: ex.category || '',
                duration_minutes: 5,
            });
            this.exerciseSelectId = '';
        },

        removeItem(index) {
            this.draftItems.splice(index, 1);
        },

        moveUp(index) {
            if (index <= 0) {
                return;
            }
            const arr = this.draftItems;
            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
        },

        moveDown(index) {
            if (index >= this.draftItems.length - 1) {
                return;
            }
            const arr = this.draftItems;
            [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
        },

        clampDuration(item) {
            let n = parseInt(item.duration_minutes, 10);
            if (Number.isNaN(n) || n < 1) {
                n = 1;
            } else if (n > 180) {
                n = 180;
            }
            item.duration_minutes = n;
        },

        async saveRoutine() {
            this.errorMessage = '';
            if (!this.user) {
                this.errorMessage = 'You must be logged in.';
                return;
            }
            if (!this.draftItems.length) {
                this.errorMessage = 'Add at least one song or exercise.';
                return;
            }

            this.isSaving = true;
            try {
                const items = this.draftItems.map((row) => {
                    if (row.item_type === 'song') {
                        return {
                            item_type: 'song',
                            song_id: row.song_id,
                            duration_minutes: row.duration_minutes,
                        };
                    }
                    return {
                        item_type: 'exercise',
                        exercise_id: row.exercise_id,
                        duration_minutes: row.duration_minutes,
                    };
                });

                if (this.editingId) {
                    await updateRoutineWithItems(
                        this.user.userId,
                        this.editingId,
                        { name: this.routineName.trim(), description: this.description.trim() },
                        items
                    );
                    window.location.href = `routine.html?id=${this.editingId}`;
                } else {
                    await insertRoutineWithItems(
                        this.user.userId,
                        { name: this.routineName.trim(), description: this.description.trim() },
                        items
                    );
                    window.location.href = 'routines.html';
                }
            } catch (e) {
                console.error(e);
                this.errorMessage = e.message || 'Could not save routine.';
            } finally {
                this.isSaving = false;
            }
        },
    }));
});
