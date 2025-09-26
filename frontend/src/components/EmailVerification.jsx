import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { refreshToken } from '../api/auth'; // Add this import

function EmailVerification() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            verifyEmail();
        } else {
            setStatus('error');
            setMessage('No verification token provided');
        }
    }, [token]);

    const verifyEmail = async () => {
        try {
            const response = await axios.post(
                'http://localhost:3001/auth/verify-email',
                { token }
            );

            setStatus('success');
            setMessage(response.data.message);

            // Try to refresh the user session if they're logged in
            try {
                await refreshToken();
            } catch (err) {
                // User might not be logged in, that's okay
                console.log('Could not refresh session');
            }

            // Redirect to home after 3 seconds
            setTimeout(() => {
                // Force a page reload to refresh user state
                window.location.href = '/';
            }, 3000);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.error || 'Verification failed');
        }
    };

    return (
        <div className="verification-container">
            <div className="verification-card">
                {status === 'verifying' && (
                    <>
                        <div className="spinner"></div>
                        <h2>Verifying your email...</h2>
                        <p>Please wait while we verify your email address.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="success-icon">✅</div>
                        <h2>Email Verified!</h2>
                        <p>{message}</p>
                        <p className="redirect-message">
                            Redirecting in 3 seconds...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="error-icon">❌</div>
                        <h2>Verification Failed</h2>
                        <p>{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="submit-btn"
                        >
                            Go to Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default EmailVerification;