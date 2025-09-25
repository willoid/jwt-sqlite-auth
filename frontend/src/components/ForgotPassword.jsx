import {useState} from 'react';
import axios from 'axios';

/**
 * Password Reset Component
 * Implements two-step verification flow:
 * Step 1: User enters email to receive code
 * Step 2: User enters code and new password
 *
 * UX Patterns:
 * - Clear error messages
 * - Loading states during API calls
 * - Auto-redirect after success
 * - Demo mode shows code for testing
 */function ForgotPassword({onBack}) {
// Component state management
    const [step, setStep] = useState(1);
// 1: email, 2: code & password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [demoCode, setDemoCode] = useState('');
    // Store code for demo display
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    /**
     * Step 1: Request reset code
     * Sends email to backend and receives code (demo only)
     */const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/auth/forgot-password',
                {email}
            );

// Store code for demo display
            if (response.data.code) {
                setDemoCode(response.data.code);
                setMessage(`Demo Mode: Your reset code is ${response.data.code}`);
            }

// Move to step 2
// set Step(2);

        } catch (error) {
            if (error.response?.status === 429) {
                setError('Too many attempts. Please wait 5 minutes.');
            } else {
                setError(error.response?.data?.error || 'Failed to request reset code');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: Reset password with code
     * Verifies code and updates password
     */const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

// Client-side validation
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/auth/reset-password',
                {
                    email,
                    code,
                    newPassword
                }
            );

// Success! Show message and redirect
            setMessage('Password reset successful! Redirecting to login...');
            setError('');

// Auto-redirect after 2 seconds
            setTimeout(() => {
                onBack();
            }, 2000);

        } catch (error) {
            setError(error.response?.data?.error || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-form">
            <h2>🔐 Password Reset</h2>

            {/* Status Messages */}
            {message && (
                <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    color: '#10b981'
                }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444'
                }}>
                    {error}
                </div>
            )}

            {/* Step 1: Email Form */}
            {step === 1 ? (
                <form onSubmit={handleRequestCode}>
                    <p style={{
                        color: '#94a3b8',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        Enter your email address and we'll send you a reset code.
                    </p>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading ? '⏳ Sending...' : 'Send Reset Code'}
                    </button>
                </form>
            ) : (
                /* Step 2: Code and New Password Form */
                <form onSubmit={handleResetPassword}>
                    {demoCode && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1rem',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid #3b82f6',
                            textAlign: 'center'
                        }}>
                            <strong>Demo Mode</strong><br/>
                            Your code: <code style={{
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}>{demoCode}</code><br/>
                            <small>Expires in 15 minutes</small>
                        </div>
                    )}

                    <div className="form-group">
                        <label>6-Digit Reset Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            maxLength="6"
                            pattern="\d{6}"
                            required
                            autoFocus
                            style={{
                                letterSpacing: '0.3em',
                                fontSize: '1.2rem',
                                textAlign: 'center'
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading ? '⏳ Resetting...' : '🔓 Reset Password'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStep(1);
                            setCode('');
                            setError('');
                            setMessage('');
                        }}
                        style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            background: 'transparent',
                            border: '1px solid #475569',
                            color: '#94a3b8',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        ← Use Different Email
                    </button>
                </form>
            )}

            {/* Back to Login Link */}
            <button
                onClick={onBack}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    cursor: 'pointer',
                    marginTop: '1.5rem',
                    fontSize: '0.9rem',
                    textDecoration: 'underline'
                }}
            >
                ← Back to Login
            </button>
        </div>
    );
}

export default ForgotPassword;
