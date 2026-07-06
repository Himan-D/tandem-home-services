import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Calendar, Clock, Save, AlertCircle, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, Sun, Moon, Briefcase, DollarSign, User, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
}

export default function PartnerShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editDay, setEditDay] = useState(null);
  const [editForm, setEditForm] = useState({ startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' });
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, { headers });
      if (res.ok) setShifts(await res.json());
    } catch (e) { setError('Failed to load shifts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShifts(); }, []);

  const getShiftForDay = (dayIndex) => shifts.find(s => s.dayOfWeek === dayIndex);

  const toggleDay = async (dayIndex) => {
    const existing = getShiftForDay(dayIndex);
    let newShifts;
    if (existing) {
      newShifts = shifts.map(s => s.dayOfWeek === dayIndex ? { ...s, isActive: s.isActive ? 0 : 1 } : s);
    } else {
      newShifts = [...shifts, { dayOfWeek: dayIndex, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isActive: 1 }];
    }
    setShifts(newShifts);
    setEditDay(dayIndex);
    const s = newShifts.find(x => x.dayOfWeek === dayIndex);
    if (s) setEditForm({ startTime: s.startTime || '09:00', endTime: s.endTime || '17:00', breakStart: s.breakStart || '12:00', breakEnd: s.breakEnd || '13:00' });
  };

  const openEdit = (dayIndex) => {
    const s = getShiftForDay(dayIndex);
    setEditDay(dayIndex);
    setEditForm({
      startTime: s?.startTime || '09:00',
      endTime: s?.endTime || '17:00',
      breakStart: s?.breakStart || '',
      breakEnd: s?.breakEnd || '',
    });
  };

  const handleSaveDay = () => {
    setShifts(prev => {
      const existing = prev.findIndex(s => s.dayOfWeek === editDay);
      const updated = { dayOfWeek: editDay, ...editForm, isActive: 1 };
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = { ...copy[existing], ...updated };
        return copy;
      }
      return [...prev, updated];
    });
    setEditDay(null);
  };

  const removeDay = (dayIndex) => {
    setShifts(prev => prev.filter(s => s.dayOfWeek !== dayIndex));
    if (editDay === dayIndex) setEditDay(null);
  };

  const handleSaveAll = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Schedule saved!');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const now = new Date();
  const currentDay = now.getDay();
  const adjustedToday = currentDay === 0 ? 6 : currentDay - 1;

  const getBarStyle = (s) => {
    if (!s || !s.isActive) return null;
    const startH = parseInt(s.startTime);
    const startM = parseInt(s.startTime.split(':')[1] || '0');
    const endH = parseInt(s.endTime);
    const endM = parseInt(s.endTime.split(':')[1] || '0');
    const top = ((startH * 60 + startM) / (24 * 60)) * 100;
    const height = (((endH * 60 + endM) - (startH * 60 + startM)) / (24 * 60)) * 100;
    return { top: `${top}%`, height: `${Math.max(height, 3)}%` };
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">{sidebarContent()}</aside>
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw size={32} className="spinner" color="var(--primary)" />
        </main>
      </div>
    );
  }

  function sidebarContent() {
    return (
      <>
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}><span style={{ color: 'var(--primary)' }}>Tandem</span>Partner</div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/partner')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
          <button onClick={() => navigate('/partner/calendar')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> Schedule</button>
          <button onClick={() => navigate('/partner/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/partner/notifications')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Bell size={20} /> Notifications</button>
          <button onClick={() => navigate('/partner/profile')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">{sidebarContent()}</aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Shift Schedule</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Set your weekly availability. Toggle days on/off and configure hours.</p>
          </div>
          <button className="btn-primary" onClick={handleSaveAll} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </header>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        <div className="card glass" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(7, 1fr)`, borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', borderRight: '1px solid var(--border)' }}>GMT</div>
            {DAYS.map((day, i) => (
              <div key={day} style={{
                padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600,
                fontSize: '0.8rem', borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                background: adjustedToday === i ? 'var(--primary-bg)' : 'transparent',
                color: adjustedToday === i ? 'var(--primary)' : 'var(--text-muted)',
              }}>
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(7, 1fr)` }}>
            <div style={{ borderRight: '1px solid var(--border)', padding: '0.25rem' }}>
              {TIME_SLOTS.filter(t => t.endsWith(':00')).map(t => (
                <div key={t} style={{ height: '28px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)' }}>
                  {t}
                </div>
              ))}
            </div>
            {DAYS.map((day, i) => {
              const s = getShiftForDay(i);
              const isActive = s?.isActive;
              const bar = getBarStyle(s);
              return (
                <div key={day} style={{
                  position: 'relative', borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', minHeight: '672px',
                  background: adjustedToday === i ? 'var(--bg-hover)' : 'transparent',
                }} onClick={() => isActive ? openEdit(i) : toggleDay(i)}>
                  {!isActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.5 }}>Off</span>
                    </div>
                  )}
                  {isActive && bar && (
                    <div style={{
                      position: 'absolute', left: '4px', right: '4px', top: bar.top,
                      height: bar.height, background: 'var(--primary)', opacity: 0.2,
                      borderRadius: '4px', border: '1px solid var(--primary)',
                    }} />
                  )}
                  {isActive && (
                    <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600, textAlign: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '2px', padding: '1px' }}>
                      {s.startTime}
                    </div>
                  )}
                  {isActive && (
                    <div style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600, textAlign: 'center', background: 'rgba(255,255,255,0.8)', borderRadius: '2px', padding: '1px' }}>
                      {s.endTime}
                    </div>
                  )}
                  {adjustedToday === i && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {editDay !== null && (
          <div className="card glass animate-fade-up" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Edit {DAYS[editDay]} Shift</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Start Time</label>
                <input className="input" type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>End Time</label>
                <input className="input" type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Break Start (opt)</label>
                <input className="input" type="time" value={editForm.breakStart} onChange={e => setEditForm({ ...editForm, breakStart: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Break End (opt)</label>
                <input className="input" type="time" value={editForm.breakEnd} onChange={e => setEditForm({ ...editForm, breakEnd: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" onClick={handleSaveDay} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={18} /> Set Times</button>
              <button className="btn-outline" onClick={() => setEditDay(null)}>Done</button>
              <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => removeDay(editDay)}>Remove Day</button>
            </div>
          </div>
        )}

        <div className="card glass" style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Your Weekly Hours</h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {DAYS.map((day, i) => {
              const s = getShiftForDay(i);
              if (!s?.isActive) return null;
              return (
                <div key={day} style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'var(--primary-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>{day.substring(0, 3)}</strong>: {s.startTime}-{s.endTime}
                  {s.breakStart && <span style={{ color: 'var(--text-muted)' }}> (break {s.breakStart}-{s.breakEnd})</span>}
                </div>
              );
            })}
            {shifts.filter(s => s.isActive).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active shifts. Click a day to add your availability.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
