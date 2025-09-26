import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login?verified=true');
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
                            Redirecting to login in 3 seconds...
                        </p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="error-icon">❌</div>
                        <h2>Verification Failed</h2>
                        <p>{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary"
                        >
                            Go to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
export default EmailVerification;