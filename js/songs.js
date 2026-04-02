document.addEventListener('alpine:init', () => {
    Alpine.data('songsApp', () => ({
        songs: [],
        filteredSongs: [],
        searchQuery: '',
        userEmail: '',
        isLoading: true,

        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            this.userEmail = user.email;

            this.$watch('searchQuery', () => {
                this.filterSongs();
            });

            await this.fetchSongs();
        },

        async fetchSongs() {
            this.isLoading = true;
            try {
                const supabase = await waitForSupabase();
                if (!supabase) {
                    throw new Error('Supabase is not configured');
                }
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
            this.filteredSongs = this.songs.filter((song) => {
                return (
                    song.title.toLowerCase().includes(query) ||
                    (song.artist && song.artist.toLowerCase().includes(query))
                );
            });
        },

        async logout() {
            await window.logout();
        },
    }));
});
