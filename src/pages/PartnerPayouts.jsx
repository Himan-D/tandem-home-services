import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { DollarSign, Wallet, TrendingUp, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ArrowRight, Briefcase, Calendar, User, LogOut, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PartnerPayouts() {
  const [summary, setSummary] = useState({ total: 0, paid: 0, pendingAmount: 0, available: 0, thisMonth: 0, completedJobs: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, hRes] = await Promise.all([
        fetch(`${API_BASE}/api/payouts/earnings-summary`, { headers }),
        fetch(`${API_BASE}/api/payouts/history`, { headers }),
      ]);
      if (sRes.ok) setSummary(await sRes.json());
      if (hRes.ok) setHistory(await hRes.json());
    } catch (e) { setError('Failed to load payout data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRequest = async () => {
    setError(''); setSuccess('');
    const amount = Math.round(parseFloat(requestAmount) * 100);
    if (!amount || amount < 100) { setError('Minimum payout is $1.00'); return; }
    if (amount > summary.available) { setError(`Maximum available is $${(summary.available / 100).toFixed(2)}`); return; }
    try {
      const res = await fetch(`${API_BASE}/api/payouts/request`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Payout of $${(data.netAmount / 100).toFixed(2)} requested!`);
      setShowRequest(false);
      setRequestAmount('');
      fetchData();
    } catch (e) { setError(e.message); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const statusVariant = (status) => {
    switch (status) {
      case 'paid': return { bg: 'var(--success)', color: 'white', icon: CheckCircle };
      case 'approved': return { bg: '#3b82f6', color: 'white', icon: CheckCircle };
      case 'pending': return { bg: '#f59e0b', color: 'white', icon: Clock };
      case 'rejected': return { bg: 'var(--danger)', color: 'white', icon: XCircle };
      default: return { bg: 'var(--border)', color: 'var(--text-muted)', icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}><span style={{ color: 'var(--primary)' }}>Tandem</span>Partner</div>
          <nav className="sidebar-nav">
            <button onClick={() => navigate('/partner')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
            <button onClick={() => navigate('/partner/calendar')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> Schedule</button>
            <button onClick={() => navigate('/partner/payouts')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
            <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
            <button onClick={() => navigate('/partner/profile')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
          </nav>
          <div style={{ marginTop: 'auto' }}><button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button></div>
        </aside>
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw size={32} className="spinner" color="var(--primary)" />
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}><span style={{ color: 'var(--primary)' }}>Tandem</span>Partner</div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/partner')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> New Jobs</button>
          <button onClick={() => navigate('/partner/calendar')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Calendar size={20} /> Schedule</button>
          <button onClick={() => navigate('/partner/payouts')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
          <button onClick={() => navigate('/partner/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/partner/profile')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><User size={20} /> Profile</button>
        </nav>
        <div style={{ marginTop: 'auto' }}><button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button></div>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Payouts & Earnings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View earnings, request payouts, and track payment history</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-outline" onClick={() => navigate('/partner/earnings')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={18} /> Earnings Chart</button>
            <button className="btn-primary" onClick={() => setShowRequest(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Send size={18} /> Request Payout</button>
          </div>
        </header>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
            <CheckCircle size={18} /> {success}
            <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}

        {showRequest && (
          <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Request Payout</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Available balance: <strong>${(summary.available / 100).toFixed(2)}</strong> · 2% processing fee applies
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Amount ($)</label>
                <input className="input" type="number" step="0.01" min="1" max={(summary.available / 100).toFixed(2)} value={requestAmount}
                  onChange={e => setRequestAmount(e.target.value)} placeholder="0.00" />
              </div>
              <button className="btn-primary" onClick={handleRequest} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Send size={18} /> Request
              </button>
              <button className="btn-outline" onClick={() => { setShowRequest(false); setRequestAmount(''); }}>Cancel</button>
            </div>
            {requestAmount > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                Net amount: <strong>${(Math.round(parseFloat(requestAmount || 0) * 100) * 0.98 / 100).toFixed(2)}</strong>
                <span style={{ color: 'var(--text-muted)' }}> (fee: ${(Math.round(parseFloat(requestAmount || 0) * 100) * 0.02 / 100).toFixed(2)})</span>
              </div>
            )}
          </div>
        )}

        <div className="grid-4" style={{ marginBottom: '3rem' }}>
          <div className="card glass">
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Total Earnings</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${(summary.total / 100).toFixed(2)}</div>
          </div>
          <div className="card glass">
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Paid Out</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>${(summary.paid / 100).toFixed(2)}</div>
          </div>
          <div className="card glass">
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Pending</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>${(summary.pendingAmount / 100).toFixed(2)}</div>
          </div>
          <div className="card glass" style={{ border: '2px solid var(--primary)' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Available for Payout</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>${(summary.available / 100).toFixed(2)}</div>
          </div>
        </div>

        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wallet size={20} /> Payout History ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <DollarSign size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Payouts Yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Complete jobs to start earning. Request a payout when your available balance grows.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map(tx => {
              const sv = statusVariant(tx.status);
              const Icon = sv.icon;
              return (
                <div key={tx.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: sv.bg + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={sv.bg} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>${(tx.net_amount / 100).toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'} · Fee: ${(tx.fee / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge" style={{ background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>{tx.status}</span>
                    {tx.notes && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
