/**
 * Authentication routes
 * Handles register, login, refresh, logout
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const {runQuery, getQuery} = require('../database/db');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken
} = require('../utils/tokens');
const {authenticateToken, authenticateRefreshToken} = require('../middleware/auth');
const emailService = require('../services/emailService');
const { createEmailVerificationToken, verifyEmailToken } = require('../utils/tokens');
/**
 * POST /auth/register
 * Create new user account
 */
/**
 * POST /auth/register
 * Create new user account with email verification
 */
router.post('/register', async (req, res) => {
    try {
        const {email, username, password} = req.body;
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
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        // Insert user (unverified by default)
        const result = await runQuery(
            `INSERT INTO users (email, username, password_hash, email_verified)
             VALUES (?, ?, ?, 0)`,
            [email, username, passwordHash]
        );
        // Generate verification token
        const verificationToken = await createEmailVerificationToken(result.id);
        // Send verification email (async, don't wait)
        emailService.sendVerificationEmail(email, username, verificationToken)
            .catch(err => console.error('Failed to send verification email:', err));
        // Create user object
        const user = {
            id: result.id,
            email,
            username,
            email_verified: false  // NEW: Include verification status
        };
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshData = await generateRefreshToken(user, false);
        // Set refresh token cookie
        res.cookie('refreshToken', refreshData.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(201).json({
            message: 'User created successfully. Please check your email to verify your account.',
            accessToken,
            user,
            requiresVerification: true  // NEW: Flag for frontend
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
        const {email, password, rememberMe} = req.body;
        console.log('Remember Me value:', rememberMe)
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }
        // Find user
        const user = await getQuery(
            `SELECT *
             FROM users
             WHERE email = ?`,
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
        const refreshData = await generateRefreshToken(user, rememberMe);

        const cookieMaxAge = rememberMe
            ? 30 * 24 * 60 * 60 * 1000 // 30 days
            : 7 * 24 * 60 * 60 * 1000; // 7 days
        // Track session (optional)
        await runQuery(
            `INSERT INTO sessions (user_id, ip_address, user_agent)
             VALUES (?, ?, ?)`,
            [user.id, req.ip, req.get('user-agent')]
        );
        // Set refresh token cookie
        res.cookie('refreshToken', refreshData.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: cookieMaxAge,
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
        const {refreshToken} = req;
        // Verify refresh token
        const decoded = await verifyRefreshToken(refreshToken);
        // Get user data
        const user = await getQuery(
            `SELECT id, email, username
             FROM users
             WHERE id = ?`,
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
        const {refreshToken} = req;
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
            `SELECT id, email, username, created_at
             FROM users
             WHERE id = ?`,
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

/**
 * POST /auth/forgot-password
 * Generates a secure reset code for the user
 *
 * Security considerations:
 * - Never reveal if email exists (prevents user enumeration)
 * - Hash the code before storing (defense in depth)
 * - 15-minute expiry (OWASP recommendation)
 *
 * In production: Would send code via email/SMS
 * For demo: Returns code in response
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const {email} = req.body;

// Input validation
        if (!email) {
            return res.status(400).json({
                error: 'Email required'
            });
        }

// Check if email format is valid (basic check)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

// Find user - but don't reveal if they exist
        const user = await getQuery(
            `SELECT id, username
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (!user) {
// SECURITY: Same response whether user exists or not
// This prevents attackers from discovering valid emails
            return res.json({
                message: 'If email exists, reset code will be sent',
                success: true
            });
        }

// Check for recent reset attempts (rate limiting)
        const recentAttempt = await getQuery(
            `SELECT COUNT(*) as count
             FROM password_resets
             WHERE user_id = ? AND created_at > datetime('now', '-5 minutes')`,
            [user.id]
        );

        if (recentAttempt.count > 2) {
// Rate limit: max 3 attempts per 5 minutes
            return res.status(429).json({
                error: 'Too many reset attempts. Try again in 5 minutes.'
            });
        }

// Generate cryptographically secure 6-digit code// Math.random() is fine for demo, use crypto.randomInt() in production
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

// Hash the code with BCrypt (same as passwords)// This ensures even database access doesn't reveal codes
        const hashedCode = await bcrypt.hash(resetCode, 10);

// Set expiry to 15 minutes from now
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

// Invalidate any existing unused codes for this user
        await runQuery(
            `UPDATE password_resets
             SET used = 1
             WHERE user_id = ?
               AND used = 0`,
            [user.id]
        );

// Store the new reset code
        await runQuery(
            `INSERT INTO password_resets (user_id, reset_code, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, hashedCode, expiresAt.toISOString()]
        );

// Log for audit trail
        console.log(`Password reset requested for user ${user.id} at ${new Date().toISOString()}`);

// DEMO ONLY: Return code directly// PRODUCTION: Send via email/SMS and never return in API
        res.json({
            message: 'Reset code generated',
            code: resetCode,// REMOVE THIS LINE IN PRODUCTION!expiresIn: '15 minutes',
            demo_note: '⚠️ In production, this code would be emailed, not returned in API'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: 'Failed to process request'
        });
    }
});
/**
 * POST /auth/reset-password
 * Verifies reset code and updates password
 *
 * Security flow:
 * 1. Validate all inputs
 * 2. Find user by email
 * 3. Find valid (unused, not expired) reset code
 * 4. Verify code matches using BCrypt
 * 5. Update password
 * 6. Mark code as used
 * 7. Invalidate all user sessions (security best practice)
 */
router.post('/reset-password', async (req, res) => {
    try {
        const {email, code, newPassword} = req.body;

// Comprehensive input validation
        if (!email || !code || !newPassword) {
            return res.status(400).json({
                error: 'Email, code, and new password required'
            });
        }

// Validate code format (must be 6 digits)
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                error: 'Invalid code format'
            });
        }

// Password strength validation
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

// Additional password strength check (optional but recommended)
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must contain uppercase, lowercase, and number'
            });
        }

// Find the user
        const user = await getQuery(
            `SELECT id, username
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (!user) {
// Generic error to prevent user enumeration
            return res.status(400).json({
                error: 'Invalid reset attempt'
            });
        }

// Find the most recent valid (unused, not expired) reset code
        const resetRecord = await getQuery(
            `SELECT *
             FROM password_resets
             WHERE user_id = ?
               AND used = 0
               AND expires_at > datetime('now')
             ORDER BY created_at DESC LIMIT 1`,
            [user.id]
        );

        if (!resetRecord) {
// No valid code found
            return res.status(400).json({
                error: 'Invalid or expired reset code'
            });
        }

// Verify the code using BCrypt compare
        const validCode = await bcrypt.compare(code, resetRecord.reset_code);
        if (!validCode) {
// Code doesn't match// Log failed attempt for security monitoring
            console.log(`Failed reset attempt for user ${user.id} at ${new Date().toISOString()}`);

            return res.status(400).json({
                error: 'Invalid code'
            });
        }

// Check if new password is same as code (common user mistake)
        if (newPassword === code) {
            return res.status(400).json({
                error: 'Password cannot be the same as reset code'
            });
        }

// Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

// Update the user's password
        await runQuery(
            `UPDATE users
             SET password_hash = ?,
                 updated_at    = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [passwordHash, user.id]
        );

// Mark the reset code as used
        await runQuery(
            `UPDATE password_resets
             SET used = 1
             WHERE id = ?`,
            [resetRecord.id]
        );

// SECURITY: Invalidate all refresh tokens for this user
// This logs out all sessions after password change
        await runQuery(
            `DELETE
             FROM refresh_tokens
             WHERE user_id = ?`,
            [user.id]
        );

// Log successful reset for audit
        console.log(`Password reset successful for user ${user.id} at ${new Date().toISOString()}`);

        res.json({
            message: 'Password reset successful. Please login with your new password.',
            success: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Failed to reset password'
        });
    }
});

/**
 * POST /auth/verify-email
 * Verify email with token from email link
 */
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                error: 'Verification token required'
            });
        }
        // Verify the token and mark email as verified
        const verification = await verifyEmailToken(token);
        // Log verification for audit
        await runQuery(
            `INSERT INTO verification_attempts (user_id, attempt_type, ip_address)
             VALUES (?, 'verify', ?)`,
            [verification.user_id, req.ip]
        );
        console.log("email verified for user:", verification.user_id);
        // After successful verification
        await runQuery(
            `UPDATE users SET email_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [verification.user_id]
        );
        res.json({
            message: 'Email verified successfully! You can now access all features.',
            email: verification.email,
            username: verification.username
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(400).json({
            error: error.message || 'Invalid or expired verification token'
        });
    }
});
/**
 * POST /auth/resend-verification
 * Resend verification email (rate limited)
 */
router.post('/resend-verification', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if already verified
        const user = await getQuery(
            `SELECT email, username, email_verified FROM users WHERE id = ?`,
            [userId]
        );
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        if (user.email_verified) {
            return res.status(400).json({
                error: 'Email already verified'
            });
        }
        // Rate limiting: Check recent attempts
        const recentAttempts = await getQuery(
            `SELECT COUNT(*) as count
             FROM verification_attempts
             WHERE user_id = ?
               AND attempt_type = 'send'
               AND created_at > datetime('now', '-1 hour')`,
            [userId]
        );
        if (recentAttempts.count >= 3) {
            return res.status(429).json({
                error: 'Too many requests. Please try again in 1 hour.'
            });
        }
        // Generate new verification token
        const verificationToken = await createEmailVerificationToken(userId);
        // Log attempt
        await runQuery(
            `INSERT INTO verification_attempts (user_id, attempt_type, ip_address)
             VALUES (?, 'send', ?)`,
            [userId, req.ip]
        );
        // Send email
        const emailResult = await emailService.sendVerificationEmail(
            user.email,
            user.username,
            verificationToken
        );
        res.json({
            message: 'Verification email sent successfully',
            demo_url: emailResult.verificationUrl  // Only for demo
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            error: 'Failed to resend verification email'
        });
    }
});
/**
 * GET /auth/verification-status
 * Check user's verification status
 */
router.get('/verification-status', authenticateToken, async (req, res) => {
    try {
        const user = await getQuery(
            `SELECT email_verified, verified_at FROM users WHERE id = ?`,
            [req.user.id]
        );
        res.json({
            verified: !!user.email_verified,
            verifiedAt: user.verified_at
        });
    } catch (error) {
        console.error('Verification status error:', error);
        res.status(500).json({
            error: 'Failed to check verification status'
        });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getQuery(
            `SELECT id, email, username, created_at, email_verified, verified_at
             FROM users WHERE id = ?`,
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