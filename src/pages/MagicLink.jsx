import React, { useState } from 'react';
import { API_BASE } from '../config';
import { useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MagicLink() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
      } else {
        alert(data.error || 'Failed to send magic link');
      }
    } catch (err) {
      alert('Network error');
    }
    setLoading(false);
  };

  const handleVerifyMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });
      const data = await res.json();
      if (data.token) {
        loginWithToken(data.token);
        navigate('/');
      } else {
        alert(data.error || 'Invalid code');
      }
    } catch (err) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="container animate-fade-up" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <div style={{ background: 'var(--primary-bg)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Sparkles size={32} />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Magic Link</h2>
        
        {step === 1 ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
              We'll send a magic login code to your email. No password needed.
            </p>
            <form onSubmit={handleRequestMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="Email address" 
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-body)' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="btn-outline" style={{ border: 'none' }} onClick={() => navigate('/login')}>Back to Password Login</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <form onSubmit={handleVerifyMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <KeyRound size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="6-digit Code" 
                  required
                  maxLength={6}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-body)', letterSpacing: '0.2rem', fontWeight: 'bold' }}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {loading ? 'Verifying...' : 'Log in'} <ArrowRight size={20} />
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="btn-outline" style={{ border: 'none' }} onClick={() => setStep(1)}>Use a different email</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
