import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getCurrentUserSilent, logout, forceRefreshUser } from '../api/auth';
import VerificationBanner from './VerificationBanner';

function Dashboard({ user, onLogout, onUserUpdate }) {
    const [userInfo, setUserInfo] = useState(user); // Initialize with passed user
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        fetchUserInfo();

        // Set up auto-refresh every 30 seconds
        intervalRef.current = setInterval(() => {
            if (mountedRef.current) {
                fetchUserInfoSilent();
            }
        }, 30000);

        // Cleanup on unmount
        return () => {
            mountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const data = await getCurrentUser();

            if (mountedRef.current) {
                console.log('Fetched user data:', data);
                setUserInfo(data);
                setError('');

                // Update parent component's user state
                if (onUserUpdate) {
                    onUserUpdate(data);
                }
            }
        } catch (err) {
            console.error('Error fetching user:', err);
            if (mountedRef.current) {
                setError('Failed to load user info');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    const fetchUserInfoSilent = async () => {
        try {
            const data = await getCurrentUserSilent();

            if (mountedRef.current) {
                console.log('Silent refresh - user data:', data);
                setUserInfo(data);

                // Update parent component's user state
                if (onUserUpdate) {
                    onUserUpdate(data);
                }
            }
        } catch (err) {
            // Silent refresh failed - don't show error to user
            console.log('Silent refresh failed, will retry on next interval');
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError('');
        await fetchUserInfo();
    };

    const handleLogout = async () => {
        try {
            await logout();
            onLogout();
        } catch (err) {
            console.error('Logout error:', err);
            // Even if logout fails on server, clear local session
            onLogout();
        }
    };

    if (loading) {
        return <div className="loading">Loading user data...</div>;
    }

    // Use userInfo for display
    const displayUser = userInfo;
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
                        <VerificationBanner user={displayUser} />
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
                            <div className="info-item">
                                <label>Last Updated:</label>
                                <span>{new Date().toLocaleTimeString()}</span>
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
                </>
            )}
        </div>
    );
}

export default Dashboard;