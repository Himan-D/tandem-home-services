import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ShieldCheck, ShieldX, Clock, AlertTriangle, Loader, LogOut, Users, Briefcase, Tag, Warehouse, MapPin, ClipboardList, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  not_started: { icon: ShieldX, color: '#6b7280', bg: '#f3f4f6', label: 'Not Started' },
  pending: { icon: Clock, color: '#f59e0b', bg: '#fffbeb', label: 'Pending' },
  in_progress: { icon: Loader, color: '#3b82f6', bg: '#eff6ff', label: 'In Progress' },
  clear: { icon: ShieldCheck, color: '#10b981', bg: '#ecfdf5', label: 'Clear' },
  disputed: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Disputed' },
  suspended: { icon: ShieldX, color: '#ef4444', bg: '#fef2f2', label: 'Suspended' },
  failed: { icon: ShieldX, color: '#ef4444', bg: '#fef2f2', label: 'Failed' },
};

export default function AdminBackgroundChecks() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [manualStatus, setManualStatus] = useState('clear');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/background-checks' : `/api/background-checks?status=${filter}`;
      const res = await fetch(`${API_BASE}${url}`, { headers });
      if (res.ok) setChecks(await res.json());
    } catch {
      setError('Failed to fetch');
    }
    setLoading(false);
  };

  useEffect(() => { fetchChecks(); }, [filter]);

  const handleSelect = async (id) => {
    const res = await fetch(`${API_BASE}/api/background-checks/${id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const handleInitiate = async (id) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/background-checks/${id}/initiate`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (res.ok) { fetchChecks(); setSelected(null); }
      else alert(data.error || 'Failed to initiate');
    } catch {
      alert('Server error');
    }
    setSaving(false);
  };

  const handleManualResult = async () => {
    if (!manualStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/background-checks/${selected.id}/result`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: manualStatus, notes: manualNotes }),
      });
      const data = await res.json();
      if (res.ok) { setSelected(null); setManualNotes(''); fetchChecks(); }
      else alert(data.error || 'Failed to update');
    } catch {
      alert('Server error');
    }
    setSaving(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><MapPin size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
          <button onClick={() => navigate('/admin/disputes')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><AlertTriangle size={20} /> Disputes</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => { logout(); navigate('/'); }} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={28} color="var(--primary)" /> Background Checks
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'pending', 'in_progress', 'clear', 'disputed', 'failed'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={filter === f ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >{f === 'in_progress' ? 'In Prog' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>All Checks ({checks.length})</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
            ) : checks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>No background checks found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {checks.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.not_started;
                  const Icon = cfg.icon;
                  return (
                    <div key={c.id} onClick={() => handleSelect(c.id)}
                      style={{
                        padding: '1rem', border: `1px solid ${selected?.id === c.id ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: selected?.id === c.id ? 'var(--primary-bg)' : 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon size={18} color={cfg.color} />
                          <span style={{ fontWeight: 600 }}>{c.partnerName || 'Unknown'}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {c.partnerEmail} &bull; {formatDate(c.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <div className="card glass" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>{selected.partnerName}</h3>
                <span className="badge" style={{
                  background: (STATUS_CONFIG[selected.status] || {}).color || '#6b7280', color: '#fff',
                }}>{(STATUS_CONFIG[selected.status] || {}).label || selected.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>PARTNER INFO</div>
                  <div style={{ marginBottom: '0.25rem' }}><strong>Email:</strong> {selected.partnerEmail}</div>
                  <div style={{ marginBottom: '0.25rem' }}><strong>Consent:</strong> {selected.consentGiven ? `Yes — ${formatDate(selected.consentAt)}` : 'No'}</div>
                  <div><strong>Provider:</strong> {selected.provider}</div>
                </div>

                {selected.externalId && (
                  <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>EXTERNAL DATA</div>
                    <div style={{ marginBottom: '0.25rem' }}><strong>External ID:</strong> {selected.externalId}</div>
                    {selected.reportUrl && <div><strong>Report:</strong> <a href={selected.reportUrl} target="_blank" rel="noreferrer">View Report</a></div>}
                  </div>
                )}

                {selected.notes && (
                  <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.25rem' }}>NOTES</div>
                    <div>{selected.notes}</div>
                  </div>
                )}

                {selected.status === 'pending' && (
                  <button className="btn-primary" onClick={() => handleInitiate(selected.id)}
                    disabled={saving} style={{ justifyContent: 'center' }}>
                    {saving ? 'Initiating...' : 'Initiate Background Check'}
                  </button>
                )}

                {['in_progress', 'disputed', 'suspended', 'failed'].includes(selected.status) && (
                  <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Update Result</h4>
                    <select style={{ width: '100%', marginBottom: '0.75rem' }} value={manualStatus} onChange={(e) => setManualStatus(e.target.value)}>
                      <option value="clear">Clear — Passed</option>
                      <option value="disputed">Disputed — Needs Review</option>
                      <option value="suspended">Suspended</option>
                      <option value="failed">Failed</option>
                    </select>
                    <textarea style={{ width: '100%', minHeight: '60px', marginBottom: '0.75rem' }}
                      placeholder="Notes about this result..."
                      value={manualNotes} onChange={(e) => setManualNotes(e.target.value)}
                    />
                    <button className="btn-primary" onClick={handleManualResult} disabled={saving}
                      style={{ width: '100%', justifyContent: 'center' }}>
                      {saving ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
