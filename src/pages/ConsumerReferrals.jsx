import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Gift, Copy, CheckCircle, Users, DollarSign, Share2, AlertCircle, RefreshCw, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConsumerReferrals() {
  const [ref, setRef] = useState({ code: '', totalReferred: 0, totalEarned: 0 });
  const [claimCode, setClaimCode] = useState('');
  const [claimMsg, setClaimMsg] = useState('');
  const [claimError, setClaimError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/referrals/my-code`, { headers });
        if (res.ok) setRef(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(ref.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleClaim = async () => {
    setClaimError(''); setClaimMsg('');
    if (!claimCode.trim()) { setClaimError('Enter a referral code'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/referrals/claim`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaimMsg(data.message);
      setClaimCode('');
    } catch (e) { setClaimError(e.message); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><RefreshCw size={32} className="spinner" color="var(--primary)" /></div>;
  }

  return (
    <div className="container" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate('/account')} className="btn-outline" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="card glass" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Gift size={32} color="var(--primary)" />
        </div>
        <h2>Refer & Earn</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Share your code and earn <strong>$5.00</strong> for every friend who joins</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your friend gets <strong>$5.00</strong> too!</p>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Your Referral Code</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, padding: '0.75rem 1rem', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', color: 'var(--primary)' }}>
            {ref.code}
          </div>
          <button className="btn-primary" onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--primary)" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{ref.totalReferred}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Friends Referred</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
            <DollarSign size={20} color="var(--success)" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${(ref.totalEarned / 100).toFixed(2)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Earned</div>
          </div>
        </div>
        <button className="btn-outline" style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Join Tandem!', text: `Use my referral code ${ref.code} to get $5 off your first booking!` });
            } else {
              copyCode();
            }
          }}>
          <Share2 size={18} /> Share Invite Link
        </button>
      </div>

      <div className="card glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Have a referral code?</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Enter a friend's code to get $5.00 in credit</p>
        {claimMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
            <CheckCircle size={18} /> {claimMsg}
          </div>
        )}
        {claimError && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {claimError}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" style={{ fontFamily: 'monospace', textTransform: 'uppercase', flex: 1 }} value={claimCode} onChange={e => setClaimCode(e.target.value.toUpperCase())} placeholder="Enter code" />
          <button className="btn-primary" onClick={handleClaim}>Claim</button>
        </div>
      </div>
    </div>
  );
}
