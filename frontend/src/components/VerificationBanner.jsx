import { useState } from 'react';
import axios from 'axios';
function VerificationBanner({ user, onResend }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [cooldown, setCooldown] = useState(false);
    const handleResend = async () => {
        if (cooldown) return;
        setLoading(true);
        setMessage('');
        try {
            const response = await axios.post(
                'http://localhost:3001/auth/resend-verification',
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                }
            );
            setMessage('Verification email sent! Check your inbox.');
            // Set cooldown for 60 seconds
            setCooldown(true);
            setTimeout(() => setCooldown(false), 60000);
            // For demo, show the URL
            if (response.data.demo_url) {
                console.log('Demo verification URL:', response.data.demo_url);
                setMessage(`Demo: ${response.data.demo_url}`);
            }
        } catch (error) {
            if (error.response?.status === 429) {
                setMessage('Too many requests. Try again in 1 hour.');
            } else {
                setMessage('Failed to send verification email.');
            }
        } finally {
            setLoading(false);
        }
    };
    if (user?.email_verified) {
        return null; // Don't show banner if verified
    }
    return (
        <div className="verification-banner">
            <div className="banner-content">
                <div className="banner-icon">⚠️</div>
                <div className="banner-text">
                    <strong>Email Verification Required</strong>
                    <p>Please verify your email to access all features.</p>
                    {message && <p className="banner-message">{message}</p>}
                </div>
                <button
                    onClick={handleResend}
                    disabled={loading || cooldown}
                    className="resend-button"
                >
                    {loading ? 'Sending...' :
                        cooldown ? 'Wait 60s' :
                            'Resend Email'}
                </button>
            </div>
        </div>
    );
}
export default VerificationBanner;