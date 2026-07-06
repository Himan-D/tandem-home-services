import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { API_BASE } from '../config';
import { Briefcase, ChevronRight, Check, User, Phone, MapPin, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PartnerRegister() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', location: '', lat: '', lng: '', backgroundConsent: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field, val) => setForm({ ...form, [field]: val });

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: 'partner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/me/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          phone: form.phone,
          location: form.location,
          lat: form.lat ? parseFloat(form.lat) : undefined,
          lng: form.lng ? parseFloat(form.lng) : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Onboarding failed'); }
      navigate('/partner');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <Helmet>
        <title>Become a Pro | Tandem</title>
        <meta name="description" content="Join Tandem as a service professional. Grow your business with instant bookings, transparent pricing, and vetted customers." />
        <meta property="og:title" content="Become a Pro | Tandem" />
        <meta property="og:description" content="Join Tandem as a service professional and grow your business." />
      </Helmet>
      <div className="card glass animate-fade-up" style={{ maxWidth: '560px', width: '100%', padding: '2.5rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Briefcase size={32} color="var(--primary)" />
          </div>
          <h2>Become a Tandem Partner</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join our platform and start earning</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step >= i ? 'var(--primary)' : 'var(--border)', color: step >= i ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
            }}>{i}</div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>Create Your Account</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Full Name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
                  <User size={18} color="var(--text-muted)" />
                  <input className="input" style={{ border: 'none', padding: 0, flex: 1 }} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Jane Partner" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Email</label>
                <input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Password</label>
                <input className="input" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" minLength={6} />
              </div>
              <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => { if (!form.name || !form.email || !form.password) { setError('Please fill all fields'); return; } if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; } setStep(2); }}>
                Next <ChevronRight size={18} />
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>Complete Your Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
                  <Phone size={18} color="var(--text-muted)" />
                  <input className="input" style={{ border: 'none', padding: 0, flex: 1 }} type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>City / Location</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
                  <MapPin size={18} color="var(--text-muted)" />
                  <input className="input" style={{ border: 'none', padding: 0, flex: 1 }} value={form.location} onChange={e => update('location', e.target.value)} placeholder="Brooklyn, NY" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Latitude (optional)</label>
                  <input className="input" type="number" step="any" value={form.lat} onChange={e => update('lat', e.target.value)} placeholder="40.6782" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Longitude (optional)</label>
                  <input className="input" type="number" step="any" value={form.lng} onChange={e => update('lng', e.target.value)} placeholder="-73.9442" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <input type="checkbox" id="bg-consent-reg" checked={form.backgroundConsent}
                  onChange={(e) => update('backgroundConsent', e.target.checked)}
                  style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.15rem', cursor: 'pointer' }}
                />
                <label htmlFor="bg-consent-reg" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  I consent to a background check as part of the Tandem partner verification process.
                  I understand that a consumer report may be obtained.
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-outline" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowLeft size={18} /> Back</button>
                <button className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => { if (!form.phone || !form.location) { setError('Phone and location are required'); return; } if (!form.backgroundConsent) { setError('You must consent to the background check'); return; } handleRegister(); }}
                  disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Check size={36} color="var(--success)" />
              </div>
              <h3>Account Created!</h3>
              <p style={{ color: 'var(--text-muted)' }}>Complete onboarding to start receiving jobs.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={20} color="var(--success)" />
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>Account registered</strong> as <strong>{form.name}</strong> ({form.email})
                </div>
              </div>
              {!form.phone && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Phone Number</label>
                  <input className="input" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
              )}
              {!form.location && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Location</label>
                  <input className="input" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Brooklyn, NY" />
                </div>
              )}
              <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                onClick={handleOnboard} disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
