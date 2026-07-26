import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="np-page">
        <div className="np-loading">
          <div className="np-loading__spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="np-page np-login">
      <div className="np-login__card">
        <h2>Admin Login</h2>
        <p className="np-muted">Sign in to manage uploaded voter data.</p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <label className="np-field">
            <span><Mail size={15} /> Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="a@gmail.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </label>

          <label className="np-field">
            <span><Lock size={15} /> Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="np-alert np-alert--error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="np-btn np-btn--red np-btn--block" 
            disabled={loading}
          >
            <Lock size={16} /> 
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;