import { useState } from 'react';
import { login } from '../api/auth';
import ForgotPassword from './ForgotPassword';




function Login({ onSuccess }) {
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    if (showForgotPassword) {
        return (
            <ForgotPassword
                onBack={() => setShowForgotPassword(false)}
            />
        );
    }
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login(formData.email, formData.password, formData.rememberMe);
            console.log('Login successful:', response);
            onSuccess(response.user);
        } catch (err) {
            setError(err.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="auth-form">
            <h2>Login</h2>
            {error && (
                <div className="error-message">{error}</div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your@email.com"
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Your password"
                    />
                </div>
                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{width:"auto"}}
                    />
                    <label htmlFor="rememberMe" style={{marginBottom:0, cursor:"pointer"}}>Remember Me for 30 days</label>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    style={{
                        width: '100%',
                        marginTop: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.5rem',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                    Forgot your password?
                </button>
            </form>
            <div className="demo-credentials">
                <p>Demo Account:</p>
                <code>Email: demo@test.com</code>
                <code>Password: demo123</code>
            </div>
        </div>
    );
}
export default Login;