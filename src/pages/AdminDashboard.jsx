import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Users, LayoutDashboard, DollarSign, Activity, AlertCircle, LogOut, Briefcase, MapPin, Tag, Warehouse, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activePros: 0, jobsToday: 0, avgRating: 0, revenue30d: 0 });
  const [complaints, setComplaints] = useState([]);
  const [services, setServices] = useState([]);
  const [view, setView] = useState('overview');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchStats = () => {
    fetch(`${API_BASE}/api/admin/stats`, { headers })
      .then(res => res.json())
      .then(data => setStats(data));
    fetch(`${API_BASE}/api/admin/complaints`, { headers })
      .then(res => res.json())
      .then(data => setComplaints(data));
    fetch(`${API_BASE}/api/services`, { headers })
      .then(res => res.json())
      .then(data => setServices(data));
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id) => {
    await fetch(`${API_BASE}/api/admin/complaints/${id}/resolve`, { method: 'PATCH', headers });
    fetchStats();
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><LayoutDashboard size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Tag size={20} /> Promo Codes</button>
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Warehouse size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><MapPin size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Operations Control Center</h2>
        </header>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
          {[
            { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview & Stats' },
            { key: 'services', icon: <Briefcase size={18} />, label: 'Manage Services' },
            { key: 'complaints', icon: <AlertCircle size={18} />, label: `Disputes (${complaints.filter(c => c.status === 'open').length})` },
            { key: 'heatmap', icon: <MapPin size={18} />, label: 'Live Dispatch Heatmap' },
          ].map(({ key, icon, label }) => (
            <button key={key}
              className={`btn-outline ${view === key ? '' : 'btn-ghost'}`}
              style={{ border: view === key ? '1px solid var(--primary)' : 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setView(key)}
            >{icon} {label}</button>
          ))}
        </div>

        {view === 'overview' && (
          <div className="animate-fade-up">
            <div className="grid-4" style={{ marginBottom: '3rem' }}>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Pros</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.activePros?.toLocaleString()}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Jobs Today</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.jobsToday?.toLocaleString()}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Avg Rating</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.avgRating || '—'}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Revenue (30d)</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>${(stats.revenue30d || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {view === 'heatmap' && (
          <div className="animate-fade-up card glass" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <MapPin size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3>Live Demand Heatmap</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
              {stats.activePros > 0
                ? `${stats.activePros} active partners online. ${stats.jobsToday} jobs dispatched today.`
                : 'No partner activity yet. Invite partners to get started.'}
            </p>
          </div>
        )}

        {view === 'complaints' && (
          <div className="animate-fade-up card glass">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} color="var(--danger)" /> Customer Complaints
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              {complaints.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No complaints found.</p>
              ) : (
                complaints.map(d => (
                  <div key={d.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', opacity: d.status === 'resolved' ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong>Job #{d.bookingId?.substring(0, 6) || 'N/A'}</strong>
                      <span className="badge" style={{ background: d.status === 'resolved' ? 'var(--success)' : 'var(--danger)', color: 'white' }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{d.customer_name || 'Unknown'} — {d.reason}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{d.description}</div>
                    {d.status === 'open' && (
                      <button className="btn-outline" style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem', padding: '0.5rem' }} onClick={() => handleResolve(d.id)}>Mark Resolved</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'services' && (
          <div className="animate-fade-up card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20} /> Platform Services</h3>
              <button className="btn-primary" onClick={() => navigate('/admin/services')} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>Manage</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No services created yet.</p>
              ) : (
                services.slice(0, 5).map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.category}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span className="badge" style={{ background: s.isActive ? 'var(--success)' : 'var(--border)', color: s.isActive ? 'white' : 'var(--text-muted)' }}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>${s.basePrice?.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={() => navigate('/admin')} className="bottom-nav-item active" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><LayoutDashboard size={24} /><span>Stats</span></button>
        <button onClick={() => navigate('/admin/partners')} className="bottom-nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Users size={24} /><span>Pros</span></button>
        <button onClick={() => navigate('/admin/orders')} className="bottom-nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Activity size={24} /><span>Orders</span></button>
        <div className="bottom-nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}><LogOut size={24} /><span>Logout</span></div>
      </nav>
    </div>
  );
}
