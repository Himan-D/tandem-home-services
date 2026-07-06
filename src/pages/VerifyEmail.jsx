import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { CheckCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/verification/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) { setStatus('success'); setMessage('Email verified!'); }
        else { setStatus('error'); setMessage(data.error || 'Verification failed'); }
      } catch { setStatus('error'); setMessage('Network error'); }
    })();
  }, [token]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem' }}>
      <div className="card glass" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        {status === 'verifying' && (
          <><RefreshCw size={48} className="spinner" color="var(--primary)" style={{ marginBottom: '1rem' }} /><h2>Verifying your email...</h2></>
        )}
        {status === 'success' && (
          <><CheckCircle size={48} color="#05ac5f" style={{ marginBottom: '1rem' }} /><h2 style={{ color: '#05ac5f' }}>{message}</h2><p style={{ color: 'var(--text-muted)' }}>Your account is now fully verified.</p><button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>Go to Dashboard</button></>
        )}
        {status === 'error' && (
          <><AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} /><h2 style={{ color: 'var(--danger)' }}>Verification failed</h2><p style={{ color: 'var(--text-muted)' }}>{message}</p><button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>Go Home</button></>
        )}
        {status === 'idle' && (
          <><Mail size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} /><h2>Check your email</h2><p style={{ color: 'var(--text-muted)' }}>Click the link in the verification email we sent you.</p></>
        )}
      </div>
    </div>
  );
}
