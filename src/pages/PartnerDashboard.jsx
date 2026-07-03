import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, DollarSign, Calendar, Settings, Bell, CheckCircle, XCircle, MapPin, User, LogOut, TrendingUp, Navigation, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

export default function PartnerDashboard({ initialView }) {
  const [incomingJobs, setIncomingJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [rating, setRating] = useState(4.9);
  const [myServices, setMyServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [view, setView] = useState(initialView || 'new_jobs');
  const [shifts, setShifts] = useState([]);
  const { user, token, logout } = useAuth();
  const { on, emit } = useSocket();
  const navigate = useNavigate();
  const locationWatcherRef = useRef(null);

  const fetchShifts = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/shifts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(data => setShifts(data || []));
  };

  const fetchJobs = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setIncomingJobs(data.available || []);
        setActiveJobs(data.active || []);
        if (data.myServices) setMyServices(data.myServices);
        const completed = (data.active || []).filter(j => j.status === 'completed');
        setCompletedJobs(completed.length);
        const sum = completed.reduce((acc, curr) => acc + (curr.payout || 0), 0);
        setEarnings(sum);
      });
  };

  useEffect(() => {
    if (!token) return;
    fetchJobs();
    fetchShifts();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    locationWatcherRef.current = navigator.geolocation.watchPosition(
      (pos) => emit('partner:location', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
    return () => {
      if (locationWatcherRef.current != null) {
        navigator.geolocation.clearWatch(locationWatcherRef.current);
        locationWatcherRef.current = null;
      }
    };
  }, [emit]);

  useEffect(() => {
    const unsub1 = on('booking:assigned', (job) => {
      setIncomingJobs(prev => prev.filter(j => j.id !== job.id));
      setActiveJobs(prev => [...prev, { ...job, status: 'accepted' }]);
    });
    return () => unsub1();
  }, [on]);

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  useEffect(() => {
    fetch(`${API_BASE}/api/services`)
      .then(res => res.json())
      .then(data => setAvailableServices(data));
  }, []);

  const handleUpdateServices = async () => {
    await fetch(`${API_BASE}/api/partner/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ services: myServices })
    });
  };

  const toggleService = (id) => {
    setMyServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleJobAction = (id, action) => {
    if (action === 'accepted') {
      emit('partner:accept', id);
      setIncomingJobs(prev => prev.filter(job => job.id !== id));
    } else if (action === 'declined') {
      emit('partner:decline', id);
      setIncomingJobs(prev => prev.filter(job => job.id !== id));
    } else {
      fetch(`${API_BASE}/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: action })
      }).then(() => fetchJobs());
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleViewChange = (v) => {
    setView(v);
    if (v === 'new_jobs') navigate('/partner');
    else if (v === 'calendar') navigate('/partner/calendar');
    else if (v === 'earnings') navigate('/partner/earnings');
    else if (v === 'services') navigate('/partner/services');
  };

  const getHeaderTitle = () => {
    switch (view) {
      case 'calendar': return 'My Schedule';
      case 'earnings': return 'Earnings & Payouts';
      case 'services': return 'My Services';
      default: return 'Available Jobs';
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Partner
        </div>
        <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>{user?.name || 'Pro User'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>ML-Ranked Pro ★ {rating}</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => handleViewChange('new_jobs')} className={`sidebar-link ${view === 'new_jobs' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
          <button onClick={() => handleViewChange('calendar')} className={`sidebar-link ${view === 'calendar' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> My Schedule</button>
          <button onClick={() => handleViewChange('earnings')} className={`sidebar-link ${view === 'earnings' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Earnings</button>
          <button onClick={() => handleViewChange('services')} className={`sidebar-link ${view === 'services' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><MapPin size={20} /> My Services</button>
          <Link to="#" className="sidebar-link"><Settings size={20} /> Settings</Link>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>{getHeaderTitle()}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}><Bell size={20} /></button>
          </div>
        </header>

        {view === 'new_jobs' && (
          <div className="animate-fade-up">
            <div className="grid-3" style={{ marginBottom: '3rem' }}>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Earnings This Week</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>${earnings.toFixed(2)}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Jobs Completed</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{completedJobs}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ML Rank Score</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>94%</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '1.5rem' }}>Incoming ML-Matched Requests ({incomingJobs.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {incomingJobs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No new jobs available for your selected services.</p>
              ) : (
                incomingJobs.map(job => (
                  <div key={job.id} className="card glass animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="badge pending">{job.id}</span>
                          <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{job.serviceTitle}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {job.location}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> {job.time}</span>
                          {job.customerName && <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {job.customerName}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                        ${job.payout ? job.payout.toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%' }} onClick={() => handleJobAction(job.id, 'declined')}>
                        <XCircle size={18} /> Decline
                      </button>
                      <button className="btn-primary" style={{ background: 'var(--success)', boxShadow: 'none', width: '100%' }} onClick={() => handleJobAction(job.id, 'accepted')}>
                        <CheckCircle size={18} /> Accept via Socket
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="animate-fade-up">
            <div className="card glass" style={{ marginBottom: '3rem', padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Your Shift Schedule</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configure your availability in the Shifts section below.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{day}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const shift = shifts.find(s => s.dayOfWeek === i);
                  const today = new Date().getDay();
                  const adjustedToday = today === 0 ? 6 : today - 1;
                  return (
                    <div key={day} style={{ padding: '1rem', minHeight: '120px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: adjustedToday === i ? 'var(--bg-hover)' : 'transparent' }}>
                      <span style={{ color: adjustedToday === i ? 'var(--primary)' : 'var(--text-muted)', fontWeight: adjustedToday === i ? 700 : 400, fontSize: '0.875rem' }}>{day}</span>
                      {shift ? (
                        <div style={{ marginTop: '0.5rem', background: 'var(--primary-bg)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Active</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{shift.startTime} — {shift.endTime}</div>
                          {shift.breakStart && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Break: {shift.breakStart}-{shift.breakEnd}</div>}
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Off</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> {job.time}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${(job.payout || 0).toFixed(2)}</div>
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
          </div>
        )}

        {view === 'earnings' && (
          <div className="animate-fade-up">
            <div className="grid-3" style={{ marginBottom: '3rem' }}>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Earnings</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>${earnings.toFixed(2)}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Jobs Completed</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{completedJobs}</div>
              </div>
              <div className="card glass">
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Average Rating</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={24} fill="currentColor" /> {rating}
                </div>
              </div>
            </div>
            <div className="card glass" style={{ marginBottom: '3rem', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--primary)" /> Weekly Overview (Mon-Fri)
              </h3>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 500 250" style={{ width: '100%', height: 'auto', minWidth: '400px', maxHeight: '300px' }}>
                  <line x1="50" y1="50" x2="450" y2="50" stroke="var(--border)" strokeDasharray="4 4" />
                  <line x1="50" y1="100" x2="450" y2="100" stroke="var(--border)" strokeDasharray="4 4" />
                  <line x1="50" y1="150" x2="450" y2="150" stroke="var(--border)" strokeDasharray="4 4" />
                  <line x1="50" y1="200" x2="450" y2="200" stroke="var(--border)" />
                  <text x="15" y="55" fill="var(--text-muted)" fontSize="12">$300</text>
                  <text x="15" y="105" fill="var(--text-muted)" fontSize="12">$200</text>
                  <text x="15" y="155" fill="var(--text-muted)" fontSize="12">$100</text>
                  <text x="25" y="205" fill="var(--text-muted)" fontSize="12">$0</text>
                  {[
                    { x: 95, label: 'Mon', value: 150 },
                    { x: 175, label: 'Tue', value: 220 },
                    { x: 255, label: 'Wed', value: 180 },
                    { x: 335, label: 'Thu', value: 280 },
                    { x: 415, label: 'Fri', value: 350 },
                  ].map(({ x, label, value }) => (
                    <g key={label}>
                      <rect x={x - 20} y={200 - value * 0.5} width="40" height={value * 0.5} rx="6" fill="var(--primary)" opacity={0.8} />
                      <text x={x} y={190 - value * 0.5} textAnchor="middle" fill="var(--primary)" fontSize="12" fontWeight="bold">${value}</text>
                      <text x={x} y="225" textAnchor="middle" fill="var(--text-muted)" fontSize="12">{label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <h3 style={{ marginBottom: '1.5rem' }}>Completed Jobs & Payouts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeJobs.filter(job => job.status === 'completed').length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No completed jobs recorded yet.</p>
              ) : (
                activeJobs.filter(job => job.status === 'completed').map(job => (
                  <div key={job.id} className="card glass animate-fade-up" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.25rem' }}>{job.serviceTitle}</div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>Customer: {job.customerName}</span>
                          <span>Date: {job.time}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>+${(job.payout || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Take-Home</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'services' && (
          <div className="animate-fade-up card glass">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="var(--primary)" /> Manage My Services
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select the services you offer. The ML matching engine will only dispatch requests for checked services.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {availableServices.map(service => (
                <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: myServices.includes(service.id) ? 'var(--primary-bg)' : 'transparent' }}>
                  <input type="checkbox" checked={myServices.includes(service.id)} onChange={() => toggleService(service.id)} style={{ width: '20px', height: '20px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{service.title}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Base Price: ${service.basePrice}</div>
                  </div>
                </label>
              ))}
            </div>
            <button className="btn-primary" onClick={handleUpdateServices}>Save Services</button>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        {[
          { view: 'new_jobs', icon: <Briefcase size={24} />, label: 'Jobs' },
          { view: 'calendar', icon: <Calendar size={24} />, label: 'Schedule' },
          { view: 'earnings', icon: <DollarSign size={24} />, label: 'Earnings' },
          { view: 'services', icon: <MapPin size={24} />, label: 'Services' },
        ].map(({ view: v, icon, label }) => (
          <button key={v} onClick={() => handleViewChange(v)} className={`bottom-nav-item ${view === v ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
        <div className="bottom-nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut size={24} />
          <span>Logout</span>
        </div>
      </nav>
    </div>
  );
}
