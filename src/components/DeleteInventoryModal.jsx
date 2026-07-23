import { AlertTriangle, Package, X } from 'lucide-react';

export default function DeleteInventoryModal({ isOpen, onClose, onConfirm, item, isLoading }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card glass animate-fade-up" style={{ width: '90%', maxWidth: '450px', padding: '2rem', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={24} color="var(--danger)" />
            Delete Inventory Item
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Warning: This action cannot be undone
          </p>
          <p style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: '1.4' }}>
            This will permanently remove this item from the inventory. If this item is currently in use or referenced by active orders, deletion may cause issues.
          </p>
        </div>

        {item && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={16} />
              Item to Delete
            </h4>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Service:</span>
                  <div style={{ fontWeight: 500 }}>{item.service_title || item.serviceId}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>SKU:</span>
                  <div style={{ fontWeight: 500 }}>{item.service_id}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Quantity:</span>
                  <div style={{ fontWeight: 500 }}>{item.quantity}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Min Threshold:</span>
                  <div style={{ fontWeight: 500 }}>{item.min_threshold}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn-outline"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Item'}
          </button>
        </div>
      </div>
    </div>
  );
}