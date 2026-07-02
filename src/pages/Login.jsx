import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      // Decode role and redirect
      const storedToken = localStorage.getItem('token');
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      
      if (payload.role === 'admin') navigate('/admin');
      else if (payload.role === 'partner') navigate('/partner');
      else if (payload.role === 'consumer') {
        const from = location.state?.from;
        if (from) {
          navigate(from.pathname, { state: from.state, replace: true });
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/');
      }
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card glass animate-fade-up" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>Login to your Tandem account</p>
        
        {error && <div style={{ background: 'rgba(255,0,0,0.1)', color: 'red', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
              required 
            />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 500 }}>Password</label>
              <span style={{ fontSize: '0.875rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/forgot-password')}>Forgot Password?</span>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', marginBottom: '1rem' }}>Sign In</button>
          
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '1rem' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />
            <span style={{ background: 'var(--bg-main)', padding: '0 10px', position: 'relative', top: '-10px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>or</span>
          </div>

          <button type="button" className="btn-outline" style={{ width: '100%', padding: '1rem' }} onClick={() => navigate('/magic-link')}>
            Login with Magic Link
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/signup')}>Sign Up</span>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <p><strong>Demo Accounts:</strong></p>
          <p>Admin: admin@tandem.com / password123</p>
          <p>Partner: pro@tandem.com / password123</p>
          <p>Consumer: user@tandem.com / password123</p>
        </div>
      </div>
    </div>
  );
}
