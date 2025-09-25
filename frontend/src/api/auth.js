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
        await axios.post(`${API_URL}/auth/logout`);
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
 * Setup axios interceptor to refresh token on 401
 */
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // CRITICAL FIX: Don't retry if this is already a refresh request
        if (originalRequest.url && originalRequest.url.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        // If 401 and haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await refreshToken();
                // Retry original request with new token
                return axios(originalRequest);
            } catch (refreshError) {
                // Refresh failed, redirect to login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
export {accessToken};