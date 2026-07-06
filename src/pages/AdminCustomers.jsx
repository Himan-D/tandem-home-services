import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Users, Wallet, Star, Briefcase, RefreshCw, X, LogOut, Tag, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setCustomers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Tag size={20} /> Promo Codes</button>
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Warehouse size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Customer Management</h2>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : customers.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Customers</h3>
            <p style={{ color: 'var(--text-muted)' }}>Customers who register on the platform will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {customers.map(c => (
              <div key={c.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                    {c.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {c.email} · {c.phone || 'No phone'} · {c.location || 'No location'}
                    </div>
                    <div style={{ fontSize: '0.8rem', display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wallet size={14} /> ${c.wallet_balance?.toFixed(2) || '0.00'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Briefcase size={14} /> {c.total_bookings || 0} bookings</span>
                    </div>
                  </div>
                </div>
                <div>
                  {c.is_plus_member ? <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>Plus</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
