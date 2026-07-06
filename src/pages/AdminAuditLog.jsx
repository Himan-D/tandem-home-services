import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ClipboardList, RefreshCw, LogOut, Users, Briefcase, Tag, Warehouse, Map, DollarSign, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/audit/logs`, { headers });
        if (res.ok) setLogs(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = search ? logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  ) : logs;

  const handleLogout = () => { logout(); navigate('/'); };

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
          <button onClick={() => navigate('/admin/approvals')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Approvals</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
          <button onClick={() => navigate('/admin/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/admin/audit')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Audit Log</button>
        </nav>
        <div style={{ marginTop: 'auto' }}><button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button></div>
      </aside>
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Audit Log</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track all admin actions across the platform</p>
          </div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </header>

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw size={32} className="spinner" color="var(--primary)" /></div>
        ) : filtered.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <ClipboardList size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>{search ? 'No matching logs' : 'No Audit Logs'}</h3>
            <p style={{ color: 'var(--text-muted)' }}>Admin actions will be recorded here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="card glass" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Admin</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Action</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Entity</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{log.admin_name || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge" style={{
                        background: log.action?.includes('reject') ? 'var(--danger)' :
                                    log.action?.includes('approve') || log.action?.includes('paid') ? 'var(--success)' :
                                    log.action?.includes('update') || log.action?.includes('edit') ? '#3b82f6' : 'var(--border)',
                        color: 'white', fontSize: '0.75rem',
                      }}>
                        {log.action || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {log.entity_type || '—'}{log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details || '—'}
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
