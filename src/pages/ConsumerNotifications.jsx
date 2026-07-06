import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Bell, Mail, MessageSquare, Smartphone, Save, AlertCircle, CheckCircle, RefreshCw, ArrowLeft, History, BellPlus, BellOff, SmartphoneCharging } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const CHANNELS = [
  { key: 'email', label: 'Email', icon: Mail, color: '#3b82f6', toggles: [
    { key: 'bookings', label: 'Booking updates & changes' },
    { key: 'promotions', label: 'Promotions & offers' },
    { key: 'chat', label: 'Chat messages' },
  ]},
  { key: 'sms', label: 'SMS (Text)', icon: Smartphone, color: '#8b5cf6', toggles: [
    { key: 'bookings', label: 'Booking confirmations' },
    { key: 'offers', label: 'Promo offers' },
  ]},
  { key: 'push', label: 'Push (In-App)', icon: Bell, color: '#ec4899', toggles: [
    { key: 'bookings', label: 'Booking updates' },
    { key: 'chat', label: 'Chat messages' },
    { key: 'reminders', label: 'Service reminders' },
  ]},
];

export default function ConsumerNotifications() {
  const [prefs, setPrefs] = useState({ email: {}, sms: {}, push: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('prefs');
  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };
  const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notification-preferences`, { headers });
        if (res.ok) setPrefs(await res.json());
      } catch (e) { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = (channel, key) => {
    setPrefs(prev => ({ ...prev, [channel]: { ...prev[channel], [key]: !prev[channel]?.[key] } }));
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/notification-preferences`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Preferences saved!');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><RefreshCw size={32} className="spinner" color="var(--primary)" /></div>;
  }

  return (
    <div className="container" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate('/account')} className="btn-outline" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={18} /> Back to Account
      </button>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setTab('prefs')} className={tab === 'prefs' ? 'btn-primary' : 'btn-outline'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Bell size={16} /> Preferences
        </button>
        <button onClick={() => setTab('push')} className={tab === 'push' ? 'btn-primary' : 'btn-outline'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <SmartphoneCharging size={16} /> Push Setup
        </button>
        <button onClick={() => navigate('/notifications/history')} className="btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <History size={16} /> History
        </button>
      </div>

      {error && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}><AlertCircle size={18} /> {error}</div>}
      {success && <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}><CheckCircle size={18} /> {success}</div>}

      {tab === 'prefs' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2>Notification Preferences</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Choose how we notify you</p>
            </div>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {CHANNELS.map(({ key: channelKey, label, icon: Icon, color, toggles }) => (
            <div key={channelKey} className="card glass animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
                <h4 style={{ margin: 0 }}>{label}</h4>
              </div>
              {toggles.map(({ key: toggleKey, label: toggleLabel }) => (
                <label key={toggleKey} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: prefs[channelKey]?.[toggleKey] ? 'var(--primary-bg)' : 'transparent' }}>
                  <input type="checkbox" checked={!!prefs[channelKey]?.[toggleKey]} onChange={() => toggle(channelKey, toggleKey)} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.9rem' }}>{toggleLabel}</span>
                </label>
              ))}
            </div>
          ))}
        </>
      )}

      {tab === 'push' && (
        <div className="card glass" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ec489920', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {subscribed ? <Bell size={24} color="#ec4899" /> : <BellOff size={24} color="#9ca3af" />}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Push Notifications</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Get instant alerts even when the app is closed
              </p>
            </div>
          </div>

          {!supported ? (
            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: 'var(--radius-md)', color: '#92400e', fontSize: '0.9rem' }}>
              Push notifications are not supported on this browser.
            </div>
          ) : permission === 'denied' ? (
            <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: '0.9rem' }}>
              Notifications are blocked. Update your browser settings to enable them.
            </div>
          ) : subscribed ? (
            <div>
              <div style={{ padding: '1rem', background: '#d1fae5', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', fontSize: '0.9rem' }}>
                <CheckCircle size={18} /> Push notifications are enabled
              </div>
              <button onClick={unsubscribe} className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <BellOff size={16} /> Disable Push Notifications
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Enable push notifications to receive booking updates, chat messages, and reminders instantly.
              </p>
              <button onClick={subscribe} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <BellPlus size={16} /> Enable Push Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
