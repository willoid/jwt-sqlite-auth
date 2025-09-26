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
                            <label>Email Status:</label>
                            <span className={userInfo.email_verified ? 'verified' : 'unverified'}>
                                {userInfo.email_verified ? '✅ Verified' : '⚠️ Unverified'}
                            </span>
                        </div>
                        {userInfo.verified_at && (
                            <div className="info-item">
                                <label>Verified At:</label>
                                <span>{new Date(userInfo.verified_at).toLocaleDateString()}</span>
                            </div>
                        )}
                        <div className="info-item">
                            <label>Account Created:</label>
                            <span>{new Date(userInfo.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Feature Gating Example */}
            <div className="features-section">
                <h3>Available Features</h3>
                {userInfo?.email_verified ? (
                    <div className="feature-grid">
                        <div className="feature-card available">
                            <h4>✅ Create Projects</h4>
                            <p>Full access granted</p>
                        </div>
                        <div className="feature-card available">
                            <h4>✅ Team Collaboration</h4>
                            <p>Invite team members</p>
                        </div>
                        <div className="feature-card available">
                            <h4>✅ API Access</h4>
                            <p>Generate API keys</p>
                        </div>
                    </div>
                ) : (
                    <div className="feature-grid">
                        <div className="feature-card locked">
                            <h4>🔒 Create Projects</h4>
                            <p>Requires email verification</p>
                        </div>
                        <div className="feature-card locked">
                            <h4>🔒 Team Collaboration</h4>
                            <p>Requires email verification</p>
                        </div>
                        <div className="feature-card locked">
                            <h4>🔒 API Access</h4>
                            <p>Requires email verification</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default Dashboard;