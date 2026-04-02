document.addEventListener('alpine:init', () => {
    Alpine.data('addSongApp', () => ({
        song: {
            title: '',
            artist: '',
            bpm: null,
            song_url: '',
            tab_path: '',
        },
        file: null,
        isLoading: false,
        errorMessage: '',
        editLoadError: '',
        initialLoading: !!new URLSearchParams(window.location.search).get('id'),
        editingId: null,
        user: null,

        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            this.user = user;

            const editId = new URLSearchParams(window.location.search).get('id');
            if (editId) {
                await this.loadSongForEdit(editId);
                this.initialLoading = false;
            }
        },

        async loadSongForEdit(songId) {
            const supabase = await waitForSupabase();
            if (!supabase) {
                this.editLoadError = 'Supabase is not configured.';
                return;
            }
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', songId)
                .single();

            if (error || !data) {
                this.editLoadError = 'Song not found.';
                return;
            }
            if (data.user_id !== this.user.userId) {
                this.editLoadError = 'You cannot edit this song.';
                return;
            }

            this.editingId = songId;
            this.song = {
                title: data.title ?? '',
                artist: data.artist ?? '',
                bpm: data.bpm,
                song_url: data.song_url ?? '',
                tab_path: data.tab_path ?? '',
            };
        },

        handleFileUpload(event) {
            this.file = event.target.files[0];
        },

        async saveSong() {
            if (!this.user) {
                this.errorMessage = 'You must be logged in to save a song.';
                return;
            }

            this.isLoading = true;
            this.errorMessage = '';
            let uploadedTabPath = '';

            try {
                const supabase = await waitForSupabase();
                if (!supabase) {
                    throw new Error('Supabase is not configured');
                }

                const previousTabPath = this.editingId ? this.song.tab_path : '';

                if (this.file) {
                    const filePath = `${this.user.userId}/${Date.now()}_${this.file.name}`;
                    const { error: uploadError } = await supabase.storage
                        .from('song_tabs')
                        .upload(filePath, this.file);

                    if (uploadError) throw uploadError;
                    uploadedTabPath = filePath;
                }

                if (this.editingId) {
                    const newTabPath = uploadedTabPath || this.song.tab_path || null;
                    const { error: updateError } = await supabase
                        .from('songs')
                        .update({
                            title: this.song.title,
                            artist: this.song.artist,
                            bpm: this.song.bpm,
                            song_url: this.song.song_url || null,
                            tab_path: newTabPath,
                        })
                        .eq('id', this.editingId);

                    if (updateError) throw updateError;

                    if (uploadedTabPath && previousTabPath && previousTabPath !== uploadedTabPath) {
                        await supabase.storage.from('song_tabs').remove([previousTabPath]);
                    }

                    window.location.href = `song.html?id=${this.editingId}`;
                    return;
                }

                const { error: insertError } = await supabase.from('songs').insert([
                    {
                        user_id: this.user.userId,
                        title: this.song.title,
                        artist: this.song.artist,
                        bpm: this.song.bpm,
                        song_url: this.song.song_url,
                        tab_path: uploadedTabPath,
                    },
                ]);

                if (insertError) throw insertError;

                window.location.href = 'songs.html';
            } catch (error) {
                this.errorMessage = `Error: ${error.message}`;
                console.error('Error saving song:', error);

                const supabase = await waitForSupabase();
                if (supabase && uploadedTabPath) {
                    await supabase.storage.from('song_tabs').remove([uploadedTabPath]);
                }
            } finally {
                this.isLoading = false;
            }
        },
    }));
});
