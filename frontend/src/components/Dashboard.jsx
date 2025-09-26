import { useState, useEffect } from 'react';
import { getCurrentUser, logout } from '../api/auth';
import VerificationBanner from './VerificationBanner';

function Dashboard({ user, onLogout }) {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUserInfo();
        // Set up auto-refresh every 30 seconds
        const interval = setInterval(fetchUserInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUserInfo = async () => {
        try {
            const data = await getCurrentUser();
            console.log('Fetched user data:', data); // Debug log
            setUserInfo(data);
            setError('');
        } catch (err) {
            console.error('Error fetching user:', err);
            setError('Failed to load user info');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUserInfo();
    };

    const handleLogout = async () => {
        try {
            await logout();
            onLogout();
        } catch (err) {
            console.error('Logout error:', err);
            onLogout();
        }
    };

    if (loading) {
        return <div className="loading">Loading user data...</div>;
    }

    // Use userInfo for display, not the passed user prop
    const displayUser = userInfo || user;
    const isVerified = displayUser?.email_verified === true || displayUser?.email_verified === 1;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Welcome, {displayUser?.username}! 👋</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleRefresh}
                        className="submit-btn"
                        style={{ background: '#3b82f6' }}
                        disabled={refreshing}
                    >
                        {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">{error}</div>
            )}

            {displayUser && (
                <>
                    {/* Show verification banner if not verified */}
                    {!isVerified && (
                        <div className="verification-banner" style={{ marginBottom: '1.5rem' }}>
                            <div className="banner-content">
                                <div className="banner-icon">⚠️</div>
                                <div className="banner-text">
                                    <strong>Email Verification Required</strong>
                                    <p>Please check your email for the verification link.</p>
                                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#666' }}>
                                        Already verified? Click the refresh button above.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="user-info">
                        <h3>Your Account Information</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>User ID:</label>
                                <span>{displayUser.id}</span>
                            </div>
                            <div className="info-item">
                                <label>Email:</label>
                                <span>{displayUser.email}</span>
                            </div>
                            <div className="info-item">
                                <label>Username:</label>
                                <span>{displayUser.username}</span>
                            </div>
                            <div className="info-item">
                                <label>Email Status:</label>
                                <span className={isVerified ? 'verified' : 'unverified'}>
                                    {isVerified ? '✅ Verified' : '⚠️ Unverified'}
                                </span>
                            </div>
                            {displayUser.verified_at && (
                                <div className="info-item">
                                    <label>Verified At:</label>
                                    <span>{new Date(displayUser.verified_at).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="info-item">
                                <label>Account Created:</label>
                                <span>{new Date(displayUser.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Feature Gating Example */}
                    <div className="features-section">
                        <h3>Available Features</h3>
                        {isVerified ? (
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

                    {/* Debug info - remove in production */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace'
                    }}>
                        <strong>Debug Info:</strong>
                        <pre>{JSON.stringify({
                            email_verified: displayUser.email_verified,
                            type: typeof displayUser.email_verified,
                            isVerified: isVerified
                        }, null, 2)}</pre>
                    </div>
                </>
            )}
        </div>
    );
}

export default Dashboard;