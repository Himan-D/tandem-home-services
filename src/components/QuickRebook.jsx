import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import { RotateCcw, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function QuickRebook({ bookingId, serviceId }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle');

  const rebook = async () => {
    setLoading(true); setStatus('idle');
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/rebook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setTimeout(() => navigate(`/booking-status/${data.id}`), 800);
      } else setStatus('error');
    } catch { setStatus('error'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={rebook} disabled={loading} className="btn-primary"
      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
      {loading ? <Loader size={14} className="spinner" /> : status === 'success' ? <CheckCircle size={14} /> : status === 'error' ? <AlertCircle size={14} /> : <RotateCcw size={14} />}
      {loading ? 'Rebooking...' : status === 'success' ? 'Rebooked!' : status === 'error' ? 'Failed' : 'Rebook'}
    </button>
  );
}
