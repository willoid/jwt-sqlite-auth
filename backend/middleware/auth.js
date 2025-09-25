/**
 * Authentication middleware
 * Protects routes by verifying JWT tokens
 */
const { verifyAccessToken } = require('../utils/tokens');
/**
 * Middleware to verify access token from Authorization header
 * Used for API routes
 */
function authenticateToken(req, res, next) {
    // Get token from Authorization header
    // Format: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            error: 'Access token required'
        });
    }
    try {
        // Verify token and attach user to request
        const user = verifyAccessToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Invalid or expired token'
        });
    }
}
/**
 * Middleware to verify refresh token from cookie
 * Used for token refresh endpoint
 */
function authenticateRefreshToken(req, res, next) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({
            error: 'Refresh token required'
        });
    }
    req.refreshToken = refreshToken;
    next();
}
/**
 * Optional authentication - doesn't fail if no token
 * Used for routes that work with or without auth
 */
function optionalAuthentication(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const user = verifyAccessToken(token);
            req.user = user;
        } catch (error) {
            // Invalid token, but continue anyway
            req.user = null;
        }
    }
    next();
}
module.exports = {
    authenticateToken,
    authenticateRefreshToken,
    optionalAuthentication
};