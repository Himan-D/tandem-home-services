import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { AlertCircle, ChevronLeft, Send, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PartnerDisputes() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [respondId, setRespondId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);

  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/disputes/partner`, { headers });
      if (res.ok) setComplaints(await res.json());
    } catch {
      setError('Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleRespond = async (id) => {
    if (!responseText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/disputes/${id}/respond`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });
      if (res.ok) {
        setRespondId(null);
        setResponseText('');
        fetchDisputes();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit response');
      }
    } catch {
      alert('Server error');
    }
    setSending(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Partner
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/partner')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
          <button onClick={() => navigate('/partner/calendar')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> My Schedule</button>
          <button onClick={() => navigate('/partner/earnings')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Earnings</button>
          <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><MapPin size={20} /> My Services</button>
          <button onClick={() => navigate('/partner/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/partner/shifts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> Shift Schedule</button>
          <button onClick={() => navigate('/partner/notifications')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Bell size={20} /> Notifications</button>
          <button onClick={() => navigate('/partner/profile')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
        </nav>
      </aside>

      <main className="main-content">
        <button className="btn-outline" onClick={() => navigate('/partner')} style={{ marginBottom: '1.5rem' }}>
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <AlertCircle size={28} color="var(--danger)" />
          <h2 style={{ margin: 0 }}>Disputes & Complaints</h2>
        </div>

        {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

        <div className="card glass" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="spinner" /></div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No complaints against you. Great job!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {complaints.map((c) => (
                <div key={c.id} style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700 }}>#{c.id}</span>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                        color: '#fff', background: c.status === 'open' ? '#ef4444' : '#10b981',
                      }}>{c.status === 'open' ? 'Open' : 'Resolved'}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                  </div>

                  <div style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <strong>Customer:</strong> {c.customerName || 'Unknown'}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Reason:</strong> {c.reason}</div>
                  <div style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.description}</div>

                  {c.serviceTitle && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Service: {c.serviceTitle} {c.bookingTime ? `— ${c.bookingTime}` : ''}
                    </div>
                  )}

                  {c.partnerResponse && (
                    <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.25rem' }}>YOUR RESPONSE</div>
                      <div style={{ fontSize: '0.9rem' }}>{c.partnerResponse}</div>
                    </div>
                  )}

                  {c.status === 'resolved' && c.resolutionType && (
                    <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.25rem' }}>RESOLUTION</div>
                      <div style={{ fontSize: '0.9rem' }}>{c.resolutionType?.replace(/_/g, ' ')}</div>
                      {c.resolutionNotes && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.resolutionNotes}</div>}
                    </div>
                  )}

                  {c.status === 'open' && !c.partnerResponse && (
                    <div>
                      {respondId === c.id ? (
                        <div style={{ marginTop: '0.75rem' }}>
                          <textarea style={{ width: '100%', minHeight: '80px', marginBottom: '0.75rem' }}
                            placeholder="Write your response to this complaint..."
                            value={responseText} onChange={(e) => setResponseText(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={() => handleRespond(c.id)} disabled={sending} style={{ justifyContent: 'center', flex: 1 }}>
                              <Send size={16} /> {sending ? 'Sending...' : 'Submit Response'}
                            </button>
                            <button className="btn-outline" onClick={() => { setRespondId(null); setResponseText(''); }} style={{ flex: 1, justifyContent: 'center' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn-outline" onClick={() => setRespondId(c.id)} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                          <MessageSquare size={16} /> Respond to Complaint
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
