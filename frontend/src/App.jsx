import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmailVerification from './components/EmailVerification';
import { refreshToken } from './api/auth';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await refreshToken();
            setUser(response.user);
        } catch (err) {
            console.log('No valid session');
        } finally {
            setLoading(false);
        }
    };

    const handleAuthSuccess = (userData) => {
        setUser(userData);
    };

    const handleUserUpdate = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
        setAuthMode('login');
    };

    if (loading) {
        return (
            <div className="app-loading">
                <h2>Loading...</h2>
                <p>Checking authentication status</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/*" element={
                <div className="app">
                    <header className="app-header">
                        <h1>🔐 JWT + SQLite Auth System</h1>
                        <p>Production-Ready Authentication</p>
                    </header>
                    <main className="app-main">
                        {user ? (
                            <Dashboard
                                user={user}
                                onLogout={handleLogout}
                                onUserUpdate={handleUserUpdate}
                            />
                        ) : (
                            <div className="auth-container">
                                <div className="auth-tabs">
                                    <button
                                        className={authMode === 'login' ? 'active' : ''}
                                        onClick={() => setAuthMode('login')}
                                    >
                                        Login
                                    </button>
                                    <button
                                        className={authMode === 'register' ? 'active' : ''}
                                        onClick={() => setAuthMode('register')}
                                    >
                                        Register
                                    </button>
                                </div>
                                {authMode === 'login' ? (
                                    <Login onSuccess={handleAuthSuccess} />
                                ) : (
                                    <Register onSuccess={handleAuthSuccess} />
                                )}
                            </div>
                        )}
                    </main>
                    <footer className="app-footer">
                        <div className="tech-stack">
                            <h4>Tech Stack:</h4>
                            <span>SQLite</span>
                            <span>JWT</span>
                            <span>Bcrypt</span>
                            <span>Express</span>
                            <span>React</span>
                        </div>
                    </footer>
                </div>
            } />
        </Routes>
    );
}

export default App;