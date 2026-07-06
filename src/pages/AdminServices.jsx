import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Briefcase, Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, LogOut, Users, Tag, Warehouse, MapPin, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', basePrice: '', category: '', isActive: 1 });
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setServices(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', basePrice: '', category: '', isActive: 1 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ title: s.title, basePrice: String(s.basePrice), category: s.category, isActive: s.isActive });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = editing ? `${API_BASE}/api/services/${editing}` : `${API_BASE}/api/services`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, basePrice: parseFloat(form.basePrice) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      setShowForm(false);
      setEditing(null);
      fetchServices();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
      fetchServices();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Promo Codes</button>
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
          <h2>Manage Services</h2>
          <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={18} /> New Service</button>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {showForm && (
          <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Service' : 'Create Service'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Title</label>
                  <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={2} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Base Price ($)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Category</label>
                  <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</label>
                  <select className="input" value={form.isActive} onChange={e => setForm({ ...form, isActive: parseInt(e.target.value) })}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={18} /> {editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditing(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><X size={18} /> Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : services.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <Briefcase size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Services Yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Create your first service to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {services.map(s => (
              <div key={s.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {s.category} · ${s.basePrice?.toFixed(2)} · ID: {s.id}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className="badge" style={{ background: s.isActive ? 'var(--success)' : 'var(--border)', color: s.isActive ? 'white' : 'var(--text-muted)' }}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="btn-outline" style={{ padding: '0.4rem' }} onClick={() => openEdit(s)}><Edit2 size={16} /></button>
                  <button className="btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
