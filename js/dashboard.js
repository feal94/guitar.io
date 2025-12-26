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
            hoursLastMonth: 0,
            songsPracticed: 0,
            totalSessions: 0
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
            // Check authentication
            const userData = localStorage.getItem('guitar_io_current_user');
            if (!userData) {
                window.location.href = 'index.html';
                return;
            }
            
            this.currentUser = JSON.parse(userData);
            this.userEmail = this.currentUser.email;
            
            // Initialize database
            await db.initialize();
            
            // Load user data
            await this.loadUserData();
            
            // Generate calendar
            this.generateCalendar();
            
            // Load stats
            await this.loadStats();
            
            // Load recent songs
            await this.loadRecentSongs();
            
            // Load user routines
            await this.loadUserRoutines();
        },
        
        /**
         * Load user data from database
         */
        async loadUserData() {
            const user = db.queryOne(
                'SELECT display_name FROM users WHERE email_hash = ?',
                [this.currentUser.emailHash]
            );
            
            if (user && user.display_name) {
                this.displayName = user.display_name;
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
            
            // Set month/year display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            this.currentMonthYear = `${monthNames[month]} ${year}`;
            
            // Get first day of month and number of days
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = now.getDate();
            
            // Build calendar HTML
            let html = '<div class="calendar-days">';
            
            // Day headers
            const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            dayHeaders.forEach(day => {
                html += `<div class="calendar-day-header">${day}</div>`;
            });
            
            // Empty cells before first day
            for (let i = 0; i < firstDay; i++) {
                html += '<div class="calendar-day"></div>';
            }
            
            // Days of month
            for (let day = 1; day <= daysInMonth; day++) {
                const isFuture = day > today;
                const isPracticeDay = this.practiceDays.includes(day);
                const isToday = day === today;
                
                let classes = 'calendar-day';
                if (isFuture) classes += ' future';
                if (isPracticeDay) classes += ' practice-day';
                if (isToday) classes += ' today';
                
                html += `<div class="${classes}">${day}</div>`;
            }
            
            html += '</div>';
            this.calendarHtml = html;
        },
        
        /**
         * Load practice stats from database
         */
        async loadStats() {
            // Get stats for last month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
            const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString();
            
            // Query practice sessions
            const sessions = db.query(`
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(duration_minutes) as total_minutes,
                    COUNT(DISTINCT song_id) as unique_songs
                FROM practice_sessions
                WHERE user_email_hash = ?
                AND session_date >= ?
                AND session_date <= ?
            `, [this.currentUser.emailHash, lastMonthStart, lastMonthEnd]);
            
            if (sessions.length > 0 && sessions[0].total_sessions > 0) {
                const stats = sessions[0];
                this.stats.totalSessions = stats.total_sessions || 0;
                this.stats.hoursLastMonth = Math.round((stats.total_minutes || 0) / 60);
                this.stats.songsPracticed = stats.unique_songs || 0;
            }
            
            // Load practice days for calendar highlighting
            const currentMonth = new Date();
            const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
            const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();
            
            const practiceSessions = db.query(`
                SELECT DISTINCT session_date
                FROM practice_sessions
                WHERE user_email_hash = ?
                AND session_date >= ?
                AND session_date <= ?
            `, [this.currentUser.emailHash, monthStart, monthEnd]);
            
            this.practiceDays = practiceSessions.map(session => {
                return new Date(session.session_date).getDate();
            });
        },
        
        /**
         * Load recent songs from database
         */
        async loadRecentSongs() {
            const songs = db.query(`
                SELECT id, title, artist, last_practiced
                FROM songs
                WHERE user_email_hash = ?
                ORDER BY last_practiced DESC
                LIMIT 5
            `, [this.currentUser.emailHash]);
            
            this.recentSongs = songs;
        },
        
        /**
         * Load user routines from database
         */
        async loadUserRoutines() {
            const routines = db.query(`
                SELECT id, name, duration_minutes
                FROM routines
                WHERE user_email_hash = ?
                ORDER BY created_at DESC
            `, [this.currentUser.emailHash]);
            
            this.userRoutines = routines;
        },
        
        /**
         * Logout user
         */
        logout() {
            localStorage.removeItem('guitar_io_current_user');
            window.location.href = 'index.html';
        }
    };
}

