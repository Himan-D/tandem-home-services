import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, LogOut, Briefcase, Tag, Warehouse, Map, DollarSign, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminPartnerApproval() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [notes, setNotes] = useState({});
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/partner-approval/applications`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setApplications(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleStatus = async (userId, status) => {
    setActionLoading(userId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/partner-approval/applications/${userId}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: notes[userId] || '' }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchApplications();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const statusBadge = (status) => {
    const m = { approved: { bg: 'var(--success)', color: 'white' }, rejected: { bg: 'var(--danger)', color: 'white' }, pending: { bg: '#f59e0b', color: 'white' } };
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
          <button onClick={() => navigate('/admin/approvals')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Approvals</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
          <button onClick={() => navigate('/admin/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/admin/audit')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Audit Log</button>
        </nav>
        <div style={{ marginTop: 'auto' }}><button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button></div>
      </aside>
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Partner Applications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review and approve/reject partner registrations</p>
        </header>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw size={32} className="spinner" color="var(--primary)" /></div>
        ) : applications.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Applications</h3>
            <p style={{ color: 'var(--text-muted)' }}>Partner registrations will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: '#f59e0b', fontSize: '0.8rem' }}>Pending Review</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{applications.filter(a => a.application_status === 'pending').length}</div>
              </div>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Approved</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{applications.filter(a => a.application_status === 'approved').length}</div>
              </div>
              <div className="card glass" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Rejected</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{applications.filter(a => a.application_status === 'rejected').length}</div>
              </div>
            </div>

            {applications.map(app => (
              <div key={app.id} className="card glass animate-fade-up" style={{ padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: app.application_status === 'pending' ? '#f59e0b' : app.application_status === 'approved' ? 'var(--success)' : 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {app.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{app.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {app.email} · {app.phone || 'No phone'} · {app.location || 'No location'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Joined {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {statusBadge(app.application_status)}
                  </div>
                </div>
                {app.application_status === 'pending' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <input className="input" style={{ flex: 1 }} placeholder="Add a note (optional)..." value={notes[app.id] || ''} onChange={e => setNotes({ ...notes, [app.id]: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => handleStatus(app.id, 'approved')} disabled={actionLoading === app.id}>
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => handleStatus(app.id, 'rejected')} disabled={actionLoading === app.id}>
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                )}
                {app.application_note && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Note: {app.application_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
