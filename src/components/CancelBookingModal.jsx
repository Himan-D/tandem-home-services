import { useState } from 'react';
import { AlertTriangle, X, Loader } from 'lucide-react';

export default function CancelBookingModal({ booking, onCancel, onConfirm }) {
  const [reason, setReason] = useState('Schedule Conflict');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const cancellationReasons = [
    'Schedule Conflict',
    'No Longer Needed',
    'Found Alternative Service',
    'Cost Concerns',
    'Service Quality Issues',
    'Communication Issues',
    'Other'
  ];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({ reason, comments });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card glass animate-fade-up" style={{
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid var(--danger)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', margin: 0 }}>
            <AlertTriangle size={24} /> Cancel Booking
          </h3>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'inherit' }}
          >
            <X size={20} />
          </button>
        </div>

        {booking && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{booking.serviceTitle || 'Service'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {booking.location} • {booking.time}
            </div>
            {booking.payout && (
              <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                Total: ${Math.floor(booking.payout / 0.75).toFixed(2)}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,193,7,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,193,7,0.3)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="var(--warning)" /> Cancellation Policy
          </div>
          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>Cancellations made more than 24 hours before service: Full refund</li>
            <li>Cancellations made within 24 hours: 50% refund</li>
            <li>Cancellations made within 2 hours: No refund</li>
          </ul>
        </div>

        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
          Reason for Cancellation <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <select
          style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
        >
          {cancellationReasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
          Additional Comments (Optional)
        </label>
        <textarea
          placeholder="Please provide any additional details about your cancellation..."
          style={{ width: '100%', marginBottom: '1rem', minHeight: '80px', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={loading}
        />

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            className="btn-outline"
            onClick={onCancel}
            disabled={loading}
            style={{ minWidth: '100px' }}
          >
            Go Back
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              minWidth: '100px',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center'
            }}
          >
            {loading ? (
              <>
                <Loader size={16} className="spinner" /> Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}