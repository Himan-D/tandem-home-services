import React from 'react';
import { API_BASE } from '../config';
import { Shield, Sparkles, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TandemPlus() {
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/api/plus/subscribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    alert('Welcome to Tandem Plus! You now have priority support and free cancellations.');
    navigate('/dashboard');
  };

  return (
    <div className="container" style={{ padding: '4rem 0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass animate-fade-up" style={{ maxWidth: '800px', width: '100%', padding: '4rem 2rem', textAlign: 'center', border: '2px solid var(--primary)' }}>
        <div style={{ background: 'var(--primary-bg)', color: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <Sparkles size={40} />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>Tandem <span style={{ color: 'var(--primary)' }}>Plus</span></h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
          Elevate your home services experience with exclusive benefits, priority support, and ultimate peace of mind.
        </p>

        <div className="grid-3" style={{ textAlign: 'left', marginBottom: '3rem', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Zap color="var(--warning)" size={32} />
            <h3 style={{ fontSize: '1.25rem' }}>Priority Matching</h3>
            <p style={{ color: 'var(--text-muted)' }}>Jump the queue. Get matched with top-tier professionals instantly, even during peak hours.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Star color="var(--primary)" size={32} />
            <h3 style={{ fontSize: '1.25rem' }}>Top 10% Pros</h3>
            <p style={{ color: 'var(--text-muted)' }}>Exclusive access to our highest-rated professionals with 4.9+ stars and 100+ jobs completed.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Shield color="var(--success)" size={32} />
            <h3 style={{ fontSize: '1.25rem' }}>Free Cancellations</h3>
            <p style={{ color: 'var(--text-muted)' }}>Plans change. Cancel or reschedule any booking up to 2 hours before the start time for free.</p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-body)', padding: '2rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>$9.99<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/month</span></div>
            <div style={{ color: 'var(--success)', fontWeight: 600 }}>Cancel anytime</div>
          </div>
          <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }} onClick={handleSubscribe}>
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}
