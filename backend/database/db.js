/**
 * Database connection and initialization
 * SQLite is synchronous by default, we'll use callbacks for consistency
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
// Create database directory if it doesn't exist
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
// Connect to SQLite database (creates file if doesn't exist)
const db = new sqlite3.Database(
    process.env.DATABASE_PATH || './database/auth.db',
    (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to SQLite database');
        }
    }
);
// Enable foreign keys (SQLite has them disabled by default)
db.run('PRAGMA foreign_keys = ON');
// Initialize database schema
async function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Split by semicolon to run each statement separately
    const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
    // Run each statement sequentially
    for (const statement of statements) {
        await new Promise((resolve, reject) => {
            db.run(statement + ';', (err) => {
                if (err) {
                    console.error('Error executing schema:', err, '\nStatement:', statement);
                }
                resolve();
            });
        });
    }
    console.log('Database schema initialized');
}
// Helper function to promisify database queries
// This makes our code cleaner with async/await
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}
function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
// Initialize on startup
initializeDatabase();
module.exports = {
    db,
    runQuery,
    getQuery,
    allQuery
};