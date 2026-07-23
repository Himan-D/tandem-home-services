import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Warehouse, Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Package, LogOut, Users, Briefcase, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DeleteInventoryModal from '../components/DeleteInventoryModal';

export default function AdminDarkStores() {
  const [stores, setStores] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedStore, setExpandedStore] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryForm, setInventoryForm] = useState({ serviceId: '', quantity: '', minThreshold: '' });
  const [form, setForm] = useState({ name: '', location: '', lat: '', lng: '', isActive: 1 });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, storeId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dark-stores`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      setStores(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/services`);
      if (res.ok) setServices(await res.json());
    } catch {}
  };

  useEffect(() => { fetchStores(); fetchServices(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', location: '', lat: '', lng: '', isActive: 1 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, location: s.location || '', lat: String(s.lat), lng: String(s.lng), isActive: s.isActive ?? 1 });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = editing ? `${API_BASE}/api/dark-stores/${editing}` : `${API_BASE}/api/dark-stores`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowForm(false);
      setEditing(null);
      fetchStores();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this dark store?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/dark-stores/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
      fetchStores();
    } catch (e) { setError(e.message); }
  };

  const toggleInventory = async (storeId) => {
    if (expandedStore === storeId) {
      setExpandedStore(null);
      return;
    }
    setExpandedStore(storeId);
    try {
      const res = await fetch(`${API_BASE}/api/dark-stores/${storeId}/inventory`, { headers });
      if (res.ok) setInventory(await res.json());
    } catch {}
  };

  const handleInventorySubmit = async (storeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/dark-stores/${storeId}/inventory`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: inventoryForm.serviceId,
          quantity: parseInt(inventoryForm.quantity),
          minThreshold: inventoryForm.minThreshold ? parseInt(inventoryForm.minThreshold) : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setInventoryForm({ serviceId: '', quantity: '', minThreshold: '' });
      toggleInventory(storeId);
    } catch (e) { setError(e.message); }
  };

  const openDeleteModal = (item, storeId) => {
    setDeleteModal({ isOpen: true, item, storeId });
    setError('');
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, item: null, storeId: null });
  };

  const confirmDeleteInventory = async () => {
    if (!deleteModal.item || !deleteModal.storeId) return;

    setIsDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/dark-stores/${deleteModal.storeId}/inventory/${deleteModal.item.service_id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete inventory item');
      }

      // Refresh inventory list
      const inventoryRes = await fetch(`${API_BASE}/api/dark-stores/${deleteModal.storeId}/inventory`, { headers });
      if (inventoryRes.ok) {
        setInventory(await inventoryRes.json());
      }

      closeDeleteModal();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

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
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Warehouse size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Dark Stores / Fulfillment Centers</h2>
          <button className="btn-primary" onClick={openCreate}><Plus size={18} /> New Store</button>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {showForm && (
          <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Store' : 'New Store'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Address</label>
                  <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Latitude</label>
                  <input className="input" type="number" step="any" min="-90" max="90" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Longitude</label>
                  <input className="input" type="number" step="any" min="-180" max="180" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary"><Check size={18} /> {editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}><X size={18} /> Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : stores.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <Warehouse size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Dark Stores</h3>
            <p style={{ color: 'var(--text-muted)' }}>Add fulfillment centers to manage inventory by location.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stores.map(s => (
              <div key={s.id}>
                <div className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', cursor: 'pointer' }} onClick={() => toggleInventory(s.id)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {s.location || 'No address'} · ({s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}) · {s.active_skus ?? 0} SKUs
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="badge" style={{ background: s.isActive ? 'var(--success)' : 'var(--border)', color: s.isActive ? 'white' : 'var(--text-muted)' }}>{s.isActive ? 'Active' : 'Inactive'}</span>
                    <button className="btn-outline" style={{ padding: '0.4rem' }} onClick={(e) => { e.stopPropagation(); openEdit(s); }}><Edit2 size={16} /></button>
                    <button className="btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}><Trash2 size={16} /></button>
                  </div>
                </div>
                {expandedStore === s.id && (
                  <div className="card glass animate-fade-up" style={{ marginTop: '0.5rem', padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={18} /> Inventory</h4>
                    {inventory.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No inventory items. Add one below.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {inventory.map(item => (
                          <div key={`${item.dark_store_id}-${item.service_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontWeight: 500 }}>{item.service_title || item.serviceId}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ color: item.quantity <= item.min_threshold ? 'var(--danger)' : 'inherit' }}>
                                {item.quantity} / min {item.min_threshold}
                              </span>
                              <button
                                className="btn-outline"
                                style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.75rem' }}
                                onClick={() => openDeleteModal(item, s.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <h5 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Add Inventory Item</h5>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
                      <select className="input" value={inventoryForm.serviceId} onChange={e => setInventoryForm({ ...inventoryForm, serviceId: e.target.value })} style={{ flex: 1, minWidth: '150px' }}>
                        <option value="">Select service...</option>
                        {services.map(sv => <option key={sv.id} value={sv.id}>{sv.title}</option>)}
                      </select>
                      <input className="input" type="number" placeholder="Qty" min="0" value={inventoryForm.quantity} onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} style={{ width: '80px' }} />
                      <input className="input" type="number" placeholder="Min" min="0" value={inventoryForm.minThreshold} onChange={e => setInventoryForm({ ...inventoryForm, minThreshold: e.target.value })} style={{ width: '80px' }} />
                      <button className="btn-primary" onClick={() => handleInventorySubmit(s.id)} disabled={!inventoryForm.serviceId || !inventoryForm.quantity}><Plus size={18} /> Add</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <DeleteInventoryModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteInventory}
        item={deleteModal.item}
        isLoading={isDeleting}
      />
    </div>
  );
}
