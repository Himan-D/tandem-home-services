import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { AlertCircle, CheckCircle, XCircle, MessageSquare, RotateCcw, LogOut, Users, Briefcase, Tag, Warehouse, MapPin, ClipboardList, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RESOLUTION_TYPES = [
  { value: 'refund_full', label: 'Full Refund', color: '#ef4444' },
  { value: 'refund_partial', label: 'Partial Refund', color: '#f59e0b' },
  { value: 'dismissed', label: 'Dismissed', color: '#6b7280' },
  { value: 'credited_partner', label: 'Partner Credited', color: '#3b82f6' },
  { value: 'other', label: 'Other', color: '#8b5cf6' },
];

export default function AdminDisputes() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionType, setResolutionType] = useState('refund_full');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/disputes' : `/api/disputes?status=${filter}`;
      const res = await fetch(`${API_BASE}${url}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setComplaints(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, [filter]);

  const handleSelect = async (id) => {
    const res = await fetch(`${API_BASE}/api/disputes/${id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const handleResolve = async () => {
    if (!resolutionType) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/disputes/${selected.id}/resolve`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionType, resolutionNotes }),
      });
      if (res.ok) {
        if (adminNotes.trim()) {
          await fetch(`${API_BASE}/api/disputes/${selected.id}/note`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: adminNotes }),
          });
        }
        setShowResolve(false);
        setSelected(null);
        setAdminNotes('');
        setResolutionNotes('');
        fetchComplaints();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to resolve');
      }
    } catch {
      alert('Server error');
    }
    setSaving(false);
  };

  const handleReopen = async (id) => {
    if (!confirm('Reopen this dispute?')) return;
    try {
      await fetch(`${API_BASE}/api/disputes/${id}/reopen`, { method: 'POST', headers });
      fetchComplaints();
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, status: 'open' } : null);
      }
    } catch {
      alert('Failed to reopen');
    }
  };

  const STATUS_COLORS = { open: '#ef4444', resolved: '#10b981' };
  const STATUS_LABELS = { open: 'Open', resolved: 'Resolved' };

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
          <button onClick={() => navigate('/admin/disputes')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><AlertCircle size={20} /> Disputes</button>
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
            <AlertCircle size={28} color="var(--danger)" /> Dispute Resolution Center
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'open', 'resolved'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={filter === f ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
              >{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
        </header>

        {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>All Disputes ({complaints.length})</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="spinner" /></div>
            ) : complaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>No disputes found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {complaints.map((c) => (
                  <div key={c.id} onClick={() => handleSelect(c.id)}
                    style={{
                      padding: '1rem', border: `1px solid ${selected?.id === c.id ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', background: selected?.id === c.id ? 'var(--primary-bg)' : 'var(--bg-card)',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{c.id}</span>
                        <span style={{ color: STATUS_COLORS[c.status], fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: c.status === 'open' ? '#fef2f2' : '#ecfdf5' }}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' }}>{c.customerName} — {c.reason}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.serviceTitle && <span>{c.serviceTitle} &bull; </span>}
                      {formatDate(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="card glass" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Dispute #{selected.id}</h3>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                  color: '#fff', background: STATUS_COLORS[selected.status] || '#6b7280',
                }}>{STATUS_LABELS[selected.status] || selected.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>COMPLAINT DETAILS</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Customer:</strong> {selected.customerName}</div>
                  {selected.partnerName && <div style={{ marginBottom: '0.5rem' }}><strong>Partner:</strong> {selected.partnerName}</div>}
                  {selected.serviceTitle && <div style={{ marginBottom: '0.5rem' }}><strong>Service:</strong> {selected.serviceTitle}</div>}
                  {selected.bookingTime && <div style={{ marginBottom: '0.5rem' }}><strong>Booking Time:</strong> {selected.bookingTime}</div>}
                  {selected.bookingPayout != null && <div style={{ marginBottom: '0.5rem' }}><strong>Amount:</strong> ${Math.floor(selected.bookingPayout / 0.75).toFixed(2)}</div>}
                  <div style={{ marginBottom: '0.5rem' }}><strong>Reason:</strong> {selected.reason}</div>
                  <div><strong>Description:</strong> {selected.description || '—'}</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filed: {formatDate(selected.createdAt)}</div>
                </div>

                {selected.partnerResponse && (
                  <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.5rem' }}>PARTNER RESPONSE</div>
                    <div style={{ fontSize: '0.9rem' }}>{selected.partnerResponse}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{selected.updatedAt ? formatDate(selected.updatedAt) : ''}</div>
                  </div>
                )}

                {selected.customerFollowup && (
                  <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>CUSTOMER FOLLOW-UP</div>
                    <div style={{ fontSize: '0.9rem' }}>{selected.customerFollowup}</div>
                  </div>
                )}

                {selected.status === 'resolved' && (
                  <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>RESOLUTION</div>
                    <div style={{ marginBottom: '0.5rem' }}><strong>Type:</strong> {RESOLUTION_TYPES.find(t => t.value === selected.resolutionType)?.label || selected.resolutionType}</div>
                    {selected.resolutionNotes && <div style={{ marginBottom: '0.5rem' }}><strong>Notes:</strong> {selected.resolutionNotes}</div>}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resolved: {formatDate(selected.resolvedAt)}</div>
                  </div>
                )}

                {selected.status === 'open' && !showResolve && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--success)' }} onClick={() => setShowResolve(true)}>
                      <CheckCircle size={18} /> Resolve
                    </button>
                    <button className="btn-outline" onClick={() => setSelected(null)} style={{ flex: 1, justifyContent: 'center' }}>
                      Close
                    </button>
                  </div>
                )}

                {selected.status === 'resolved' && (
                  <button className="btn-outline" onClick={() => handleReopen(selected.id)} style={{ justifyContent: 'center' }}>
                    <RotateCcw size={16} /> Reopen
                  </button>
                )}

                {showResolve && (
                  <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Resolve Dispute</h4>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Resolution Type</label>
                    <select style={{ width: '100%', marginBottom: '1rem' }} value={resolutionType} onChange={(e) => setResolutionType(e.target.value)}>
                      {RESOLUTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Resolution Notes (optional)</label>
                    <textarea style={{ width: '100%', minHeight: '80px', marginBottom: '1rem' }} placeholder="Notes visible to customer and partner" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Internal Admin Notes (optional)</label>
                    <textarea style={{ width: '100%', minHeight: '60px', marginBottom: '1rem' }} placeholder="Private notes (not visible to customer/partner)" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn-primary" onClick={handleResolve} disabled={saving} style={{ flex: 1, justifyContent: 'center', background: 'var(--success)' }}>
                        {saving ? 'Resolving...' : 'Confirm Resolution'}
                      </button>
                      <button className="btn-outline" onClick={() => setShowResolve(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <button onClick={() => navigate('/admin')} className="bottom-nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Briefcase size={24} /><span>Stats</span></button>
        <button onClick={() => navigate('/admin/partners')} className="bottom-nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Users size={24} /><span>Pros</span></button>
        <button onClick={() => navigate('/admin/orders')} className="bottom-nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><ClipboardList size={24} /><span>Orders</span></button>
        <div className="bottom-nav-item active" style={{ cursor: 'pointer' }}><AlertCircle size={24} /><span>Disputes</span></div>
        <div className="bottom-nav-item" onClick={() => { logout(); navigate('/'); }} style={{ cursor: 'pointer' }}><LogOut size={24} /><span>Logout</span></div>
      </nav>
    </div>
  );
}
