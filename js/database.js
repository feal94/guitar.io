// guitar.io - Database Module using sql.js

/**
 * Database Manager Class
 * Handles all SQLite operations using sql.js
 */
class DatabaseManager {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.isInitialized = false;
    }

    /**
     * Initialize sql.js and create/load database
     */
    async initialize() {
        if (this.isInitialized) {
            return this.db;
        }

        try {
            // Load sql.js library
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
            });

            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem('guitar_io_database');
            
            if (savedDb) {
                // Load existing database
                const uint8Array = new Uint8Array(JSON.parse(savedDb));
                this.db = new this.SQL.Database(uint8Array);
                console.log('Database loaded from localStorage');
            } else {
                // Create new database
                this.db = new this.SQL.Database();
                console.log('New database created');
                
                // Initialize schema
                await this.initializeSchema();
                
                // Save initial database
                this.saveDatabase();
            }

            this.isInitialized = true;
            return this.db;

        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Create database schema
     */
    async initializeSchema() {
        // Users table - stores hashed authentication data
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                email_hash TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        `);

        // Songs table - stores user's song library
        this.db.run(`
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email_hash TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                last_practiced TEXT,
                FOREIGN KEY (user_email_hash) REFERENCES users(email_hash)
            )
        `);

        // Routines table - stores user's practice routines
        this.db.run(`
            CREATE TABLE IF NOT EXISTS routines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                duration_minutes INTEGER,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_email_hash) REFERENCES users(email_hash)
            )
        `);

        // Practice sessions table - tracks practice history
        this.db.run(`
            CREATE TABLE IF NOT EXISTS practice_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email_hash TEXT NOT NULL,
                session_date TEXT NOT NULL,
                duration_minutes INTEGER,
                routine_id INTEGER,
                song_id INTEGER,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_email_hash) REFERENCES users(email_hash),
                FOREIGN KEY (routine_id) REFERENCES routines(id),
                FOREIGN KEY (song_id) REFERENCES songs(id)
            )
        `);

        console.log('Database schema initialized');
    }

    /**
     * Save database to localStorage
     */
    saveDatabase() {
        if (!this.db) {
            console.error('Cannot save: database not initialized');
            return;
        }

        try {
            const data = this.db.export();
            const dataArray = Array.from(data);
            localStorage.setItem('guitar_io_database', JSON.stringify(dataArray));
            console.log('Database saved to localStorage');
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    /**
     * Execute a SQL query
     * @param {string} sql - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Array} Query results
     */
    query(sql, params = []) {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        try {
            const stmt = this.db.prepare(sql);
            stmt.bind(params);
            
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            
            return results;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    /**
     * Execute a SQL command (INSERT, UPDATE, DELETE)
     * @param {string} sql - SQL command string
     * @param {Array} params - Command parameters
     * @returns {boolean} Success status
     */
    execute(sql, params = []) {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        try {
            const stmt = this.db.prepare(sql);
            stmt.bind(params);
            stmt.step();
            stmt.free();
            
            // Save database after modification
            this.saveDatabase();
            
            return true;
        } catch (error) {
            console.error('Execute error:', error);
            throw error;
        }
    }

    /**
     * Get a single row from query
     * @param {string} sql - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Object|null} Single row or null
     */
    queryOne(sql, params = []) {
        const results = this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Clear all data and reset database
     */
    reset() {
        localStorage.removeItem('guitar_io_database');
        this.db = new this.SQL.Database();
        this.initializeSchema();
        this.saveDatabase();
        console.log('Database reset complete');
    }

}

// Create global database instance
const db = new DatabaseManager();

