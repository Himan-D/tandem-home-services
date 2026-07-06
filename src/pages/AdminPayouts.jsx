import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { DollarSign, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, LogOut, Users, Briefcase, Tag, Warehouse, Map, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_ACTIONS = [
  { value: 'approved', label: 'Approve', color: '#3b82f6', icon: CheckCircle },
  { value: 'paid', label: 'Mark Paid', color: 'var(--success)', icon: CheckCircle },
  { value: 'rejected', label: 'Reject', color: 'var(--danger)', icon: XCircle },
];

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payouts/admin/all`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setPayouts(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleStatus = async (id, status) => {
    setActionLoading(id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/payouts/admin/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchPayouts();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const statusBadge = (status) => {
    const m = {
      paid: { bg: 'var(--success)', color: 'white' },
      approved: { bg: '#3b82f6', color: 'white' },
      pending: { bg: '#f59e0b', color: 'white' },
      rejected: { bg: 'var(--danger)', color: 'white' },
    };
    const s = m[status] || { bg: 'var(--border)', color: 'var(--text-muted)' };
    return <span className="badge" style={{ background: s.bg, color: s.color, textTransform: 'capitalize' }}>{status}</span>;
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}><span style={{ color: 'var(--primary)' }}>Tandem</span>Admin</div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Tag size={20} /> Promo Codes</button>
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Warehouse size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Map size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
          <button onClick={() => navigate('/admin/payouts')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Payout Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review and process partner payout requests</p>
        </header>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <DollarSign size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Payout Requests</h3>
            <p style={{ color: 'var(--text-muted)' }}>Partner payout requests will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{payouts.filter(p => p.status === 'pending').length}</div>
              </div>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Approved</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{payouts.filter(p => p.status === 'approved').length}</div>
              </div>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Paid This Month</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                  ${payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_amount), 0) / 100}
                </div>
              </div>
            </div>

            {payouts.map(tx => (
              <div key={tx.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{tx.partner_name || 'Partner'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ${(tx.amount / 100).toFixed(2)} · Fee: ${(tx.fee / 100).toFixed(2)} · Net: <strong>${(tx.net_amount / 100).toFixed(2)}</strong>
                    {tx.created_at && ` · ${new Date(tx.created_at).toLocaleDateString()}`}
                  </div>
                  {tx.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>{tx.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {statusBadge(tx.status)}
                  {tx.status === 'pending' && STATUS_ACTIONS.map(({ value, label, color }) => (
                    <button key={value} className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color, borderColor: color }}
                      onClick={() => handleStatus(tx.id, value)} disabled={actionLoading === tx.id}>
                      {label}
                    </button>
                  ))}
                  {tx.status === 'approved' && (
                    <button className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                      onClick={() => handleStatus(tx.id, 'paid')} disabled={actionLoading === tx.id}>
                      Mark Paid
                    </button>
                  )}
                  {tx.status === 'approved' && (
                    <button className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleStatus(tx.id, 'rejected')} disabled={actionLoading === tx.id}>
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
