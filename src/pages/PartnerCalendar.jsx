import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Calendar as CalendarIcon, DollarSign, LogOut, CheckCircle, Clock, Navigation, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PartnerCalendar() {
  const [activeJobs, setActiveJobs] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setActiveJobs(data.active || []));
  }, []);

  const handleJobAction = (id, action) => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: action })
    }).then(() => {
      // Re-fetch to update status immediately
      fetch(`${API_BASE}/api/jobs`, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(res => res.json())
        .then(data => setActiveJobs(data.active || []));
    });
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
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Partner
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/partner" className="sidebar-link"><Briefcase size={20} /> New Jobs</Link>
          <Link to="/partner/calendar" className="sidebar-link active"><CalendarIcon size={20} /> My Schedule</Link>
          <Link to="#" className="sidebar-link"><DollarSign size={20} /> Earnings</Link>
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>My Schedule</h2>
        </header>

        {/* Real Calendar Grid Mockup */}
        <div className="card glass" style={{ marginBottom: '3rem', padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{day}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ padding: '1rem', minHeight: '100px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                {i === 2 && (
                  <div style={{ background: 'var(--primary-bg)', color: 'var(--primary)', padding: '0.25rem', borderRadius: '4px', fontSize: '0.75rem', marginTop: 'auto', fontWeight: 600 }}>
                    1 Job
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <h3 style={{ marginBottom: '1.5rem' }}>Upcoming & Accepted Jobs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeJobs.filter(job => job.status === 'accepted').length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>You have no accepted jobs coming up.</p>
          ) : (
            activeJobs.filter(job => job.status === 'accepted').map(job => (
              <div key={job.id} className="card glass animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="badge active">Accepted</span>
                      <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{job.serviceTitle}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Customer: {job.customerName}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarIcon size={16} /> {job.time}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                    ${job.payout.toFixed(2)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link to={`/partner/job/${job.id}`} className="btn-primary" style={{ background: '#000', color: 'white', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation size={18} /> View & Navigate
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/partner" className="bottom-nav-item">
          <Briefcase size={24} />
          <span>Jobs</span>
        </Link>
        <Link to="/partner/calendar" className="bottom-nav-item active">
          <CalendarIcon size={24} />
          <span>Schedule</span>
        </Link>
        <Link to="#" className="bottom-nav-item">
          <DollarSign size={24} />
          <span>Earnings</span>
        </Link>
        <div className="bottom-nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut size={24} />
          <span>Logout</span>
        </div>
      </nav>
    </div>
  );
}
