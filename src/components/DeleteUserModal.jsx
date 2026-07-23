import { useState } from 'react';
import { AlertTriangle, X, Loader, User, Trash2, Building2, Briefcase, Mail, Phone, Calendar } from 'lucide-react';

export default function DeleteUserModal({ user, onCancel, onConfirm, loading }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    await onConfirm(user);
  };

  const getCascadeWarning = () => {
    if (user.userType === 'partner') {
      return (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--danger)' }}>Cascade Deletion Warning:</div>
          <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)' }}>
            <li>All active jobs will be cancelled</li>
            <li>Earnings and payout history will be removed</li>
            <li>Schedule and shift data will be deleted</li>
            <li>Notifications history will be cleared</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--danger)' }}>Cascade Deletion Warning:</div>
        <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)' }}>
          <li>All bookings and service history will be removed</li>
          <li>Wallet balance and transactions will be deleted</li>
          <li>Addresses and favorites will be cleared</li>
          <li>Notifications history will be cleared</li>
          <li>This action cannot be undone</li>
        </ul>
      </div>
    );
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
            <AlertTriangle size={24} /> Delete {user?.userType === 'partner' ? 'Partner' : 'Customer'}
          </h3>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'inherit' }}
          >
            <X size={20} />
          </button>
        </div>

        {user && (
          <>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {user.name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.name || 'Unknown User'}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {user.userType === 'partner' ? <Building2 size={14} /> : <User size={14} />}
                    {user.userType === 'partner' ? 'Partner Account' : 'Customer Account'}
                    {user.isPlusMember && (
                      <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.7rem' }}>Plus</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} color="var(--text-muted)" />
                  {user.email || 'No email provided'}
                </div>
                {user.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    {user.phone}
                  </div>
                )}
                {user.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    {user.location}
                  </div>
                )}
                {user.createdAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Additional stats based on user type */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239,68,68,0.3)', fontSize: '0.85rem' }}>
                {user.userType === 'partner' ? (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span>⭐ {user.ratingAvg || '—'} avg rating</span>
                    <span>💼 {user.jobsCompleted || 0} jobs completed</span>
                    {user.online && <span className="badge" style={{ background: 'var(--success)', color: 'white', fontSize: '0.7rem' }}>Online</span>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span>💰 ${user.wallet_balance?.toFixed(2) || '0.00'} wallet</span>
                    <span>📦 {user.total_bookings || 0} total bookings</span>
                  </div>
                )}
              </div>
            </div>

            {getCascadeWarning()}

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,193,7,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,193,7,0.3)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} color="var(--warning)" /> Important Notice
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This will permanently delete this account and all associated data. Consider suspending the account instead if you just need to temporarily restrict access.
              </p>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="delete-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="delete-confirm" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                I understand this action cannot be undone
              </label>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            className="btn-outline"
            onClick={onCancel}
            disabled={loading}
            style={{ minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading || !confirmed}
            style={{
              minWidth: '120px',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center',
              opacity: confirmed ? 1 : 0.6,
              cursor: confirmed ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? (
              <>
                <Loader size={16} className="spinner" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} /> Delete Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}