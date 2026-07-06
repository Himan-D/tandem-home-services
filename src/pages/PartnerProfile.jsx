import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { User, Phone, MapPin, Save, ArrowLeft, AlertCircle, Check, Briefcase, Calendar, DollarSign, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PartnerProfile() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', location: '', lat: '', lng: '' });
  const [services, setServices] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, servicesRes] = await Promise.all([
          fetch(`${API_BASE}/api/me`, { headers }),
          fetch(`${API_BASE}/api/services`),
        ]);
        const me = await meRes.json();
        const svc = await servicesRes.json();
        setProfile({
          name: me.name || '',
          email: me.email || '',
          phone: me.phone || '',
          location: me.location || '',
          lat: me.lat ? String(me.lat) : '',
          lng: me.lng ? String(me.lng) : '',
        });
        setAllServices(svc);
        setMyServices(typeof me.servicesOffered === 'string' ? JSON.parse(me.servicesOffered || '[]') : (me.servicesOffered || []));
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = { phone: profile.phone, location: profile.location };
      if (profile.lat) body.lat = parseFloat(profile.lat);
      if (profile.lng) body.lng = parseFloat(profile.lng);

      const res = await fetch(`${API_BASE}/api/me/onboard`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }

      await fetch(`${API_BASE}/api/partner/services`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: myServices }),
      });

      setSuccess('Profile updated successfully');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (id) => {
    setMyServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

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
          <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> My Services</button>
          <button onClick={() => navigate('/partner/profile')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Partner Profile</h2>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <Check size={18} /> {success}
          </div>
        )}

        <div className="grid-2" style={{ gap: '2rem' }}>
          <div className="card glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20} /> Personal Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Name</label>
                <input className="input" value={profile.name} disabled style={{ opacity: 0.7 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Email</label>
                <input className="input" value={profile.email} disabled style={{ opacity: 0.7 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}><Phone size={14} /> Phone</label>
                <input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}><MapPin size={14} /> Location</label>
                <input className="input" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} placeholder="Brooklyn, NY" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Latitude</label>
                  <input className="input" type="number" step="any" value={profile.lat} onChange={e => setProfile({ ...profile, lat: e.target.value })} placeholder="40.6782" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Longitude</label>
                  <input className="input" type="number" step="any" value={profile.lng} onChange={e => setProfile({ ...profile, lng: e.target.value })} placeholder="-73.9442" />
                </div>
              </div>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20} /> My Services</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Select the services you offer. The ML matching engine will dispatch matching jobs.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {allServices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No services available.</p>
              ) : (
                allServices.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: myServices.includes(s.id) ? 'var(--primary-bg)' : 'transparent' }}>
                    <input type="checkbox" checked={myServices.includes(s.id)} onChange={() => toggleService(s.id)} style={{ width: '18px', height: '18px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${s.basePrice} · {s.category}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
