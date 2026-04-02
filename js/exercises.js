// guitar.io - Exercises List JavaScript

document.addEventListener('alpine:init', () => {
    Alpine.data('exercisesApp', () => ({
        userEmail: '',
        currentUser: null,
        exercises: [],
        filterCategory: 'all',
        searchQuery: '',
        isLoading: true,

        /**
         * Initialize exercises page
         */
        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            this.currentUser = user;
            this.userEmail = user.email;

            await this.loadExercises();
        },

        /**
         * Load catalog from exercises.json and merge progress from Supabase
         */
        async loadExercises() {
            this.isLoading = true;
            try {
                const catalog = await fetchExercisesCatalog();
                const progressMap = await fetchExerciseProgressMap(this.currentUser.userId);

                const withProgress = catalog.map((ex) => {
                    const p = progressMap.get(ex.id);
                    return {
                        ...ex,
                        progress: mapProgressRow(p),
                    };
                });

                withProgress.sort((a, b) => {
                    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
                    const diffA = difficultyOrder[a.difficulty] ?? 99;
                    const diffB = difficultyOrder[b.difficulty] ?? 99;

                    if (diffA !== diffB) {
                        return diffA - diffB;
                    }

                    const baseTitle = (title) => {
                        if (!title) {
                            return '';
                        }
                        const parts = title.split(':');
                        return parts[0].trim().toLowerCase();
                    };

                    const titleA = baseTitle(a.title);
                    const titleB = baseTitle(b.title);

                    const cmp = titleA.localeCompare(titleB);
                    if (cmp !== 0) {
                        return cmp;
                    }

                    return (a.title || '').localeCompare(b.title || '');
                });

                this.exercises = withProgress;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get filtered exercises based on category
         */
        get filteredExercises() {
            const query = this.searchQuery.trim().toLowerCase();
            return this.exercises.filter((ex) => {
                const matchesCategory =
                    this.filterCategory === 'all' || ex.category === this.filterCategory;

                if (!matchesCategory) {
                    return false;
                }

                if (!query) {
                    return true;
                }

                const haystack = `${ex.title || ''} ${ex.description || ''} ${ex.category || ''}`.toLowerCase();
                return haystack.includes(query);
            });
        },

        /**
         * List of categories derived from current exercises
         */
        get categories() {
            const set = new Set();
            for (const ex of this.exercises) {
                if (ex.category) {
                    set.add(ex.category);
                }
            }

            return Array.from(set).sort((a, b) => a.localeCompare(b));
        },

        /**
         * Logout user
         */
        async logout() {
            await window.logout();
        },
    }));
});
