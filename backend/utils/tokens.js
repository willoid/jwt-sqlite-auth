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
async function generateRefreshToken(user,  rememberMe = false) {
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
        {
            id: user.id,
            type: 'refresh',
            persistent: rememberMe,
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: expiresIn
        }
    );
    // Store in database for validation
    const expiresAt = new Date();
    if(rememberMe){
        expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
        expiresAt.setDate(expiresAt.getDate() + 7);
    }

    await runQuery(
        `INSERT INTO refresh_tokens (token, user_id, expires_at, is_persistent)
         VALUES (?, ?, ?, ?)`,
        [token, user.id, expiresAt.toISOString(), rememberMe ? 1 : 0]
    );
    return {token, rememberMe};
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
/**
 * Generate email verification token
 * Uses crypto for secure random token generation
 */
function generateVerificationToken() {
    // Generate 32-byte random token, convert to hex string
    // This gives us a 64-character token
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Create and store email verification token
 * Tokens expire in 24 hours (industry standard)
 */
async function createEmailVerificationToken(userId) {
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // Remove any existing tokens for this user
    await runQuery(
        `DELETE FROM email_verifications WHERE user_id = ?`,
        [userId]
    );
    // Insert new token
    await runQuery(
        `INSERT INTO email_verifications (user_id, token, expires_at)
         VALUES (?, ?, ?)`,
        [userId, token, expiresAt.toISOString()]
    );
    return token;
}
/**
 * Verify email verification token
 * Checks validity and expiry
 */
async function verifyEmailToken(token) {
    const verification = await getQuery(
        `SELECT ev.*, u.email, u.username
         FROM email_verifications ev
                  JOIN users u ON ev.user_id = u.id
         WHERE ev.token = ? AND ev.expires_at > datetime('now')`,
        [token]
    );

    if (!verification) {
        throw new Error('Invalid or expired verification token');
    }

    // Mark user as verified - ensure we're setting it to 1 (true)
    await runQuery(
        `UPDATE users
         SET email_verified = 1, verified_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [verification.user_id]
    );

    // Verify the update worked
    const updatedUser = await getQuery(
        `SELECT id, email_verified FROM users WHERE id = ?`,
        [verification.user_id]
    );

    console.log('User after verification:', updatedUser);

    // Delete used token
    await runQuery(
        `DELETE FROM email_verifications WHERE token = ?`,
        [token]
    );

    return verification;
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    revokeRefreshToken,
    cleanupExpiredTokens,
    generateVerificationToken,
    createEmailVerificationToken,
    verifyEmailToken
};