import { useState, useEffect } from 'react';
import { getCurrentUser, logout } from '../api/auth';
function Dashboard({ user, onLogout }) {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchUserInfo();
    }, []);
    const fetchUserInfo = async () => {
        try {
            const data = await getCurrentUser();
            setUserInfo(data);
        } catch (err) {
            setError('Failed to load user info');
        } finally {
            setLoading(false);
        }
    };
    const handleLogout = async () => {
        try {
            await logout();
            onLogout();
        } catch (err) {
            console.error('Logout error:', err);
            // Even if logout fails, clear local state
            onLogout();
        }
    };
    if (loading) {
        return <div className="loading">Loading user data...</div>;
    }
    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Welcome, {user?.username}! 👋</h2>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
            {error && (
                <div className="error-message">{error}</div>
            )}
            {userInfo && (
                <div className="user-info">
                    <h3>Your Account Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>User ID:</label>
                            <span>{userInfo.id}</span>
                        </div>
                        <div className="info-item">
                            <label>Email:</label>
                            <span>{userInfo.email}</span>
                        </div>
                        <div className="info-item">
                            <label>Username:</label>
                            <span>{userInfo.username}</span>
                        </div>
                        <div className="info-item">
                            <label>Account Created:</label>
                            <span>{new Date(userInfo.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="token-info">
                <h3>🔐 Authentication Status</h3>
                <p className="success">✅ Access Token: Active (15 min expiry)</p>
                <p className="success">✅ Refresh Token: Stored in httpOnly cookie (7 days)</p>
                <p className="info">Tokens auto-refresh when expired</p>
            </div>
            <div className="protected-content">
                <h3>Protected Content</h3>
                <p>This content is only visible to authenticated users.</p>
                <p>Your JWT tokens are handling the authentication!</p>
            </div>
        </div>
    );
}
export default Dashboard;