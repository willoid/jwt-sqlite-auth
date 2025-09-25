/**
 * Main server file
 * Sets up Express server with all middleware and routes
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const { cleanupExpiredTokens } = require('./utils/tokens');
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());
// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/auth', authRoutes);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║       JWT Auth Server Running          ║
║                                        ║
║  Port: ${PORT}                            ║
║  Database: SQLite                      ║
║  Environment: ${process.env.NODE_ENV || 'development'}          ║
║                                        ║
║  Endpoints:                            ║
║  POST /auth/register                   ║
║  POST /auth/login                      ║
║  POST /auth/refresh                    ║
║  POST /auth/logout                     ║
║  GET  /auth/me                         ║
╚════════════════════════════════════════╝
    `);
    // Clean up expired tokens every hour
    setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
});