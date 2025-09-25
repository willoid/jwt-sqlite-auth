import { useState } from 'react';
import { login } from '../api/auth';
function Login({ onSuccess }) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
            const response = await login(formData.email, formData.password);
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
                <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                >
                    {loading ? 'Logging in...' : 'Login'}
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