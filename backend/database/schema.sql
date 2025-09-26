-- This file defines our database structure
-- Run this to create all tables with proper relationships
-- Users table: Stores user accounts
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-incrementing ID
                                     email TEXT UNIQUE NOT NULL,            -- Email must be unique
                                     username TEXT UNIQUE NOT NULL,         -- Username must be unique
                                     password_hash TEXT NOT NULL,           -- Bcrypt hashed password
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Refresh tokens table: Stores valid refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              token TEXT UNIQUE NOT NULL,            -- The actual token
                                              user_id INTEGER NOT NULL,               -- Which user owns this
                                              expires_at DATETIME NOT NULL,          -- When token expires
                                              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
-- Blacklisted tokens: Invalidated tokens (for logout)
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
                                                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  token TEXT UNIQUE NOT NULL,            -- The invalidated token
                                                  blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Sessions table: Track user sessions (optional but useful)
CREATE TABLE IF NOT EXISTS sessions (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL,
                                        ip_address TEXT,                       -- User's IP
                                        user_agent TEXT,                       -- Browser info
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_token ON blacklisted_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               user_id INTEGER NOT NULL,
                                               reset_code TEXT NOT NULL,-- Stores BCrypt hashed code (never plain text)
                                               expires_at DATETIME NOT NULL,-- Hard expiry for security
                                               used BOOLEAN DEFAULT 0,-- Prevents code reuse
                                               created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verifications (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   user_id INTEGER NOT NULL,
                                                   token TEXT UNIQUE NOT NULL,           -- Random verification token
                                                   expires_at DATETIME NOT NULL,         -- Token expiry (24 hours)
                                                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
-- Track verification attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS verification_attempts (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     user_id INTEGER NOT NULL,
                                                     attempt_type TEXT NOT NULL,           -- 'send' or 'verify'
                                                     ip_address TEXT,
                                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );