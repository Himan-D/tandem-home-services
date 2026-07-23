import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ClipboardList, RefreshCw, X, LogOut, Users, Briefcase, Tag, Warehouse, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending: '#f59e0b',
  inventory_validated: '#3b82f6',
  rider_assigned: '#8b5cf6',
  in_progress: '#3b82f6',
  picked_up: '#6366f1',
  completed: 'var(--success)',
  cancelled: '#6b7280',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setOrders(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleDeleteOrder = async (orderId) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${orderId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete order');
      setDeleteSuccess('Order deleted successfully');
      setDeleteTarget(null);
      fetchOrders();
      setTimeout(() => setDeleteSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Order Management</h2>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {deleteSuccess && (
          <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            {deleteSuccess}
            <button onClick={() => setDeleteSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {deleteTarget && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="card glass" style={{
              maxWidth: '400px',
              width: '90%',
              border: '2px solid var(--danger)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
                <h3 style={{ margin: 0 }}>Confirm Delete</h3>
              </div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Are you sure you want to delete order #{String(deleteTarget).padStart(5, '0')}? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn-outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  style={{ minWidth: '80px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleDeleteOrder(deleteTarget)}
                  disabled={deleteLoading}
                  style={{
                    minWidth: '80px',
                    background: 'var(--danger)',
                    borderColor: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center'
                  }}
                >
                  {deleteLoading ? (
                    <>
                      <RefreshCw size={16} className="spinner" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} /> Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <ClipboardList size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Orders</h3>
            <p style={{ color: 'var(--text-muted)' }}>Customer orders will appear here once the platform is active.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="card glass" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Order</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Partner</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Store</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      #{String(o.id).padStart(5, '0')}
                    </td>
                    <td style={{ padding: '1rem' }}>{o.customer_name || '—'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{o.serviceId || '—'}</td>
                    <td style={{ padding: '1rem' }}>{o.rider_name || 'Unassigned'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{o.store_name || '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{
                        background: STATUS_COLORS[o.status] || 'var(--border)',
                        color: 'white',
                        textTransform: 'capitalize'
                      }}>
                        {o.status?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>${(o.amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => setDeleteTarget(o.id)}
                        className="btn-outline"
                        disabled={deleteLoading}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          color: 'var(--danger)',
                          borderColor: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: deleteLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
