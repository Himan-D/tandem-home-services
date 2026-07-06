import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Tag, Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Users, Briefcase, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', discountPercent: '', maxUses: '', expiresAt: '' });
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/promos`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPromos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', discountPercent: '', maxUses: '', expiresAt: '' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      code: p.code,
      discountPercent: String(p.discountPercent),
      maxUses: String(p.maxUses),
      expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = editing ? `${API_BASE}/api/promos/${editing}` : `${API_BASE}/api/promos`;
      const method = editing ? 'PUT' : 'POST';
      const body = {
        code: form.code,
        discountPercent: parseInt(form.discountPercent),
        maxUses: parseInt(form.maxUses),
      };
      if (form.expiresAt) body.expiresAt = form.expiresAt;
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      setShowForm(false);
      setEditing(null);
      fetchPromos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/promos/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
      fetchPromos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const isExpired = (promo) => promo.expiresAt && new Date(promo.expiresAt) < new Date();
  const isRedeemed = (promo) => promo.usedCount >= promo.maxUses;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Tag size={20} /> Promo Codes</button>
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Promo Codes</h2>
          <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={18} /> New Promo</button>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {showForm && (
          <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Promo' : 'Create Promo'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Code</label>
                  <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required minLength={3} maxLength={30} placeholder="SAVE20" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Discount %</label>
                  <input className="input" type="number" min="1" max="100" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Max Uses</label>
                  <input className="input" type="number" min="1" max="100000" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Expires At (optional)</label>
                  <input className="input" type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={18} /> {editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}><X size={18} /> Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : promos.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <Tag size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Promo Codes</h3>
            <p style={{ color: 'var(--text-muted)' }}>Create promo codes to offer discounts to customers.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {promos.map(p => (
              <div key={p.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{p.code}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {p.discountPercent}% off · {p.usedCount}/{p.maxUses} used{p.expiresAt ? ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {isExpired(p) ? (
                    <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>Expired</span>
                  ) : isRedeemed(p) ? (
                    <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>Fully Redeemed</span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--success)', color: 'white' }}>Active</span>
                  )}
                  <button className="btn-outline" style={{ padding: '0.4rem' }} onClick={() => openEdit(p)}><Edit2 size={16} /></button>
                  <button className="btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
