import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { Users, LayoutDashboard, DollarSign, Activity, AlertCircle, LogOut, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    activePros: 0,
    jobsToday: 0,
    avgRating: 0,
    revenue30d: 0
  });
  const [complaints, setComplaints] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [view, setView] = useState('overview'); // overview, complaints, heatmap
  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchStats = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data));
      
    fetch(`${API_BASE}/api/admin/complaints`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setComplaints(data));
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/api/admin/complaints/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchStats();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/admin" className="sidebar-link active"><LayoutDashboard size={20} /> Overview</Link>
          <Link to="#" className="sidebar-link"><Briefcase size={20} /> Services</Link>
          <Link to="#" className="sidebar-link"><Users size={20} /> Pro Management</Link>
          <Link to="#" className="sidebar-link"><AlertCircle size={20} /> Complaints {complaints.filter(c => c.status === 'open').length > 0 && <span className="badge" style={{ background: 'var(--danger)', color: 'white' }}>{complaints.filter(c => c.status === 'open').length}</span>}</Link>
          <Link to="#" className="sidebar-link"><Activity size={20} /> Live Ops</Link>
          <Link to="#" className="sidebar-link"><DollarSign size={20} /> Finance</Link>
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2>Operations Control Center</h2>
        </header>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
          <button className={`btn-outline ${view === 'overview' ? '' : 'btn-ghost'}`} style={{ border: view === 'overview' ? '1px solid var(--primary)' : 'none', whiteSpace: 'nowrap' }} onClick={() => setView('overview')}>
            Overview & Stats
          </button>
          <button className={`btn-outline ${view === 'services' ? '' : 'btn-ghost'}`} style={{ border: view === 'services' ? '1px solid var(--primary)' : 'none', whiteSpace: 'nowrap' }} onClick={() => setView('services')}>
            <Briefcase size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Manage Services
          </button>
          <button className={`btn-outline ${view === 'complaints' ? '' : 'btn-ghost'}`} style={{ border: view === 'complaints' ? '1px solid var(--primary)' : 'none', whiteSpace: 'nowrap' }} onClick={() => setView('complaints')}>
            Disputes ({complaints.filter(c => c.status === 'open').length})
          </button>
          <button className={`btn-outline ${view === 'heatmap' ? '' : 'btn-ghost'}`} style={{ border: view === 'heatmap' ? '1px solid var(--primary)' : 'none', whiteSpace: 'nowrap' }} onClick={() => setView('heatmap')}>
            Live Dispatch Heatmap
          </button>
        </div>

        {view === 'overview' && (
          <div className="animate-fade-up">
            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: '3rem' }}>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Pros</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.activePros.toLocaleString()}</div>
                <div style={{ color: 'var(--success)', fontSize: '0.875rem' }}>+12% this month</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Jobs Today</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.jobsToday.toLocaleString()}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Avg Rating</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.avgRating}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Revenue (30d)</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>${stats.revenue30d.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {view === 'heatmap' && (
          <div className="animate-fade-up card glass" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url(https://i.imgur.com/3qFf7vO.png) center/cover opacity(0.2)', opacity: 0.1 }}></div>
            <Activity size={48} color="var(--primary)" style={{ marginBottom: '1rem', zIndex: 1 }} />
            <h3 style={{ zIndex: 1 }}>Live Demand Heatmap</h3>
            <p style={{ color: 'var(--text-muted)', zIndex: 1 }}>Real-time spatial visualization of demand vs supply.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', zIndex: 1 }}>
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid red', borderRadius: 'var(--radius-md)', color: 'red', fontWeight: 600 }}>
                High Surge: Downtown (2.1x)
              </div>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontWeight: 600 }}>
                Supply Balanced: North Suburbs
              </div>
            </div>
          </div>
        )}

        {view === 'complaints' && (
          <div className="animate-fade-up">

          <div className="card glass">
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
                      <strong>Job #{d.bookingId.substring(0,6)}</strong>
                      <span className="badge" style={{ background: d.status === 'resolved' ? 'var(--success)' : 'var(--danger)', color: 'white' }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{d.customerName} - {d.reason}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{d.description}</div>
                    {d.status === 'open' && (
                      <button className="btn-outline" style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem', padding: '0.5rem' }} onClick={() => handleResolve(d.id)}>Mark Resolved</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {view === 'services' && (
          <div className="animate-fade-up card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={20} /> Platform Services</h3>
              <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>+ Add New Service</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['Deep Home Cleaning', 'Bathroom Cleaning', 'Sofa Cleaning', 'Plumbing Repair', 'AC Servicing'].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600 }}>{s}</div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>$129.00</span>
                    <button className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/admin" className="bottom-nav-item active">
          <LayoutDashboard size={24} />
          <span>Stats</span>
        </Link>
        <Link to="#" className="bottom-nav-item">
          <Users size={24} />
          <span>Pros</span>
        </Link>
        <Link to="#" className="bottom-nav-item">
          <Activity size={24} />
          <span>Live Ops</span>
        </Link>
        <div className="bottom-nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut size={24} />
          <span>Logout</span>
        </div>
      </nav>
    </div>
  );
}
