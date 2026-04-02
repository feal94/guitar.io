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
        user: null,

        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            this.user = user;
        },

        handleFileUpload(event) {
            this.file = event.target.files[0];
        },

        async addSong() {
            if (!this.user) {
                this.errorMessage = 'You must be logged in to add a song.';
                return;
            }

            this.isLoading = true;
            this.errorMessage = '';
            let tabPath = '';

            try {
                const supabase = await waitForSupabase();
                if (!supabase) {
                    throw new Error('Supabase is not configured');
                }
                if (this.file) {
                    const filePath = `${this.user.userId}/${Date.now()}_${this.file.name}`;
                    const { error: uploadError } = await supabase.storage
                        .from('song_tabs')
                        .upload(filePath, this.file);

                    if (uploadError) throw uploadError;
                    tabPath = filePath;
                }

                const { error: insertError } = await supabase.from('songs').insert([
                    {
                        user_id: this.user.userId,
                        title: this.song.title,
                        artist: this.song.artist,
                        bpm: this.song.bpm,
                        song_url: this.song.song_url,
                        tab_path: tabPath,
                    },
                ]);

                if (insertError) throw insertError;

                window.location.href = 'songs.html';
            } catch (error) {
                this.errorMessage = `Error: ${error.message}`;
                console.error('Error adding song:', error);

                const supabase = await waitForSupabase();
                if (supabase && tabPath) {
                    await supabase.storage.from('song_tabs').remove([tabPath]);
                }
            } finally {
                this.isLoading = false;
            }
        },
    }));
});
