import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, Home, Briefcase, Star, Trash2 } from 'lucide-react';

const LABEL_ICONS = { Home, Work: Briefcase, Other: MapPin };

export default function AddressPicker({ onSelect, selectedId }) {
  const { token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/addresses`, { headers });
        if (res.ok) setAddresses(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const addAddress = async () => {
    if (!label || !address) return;
    try {
      const res = await fetch(`${API_BASE}/api/addresses`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, address, lat: null, lng: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(p => [...p, { id: data.id, label, address, lat: null, lng: null, is_default: false }]);
        setShowForm(false); setAddress('');
      }
    } catch {}
  };

  const delAddress = async (id) => {
    try {
      await fetch(`${API_BASE}/api/addresses/${id}`, { method: 'DELETE', headers });
      setAddresses(p => p.filter(a => a.id !== id));
    } catch {}
  };

  if (loading) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Saved Addresses</label>
        <button onClick={() => setShowForm(!showForm)} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add New'}
        </button>
      </div>

      {showForm && (
        <div className="card glass" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {['Home', 'Work', 'Other'].map(l => (
              <button key={l} onClick={() => setLabel(l)} className={label === l ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>{l}</button>
            ))}
          </div>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your address" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <button onClick={addAddress} className="btn-primary" disabled={!address} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>Save Address</button>
        </div>
      )}

      {addresses.length === 0 && !showForm && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No saved addresses yet</p>
      )}

      {addresses.map(a => {
        const Icon = LABEL_ICONS[a.label] || MapPin;
        return (
          <div key={a.id} onClick={() => onSelect?.(a)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', cursor: 'pointer',
            borderRadius: 'var(--radius-sm)', marginBottom: '0.4rem',
            background: selectedId === a.id ? 'var(--primary-bg)' : 'var(--card-bg)',
            border: selectedId === a.id ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {a.label} {a.is_default && <Star size={12} color="var(--primary)" />}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.address}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); delAddress(a.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
