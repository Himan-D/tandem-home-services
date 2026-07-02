import React, { useState } from 'react';
import { API_BASE } from '../config';
import { useNavigate } from 'react-router-dom';
import { Home, Zap, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const { refreshUser, token } = useAuth();
  const navigate = useNavigate();

  const handleNext = async () => {
    setError('');
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!phone.trim() || !location.trim()) {
        setError('Please fill in both Phone Number and Primary City/Location.');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/me/onboard`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ phone, location })
        });
        if (res.ok) {
          await refreshUser();
          navigate('/');
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to complete onboarding. Please try again.');
        }
      } catch (err) {
        setError('Failed to connect to the server. Please try again.');
      }
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card glass animate-fade-up" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center' }}>
        
        {error && (
          <div style={{ background: 'rgba(255,0,0,0.1)', color: 'red', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <div style={{ margin: '0 auto 2rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Home size={40} />
            </div>
            <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Welcome to Tandem!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '2rem' }}>
              Your one-stop destination for trusted, professional home services. Let's get your profile set up so you can book your first service.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <div style={{ margin: '0 auto 2rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Zap size={40} />
            </div>
            <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Instant Matching</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '2rem' }}>
              We instantly match your booking requests with top-rated professionals in your exact locality. No waiting for quotes.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <div style={{ margin: '0 auto 2rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <ShieldCheck size={40} />
            </div>
            <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Complete Profile & Claim Bonus</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '2rem' }}>
              Every job is insured up to $10,000. Enter your contact details to complete onboarding and get a $100 wallet credit!
            </p>
            
            <div style={{ textAlign: 'left', marginTop: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="+1 (555) 000-0000"
                  required 
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Primary City/Location</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g. San Francisco, CA"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: '8px', height: '8px', borderRadius: '50%', background: s === step ? 'var(--primary)' : 'var(--border)', transition: 'all 0.3s' }}></div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {step === 3 ? "Let's Go!" : "Next"} <ChevronRight size={18} />
          </button>
        </div>
        
      </div>
    </div>
  );
}
