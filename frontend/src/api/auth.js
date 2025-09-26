/**
 * API service for authentication
 * Handles all auth-related API calls
 */
import axios from 'axios';

// Configure axios defaults
axios.defaults.withCredentials = true; // Send cookies with requests

const API_URL = 'http://localhost:3001';

// Store access token in memory (not localStorage for security)
let accessToken = null;

// Add a flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh
 */
function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

/**
 * Notify all subscribers when token is refreshed
 */
function onTokenRefreshed(token) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
}

/**
 * Set authorization header for all requests
 */
function setAuthHeader(token) {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        accessToken = token;
    } else {
        delete axios.defaults.headers.common['Authorization'];
        accessToken = null;
    }
}

/**
 * Register new user
 */
export async function register(email, username, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, {
            email,
            username,
            password
        });
        // Set access token for future requests
        setAuthHeader(response.data.accessToken);
        return response.data;
    } catch (error) {
        throw error.response?.data || {error: 'Registration failed'};
    }
}

/**
 * Login user
 */
export async function login(email, password, rememberMe = false) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password,
            rememberMe
        }, {
            withCredentials: true // Ensure cookies are sent
        });
        // Set access token
        setAuthHeader(response.data.accessToken);
        return response.data;
    } catch (error) {
        throw error.response?.data || {error: 'Login failed'};
    }
}

/**
 * Refresh access token
 */
export async function refreshToken() {
    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
            withCredentials: true // Ensure cookies are sent
        });
        // Update access token
        setAuthHeader(response.data.accessToken);
        return response.data;
    } catch (error) {
        // If refresh fails, clear auth
        setAuthHeader(null);
        throw error.response?.data || {error: 'Token refresh failed'};
    }
}

/**
 * Logout user
 */
export async function logout() {
    try {
        await axios.post(`${API_URL}/auth/logout`, {}, {
            withCredentials: true
        });
        // Clear access token
        setAuthHeader(null);
        return {message: 'Logout successful'};
    } catch (error) {
        // Clear auth even if logout fails
        setAuthHeader(null);
        throw error.response?.data || {error: 'Logout failed'};
    }
}

/**
 * Get current user info
 */
export async function getCurrentUser() {
    try {
        const response = await axios.get(`${API_URL}/auth/me`);
        return response.data;
    } catch (error) {
        throw error.response?.data || {error: 'Failed to get user info'};
    }
}

/**
 * Setup axios interceptor to refresh token on 401 or 403
 * This handles token expiration gracefully
 */
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't retry refresh requests or if we've already retried
        if (originalRequest.url?.includes('/auth/refresh') || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If 401 or 403 error (unauthorized/forbidden - token expired)
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Check if the error message indicates token issue
            const errorMessage = error.response?.data?.error?.toLowerCase() || '';
            const isTokenError = errorMessage.includes('token') ||
                errorMessage.includes('expired') ||
                errorMessage.includes('invalid');

            if (!isTokenError) {
                // Not a token error, don't try to refresh
                return Promise.reject(error);
            }

            // If we're already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh((token) => {
                        // Retry original request with new token
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        resolve(axios(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await refreshToken();
                const newToken = response.accessToken;

                // Notify all queued requests about the new token
                onTokenRefreshed(newToken);

                // Retry original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                isRefreshing = false;
                return axios(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;

                // Only redirect to login if it's not a background refresh
                if (!originalRequest.silent) {
                    // Clear local auth state
                    setAuthHeader(null);
                    // Refresh failed, redirect to login
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Get current user with silent option
 */
export async function getCurrentUserSilent() {
    try {
        const response = await axios.get(`${API_URL}/auth/me`, {
            silent: true // Mark as silent request
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || {error: 'Failed to get user info'};
    }
}

/**
 * Force refresh user data
 */
export async function forceRefreshUser() {
    try {
        // Get fresh token first
        await refreshToken();

        // Then get fresh user data
        const userResponse = await getCurrentUser();

        return userResponse;
    } catch (error) {
        throw error;
    }
}

export {accessToken};