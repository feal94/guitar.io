// guitar.io - Dashboard JavaScript

/**
 * Alpine.js component for dashboard
 */
function dashboardApp() {
    return {
        userEmail: '',
        displayName: '',
        currentUser: null,
        stats: {
            minutesThisMonth: 0,
            songsPracticed: 0,
            totalSessions: 0,
        },
        recentSongs: [],
        userRoutines: [],
        currentMonthYear: '',
        calendarHtml: '',
        practiceDays: [],

        /**
         * Initialize dashboard
         */
        async init() {
            const user = await getSessionUser();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            this.currentUser = user;
            this.userEmail = user.email;

            await this.loadUserData();

            await this.loadStats();

            this.generateCalendar();

            await this.loadRecentSongs();

            await this.loadUserRoutines();
        },

        /**
         * Load user display name from Supabase profiles
         */
        async loadUserData() {
            const name = await fetchProfileDisplayName(this.currentUser.userId);
            if (name) {
                this.displayName = name;
            } else {
                this.displayName = this.userEmail;
            }
        },

        /**
         * Generate calendar for current month
         */
        generateCalendar() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            const monthNames = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ];
            this.currentMonthYear = `${monthNames[month]} ${year}`;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = now.getDate();

            let html = '<div class="calendar-days">';

            const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            dayHeaders.forEach((day) => {
                html += `<div class="calendar-day-header">${day}</div>`;
            });

            for (let i = 0; i < firstDay; i++) {
                html += '<div class="calendar-day"></div>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const isFuture = day > today;
                const isPracticeDay = this.practiceDays.includes(day);
                const isToday = day === today;

                let classes = 'calendar-day';
                if (isFuture) {
                    classes += ' future';
                }

                if (isPracticeDay) {
                    classes += ' practice-day';
                } else if (isToday) {
                    classes += ' today';
                }

                html += `<div class="${classes}">${day}</div>`;
            }

            html += '</div>';
            this.calendarHtml = html;
        },

        /**
         * Load practice stats from Supabase
         */
        async loadStats() {
            const currentMonth = new Date();
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();

            const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextMonthYear = month === 11 ? year + 1 : year;
            const monthEnd = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;

            const rows = await fetchPracticeSessionsInRange(
                this.currentUser.userId,
                monthStart,
                monthEnd
            );
            const agg = aggregateMonthlyStats(rows);

            this.stats.totalSessions = agg.totalSessions;
            this.stats.minutesThisMonth = agg.totalMinutes;
            this.stats.songsPracticed = agg.uniqueSongs;

            this.practiceDays = practiceDaysOfMonthFromStrings(agg.practiceDateStrings, year, month);
        },

        /**
         * Load recent songs from Supabase
         */
        async loadRecentSongs() {
            this.recentSongs = await fetchRecentSongs(this.currentUser.userId, 5);
        },

        /**
         * Load user routines from Supabase
         */
        async loadUserRoutines() {
            this.userRoutines = await fetchUserRoutines(this.currentUser.userId);
        },

        /**
         * Logout user
         */
        async logout() {
            await window.logout();
        },
    };
}
