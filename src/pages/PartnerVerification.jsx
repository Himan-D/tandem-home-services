import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ShieldCheck, ShieldX, Clock, AlertTriangle, Loader, ChevronLeft, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  not_started: { icon: ShieldX, color: '#6b7280', bg: '#f3f4f6', label: 'Not Started', description: 'You haven\'t consented to a background check yet.' },
  pending: { icon: Clock, color: '#f59e0b', bg: '#fffbeb', label: 'Pending Review', description: 'Your consent has been received. An admin will review it shortly.' },
  in_progress: { icon: Loader, color: '#3b82f6', bg: '#eff6ff', label: 'Check In Progress', description: 'Your background check is being processed. This usually takes a few minutes.' },
  clear: { icon: ShieldCheck, color: '#10b981', bg: '#ecfdf5', label: 'Verified', description: 'Your background check has been cleared. You\'re fully verified on Tandem!' },
  disputed: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Needs Review', description: 'Your background check flagged some items. An admin will contact you.' },
  suspended: { icon: ShieldX, color: '#ef4444', bg: '#fef2f2', label: 'Suspended', description: 'Your account has been temporarily suspended pending review.' },
  failed: { icon: ShieldX, color: '#ef4444', bg: '#fef2f2', label: 'Failed', description: 'Your background check was not cleared. Please contact support.' },
};

export default function PartnerVerification() {
  const [checkStatus, setCheckStatus] = useState('not_started');
  const [checkData, setCheckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/background-checks/my-status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCheckStatus(data.status);
        setCheckData(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConsent = async () => {
    if (!consentChecked) { setError('Please agree to the background check consent'); return; }
    setConsenting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/background-checks/consent`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setCheckStatus('pending');
        setSuccess('Consent submitted successfully! An admin will review your request.');
        setConsentChecked(false);
      } else {
        setError(data.error || 'Failed to submit consent');
      }
    } catch {
      setError('Server error');
    }
    setConsenting(false);
  };

  const cfg = STATUS_CONFIG[checkStatus] || STATUS_CONFIG.not_started;
  const Icon = cfg.icon;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Partner
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/partner')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
          <button onClick={() => navigate('/partner/calendar')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> My Schedule</button>
          <button onClick={() => navigate('/partner/earnings')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Earnings</button>
          <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><MapPin size={20} /> My Services</button>
          <button onClick={() => navigate('/partner/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/partner/shifts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> Shift Schedule</button>
          <button onClick={() => navigate('/partner/notifications')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Bell size={20} /> Notifications</button>
          <button onClick={() => navigate('/partner/profile')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
          <button onClick={() => navigate('/partner/disputes')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><AlertCircle size={20} /> Disputes</button>
        </nav>
      </aside>

      <main className="main-content">
        <button className="btn-outline" onClick={() => navigate('/partner')} style={{ marginBottom: '1.5rem' }}>
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <ShieldCheck size={28} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Background Verification</h2>
        </div>

        {error && <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {success && <div style={{ padding: '0.75rem', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: '#10b981' }}>{success}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            <div className="card glass" style={{ padding: '2rem' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
              }}>
                <Icon size={40} color={cfg.color} />
              </div>
              <h3 style={{ color: cfg.color, marginBottom: '0.5rem' }}>{cfg.label}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{cfg.description}</p>

              {checkData?.consentAt && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Consent given: {formatDate(checkData.consentAt)}
                </div>
              )}
              {checkData?.completedAt && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Completed: {formatDate(checkData.completedAt)}
                </div>
              )}
              {checkData?.expiresAt && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Valid until: {formatDate(checkData.expiresAt)}
                </div>
              )}

              {checkStatus === 'not_started' && (
                <div style={{ marginTop: '2rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    To become a fully verified Tandem partner, we need to run a background check.
                    This helps us maintain a safe and trusted marketplace for everyone.
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    The check is processed securely through our third-party provider. Your information
                    is handled in accordance with our privacy policy.
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem',
                    background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
                  }}>
                    <input type="checkbox" id="bg-consent" checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.15rem', cursor: 'pointer' }}
                    />
                    <label htmlFor="bg-consent" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      I consent to a background check as part of the Tandem partner verification process.
                      I understand that a consumer report may be obtained and I authorize Tandem and its
                      third-party provider to conduct this check.
                    </label>
                  </div>
                  <button className="btn-primary" onClick={handleConsent} disabled={consenting || !consentChecked}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    {consenting ? 'Submitting...' : 'Agree & Submit'}
                  </button>
                </div>
              )}
            </div>

            <div className="card glass" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Why Verification Matters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: ShieldCheck, color: 'var(--success)', title: 'Trust & Safety', desc: 'Verified partners build trust with customers and the platform.' },
                  { icon: CheckCircle, color: 'var(--primary)', title: 'Priority Matching', desc: 'Verified partners may receive priority in our ML matching engine.' },
                  { icon: Clock, color: '#f59e0b', title: 'Annual Renewal', desc: 'Background checks are valid for 1 year and must be renewed.' },
                ].map((item) => (
                  <div key={item.title} style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <item.icon size={24} color={item.color} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
