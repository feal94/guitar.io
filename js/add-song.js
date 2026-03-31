
document.addEventListener('alpine:init', () => {
    Alpine.data('addSongApp', () => ({
        song: {
            title: '',
            artist: '',
            bpm: null,
            song_url: '',
            tab_path: ''
        },
        file: null,
        isLoading: false,
        errorMessage: '',
        user: null,

        init() {
            waitForSupabase().then(async supabase => {
                const { data: { session } } = await supabase.auth.getSession();
                this.user = session?.user;

                supabase.auth.onAuthStateChange((event, session) => {
                    this.user = session?.user ?? null;
                });
            });
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
                // 1. Upload file if it exists
                if (this.file) {
                    const filePath = `${this.user.id}/${Date.now()}_${this.file.name}`;
                    const { error: uploadError } = await supabase
                        .storage
                        .from('song_tabs')
                        .upload(filePath, this.file);
                    
                    if (uploadError) throw uploadError;
                    tabPath = filePath;
                }

                // 2. Insert song data into the database
                const { error: insertError } = await supabase
                    .from('songs')
                    .insert([{
                        user_id: this.user.id,
                        title: this.song.title,
                        artist: this.song.artist,
                        bpm: this.song.bpm,
                        song_url: this.song.song_url,
                        tab_path: tabPath
                    }]);

                if (insertError) throw insertError;

                // 3. Redirect on success
                window.location.href = 'songs.html';

            } catch (error) {
                this.errorMessage = `Error: ${error.message}`;
                console.error('Error adding song:', error);
                
                const supabase = await waitForSupabase();
                // Clean up uploaded file if database insert fails
                if (tabPath) {
                    await supabase.storage.from('song_tabs').remove([tabPath]);
                }
            } finally {
                this.isLoading = false;
            }
        }
    }));
});
