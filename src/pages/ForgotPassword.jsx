import React, { useState } from 'react';
import { API_BASE } from '../config';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
      } else {
        alert(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="container animate-fade-up" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Helmet>
        <title>Forgot Password | Tandem</title>
        <meta name="description" content="Reset your Tandem account password. Enter your email to receive a password reset code." />
      </Helmet>
      <div className="card glass" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Reset Password</h2>
        
        {step === 1 ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
              Enter your email and we'll send you a code to reset your password.
            </p>
            <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="btn-outline" style={{ border: 'none' }} onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--success)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <KeyRound size={32} />
              </div>
              <p>We've sent a 6-digit code to <strong>{email}</strong>.</p>
            </div>
            <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}>
              Enter Code <ArrowRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
