
document.addEventListener('alpine:init', () => {
    Alpine.data('songsApp', () => ({
        songs: [],
        filteredSongs: [],
        searchQuery: '',
        userEmail: '',
        isLoading: true,
        
        init() {
            waitForSupabase().then(supabase => {
                this.userEmail = localStorage.getItem('user_email');
                this.fetchSongs();

                this.$watch('searchQuery', () => {
                    this.filterSongs();
                });
            });
        },

        async fetchSongs() {
            this.isLoading = true;
            try {
                const supabase = await waitForSupabase();
                const { data, error } = await supabase
                    .from('songs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.songs = data;
                this.filteredSongs = this.songs;
            } catch (error) {
                console.error('Error fetching songs:', error.message);
                alert('Could not fetch songs. Please try again.');
            } finally {
                this.isLoading = false;
            }
        },

        filterSongs() {
            if (!this.searchQuery) {
                this.filteredSongs = this.songs;
                return;
            }

            const query = this.searchQuery.toLowerCase();
            this.filteredSongs = this.songs.filter(song => {
                return (
                    song.title.toLowerCase().includes(query) ||
                    (song.artist && song.artist.toLowerCase().includes(query))
                );
            });
        },

        async logout() {
            const supabase = await waitForSupabase();
            supabase.auth.signOut().then(() => {
                localStorage.removeItem('user_email');
                window.location.href = 'index.html';
            }).catch(error => {
                console.error('Logout failed:', error);
            });
        }
    }));
});
