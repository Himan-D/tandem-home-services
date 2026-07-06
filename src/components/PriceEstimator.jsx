import { useState } from 'react';
import { API_BASE } from '../config';
import { DollarSign, Loader, TrendingUp, Zap } from 'lucide-react';

export default function PriceEstimator({ serviceId, onEstimate }) {
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');

  const getEstimate = async () => {
    if (!serviceId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ml/estimate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setEstimate(data);
        onEstimate?.(data);
      } else setError('Could not estimate');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const surge = estimate?.surgeStatus;
  const showSurge = surge?.surge;

  return (
    <div>
      <button onClick={getEstimate} disabled={loading} className="btn-outline"
        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
        {loading ? <Loader size={16} className="spinner" /> : <DollarSign size={16} />}
        {estimate ? 'Refresh Estimate' : 'Get Price Estimate'}
      </button>

      {showSurge && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
          <Zap size={14} />
          Surge pricing active ({surge.severity} demand)
        </div>
      )}

      {estimate && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#d1fae5', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <TrendingUp size={16} style={{ color: '#065f46' }} />
            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#065f46' }}>ML-Powered Estimate</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#065f46' }}>
            ${estimate.finalPrice}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#065f46' }}>
            Base: ${estimate.basePrice} × {estimate.multiplier}x multiplier
          </div>
          <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '0.2rem', display: 'flex', gap: '0.5rem' }}>
            <span>Demand: {Math.round(estimate.demandScore * 100)}%</span>
            <span>Supply: {Math.round(estimate.supplyScore * 100)}%</span>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  );
}
