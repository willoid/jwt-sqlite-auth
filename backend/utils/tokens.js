/**
 * Token utility functions
 * Handles JWT creation, validation, and refresh logic
 */
const jwt = require('jsonwebtoken');
const { runQuery, getQuery } = require('../database/db');
/**
 * Generate access token (short-lived, 15 minutes)
 * Contains user data for stateless authentication
 */
function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username,
            type: 'access'
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
        }
    );
}
/**
 * Generate refresh token (long-lived, 7 days)
 * Used to get new access tokens
 */
async function generateRefreshToken(user) {
    const token = jwt.sign(
        {
            id: user.id,
            type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
        }
    );
    // Store in database for validation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await runQuery(
        `INSERT INTO refresh_tokens (token, user_id, expires_at)
         VALUES (?, ?, ?)`,
        [token, user.id, expiresAt.toISOString()]
    );
    return token;
}
/**
 * Verify access token
 */
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
        throw new Error('Invalid access token');
    }
}
/**
 * Verify refresh token and check if it's in database
 */
async function verifyRefreshToken(token) {
    try {
        // First verify the JWT signature
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        // Then check if it exists in database and not expired
        const dbToken = await getQuery(
            `SELECT * FROM refresh_tokens
             WHERE token = ? AND expires_at > datetime('now')`,
            [token]
        );
        if (!dbToken) {
            throw new Error('Refresh token not found or expired');
        }
        // Check if token is blacklisted
        const blacklisted = await getQuery(
            `SELECT * FROM blacklisted_tokens WHERE token = ?`,
            [token]
        );
        if (blacklisted) {
            throw new Error('Token has been revoked');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}
/**
 * Revoke a refresh token (for logout)
 */
async function revokeRefreshToken(token) {
    // Add to blacklist
    await runQuery(
        `INSERT OR IGNORE INTO blacklisted_tokens (token) VALUES (?)`,
        [token]
    );
    // Remove from active tokens
    await runQuery(
        `DELETE FROM refresh_tokens WHERE token = ?`,
        [token]
    );
}
/**
 * Clean up expired tokens (run periodically)
 */
async function cleanupExpiredTokens() {
    // Remove expired refresh tokens
    await runQuery(
        `DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`
    );
    // Remove old blacklisted tokens (older than 7 days)
    await runQuery(
        `DELETE FROM blacklisted_tokens
         WHERE blacklisted_at < datetime('now', '-7 days')`
    );
}
module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    revokeRefreshToken,
    cleanupExpiredTokens
};