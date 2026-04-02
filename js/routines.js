// guitar.io — list user practice routines

document.addEventListener('alpine:init', () => {
    Alpine.data('routinesApp', () => ({
        userEmail: '',
        currentUser: null,
        routines: [],
        searchQuery: '',
        isLoading: true,

        get filteredRoutines() {
            if (!this.searchQuery) {
                return this.routines;
            }
            const q = this.searchQuery.toLowerCase();
            return this.routines.filter((r) => {
                const name = (r.name || '').toLowerCase();
                const desc = (r.description || '').toLowerCase();
                return name.includes(q) || desc.includes(q);
            });
        },

        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            this.currentUser = user;
            this.userEmail = user.email;

            await this.fetchRoutines();
        },

        async fetchRoutines() {
            this.isLoading = true;
            try {
                this.routines = await fetchUserRoutines(this.currentUser.userId);
            } catch (e) {
                console.error(e);
                alert('Could not load routines. Please try again.');
            } finally {
                this.isLoading = false;
            }
        },

        async confirmDelete(routine) {
            if (!routine?.id) {
                return;
            }
            const ok = window.confirm(`Delete routine "${routine.name}"? This cannot be undone.`);
            if (!ok) {
                return;
            }
            try {
                await deleteRoutine(routine.id);
                await this.fetchRoutines();
            } catch (e) {
                console.error(e);
                alert('Could not delete routine. Please try again.');
            }
        },

        async logout() {
            await window.logout();
        },
    }));
});
