/**
 * Authentication routes
 * Handles register, login, refresh, logout
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { runQuery, getQuery } = require('../database/db');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken
} = require('../utils/tokens');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
/**
 * POST /auth/register
 * Create new user account
 */
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // Validation
        if (!email || !username || !password) {
            return res.status(400).json({
                error: 'Email, username and password required'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }
        // Check if user exists
        const existingUser = await getQuery(
            `SELECT id FROM users WHERE email = ? OR username = ?`,
            [email, username]
        );
        if (existingUser) {
            return res.status(409).json({
                error: 'Email or username already exists'
            });
        }
        // Hash password (10 rounds is standard)
        const passwordHash = await bcrypt.hash(password, 10);
        // Insert user
        const result = await runQuery(
            `INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`,
            [email, username, passwordHash]
        );
        // Create user object
        const user = {
            id: result.id,
            email,
            username
        };
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);
        // Set refresh token as httpOnly cookie (secure in production)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.status(201).json({
            message: 'User created successfully',
            accessToken,
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Failed to register user'
        });
    }
});
/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }
        // Find user
        const user = await getQuery(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);
        // Track session (optional)
        await runQuery(
            `INSERT INTO sessions (user_id, ip_address, user_agent) VALUES (?, ?, ?)`,
            [user.id, req.ip, req.get('user-agent')]
        );
        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            message: 'Login successful',
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Failed to login'
        });
    }
});
/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
    try {
        const { refreshToken } = req;
        // Verify refresh token
        const decoded = await verifyRefreshToken(refreshToken);
        // Get user data
        const user = await getQuery(
            `SELECT id, email, username FROM users WHERE id = ?`,
            [decoded.id]
        );
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        // Generate new access token
        const accessToken = generateAccessToken(user);
        res.json({
            accessToken,
            user
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(403).json({
            error: 'Invalid refresh token'
        });
    }
});
/**
 * POST /auth/logout
 * Revoke refresh token
 */
router.post('/logout', authenticateRefreshToken, async (req, res) => {
    try {
        const { refreshToken } = req;
        // Revoke token
        await revokeRefreshToken(refreshToken);
        // Clear cookie
        res.clearCookie('refreshToken');
        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Failed to logout'
        });
    }
});
/**
 * GET /auth/me
 * Get current user info (protected route example)
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user is set by authenticateToken middleware
        const user = await getQuery(
            `SELECT id, email, username, created_at FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to get user info'
        });
    }
});
module.exports = router;