import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  ClipboardList, RefreshCw, X, LogOut, Users, Briefcase, Tag, Warehouse,
  Plus, Edit2, Trash2, Eye, Filter, Search, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Calendar, MapPin, CreditCard, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending: '#f59e0b',
  inventory_validated: '#3b82f6',
  rider_assigned: '#8b5cf6',
  in_progress: '#3b82f6',
  picked_up: '#6366f1',
  completed: 'var(--success)',
  cancelled: '#6b7280',
};

export default function AdminOrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  // Modal and form state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    service: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Bulk selection
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesSearch = !searchTerm ||
      String(order.id).includes(searchTerm) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.serviceId && order.serviceId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDateFrom = !filters.dateFrom || new Date(order.createdAt) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(order.createdAt) <= new Date(filters.dateTo);

    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  // Pagination
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // View order details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  // Edit order
  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      amount: order.amount,
      location: order.location,
      notes: order.notes || ''
    });
    setShowEditModal(true);
  };

  // Save edited order
  const handleSaveEdit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update order');
      }

      setSuccess('Order updated successfully!');
      setShowEditModal(false);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete order
  const handleDeleteOrder = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/orders/${selectedOrder.id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error('Failed to delete order');

      setSuccess('Order deleted successfully!');
      setShowDeleteModal(false);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedOrders.length} orders?`)) return;

    setLoading(true);
    setError('');

    try {
      await Promise.all(
        selectedOrders.map(id =>
          fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE', headers })
        )
      );

      setSuccess(`${selectedOrders.length} orders deleted successfully!`);
      setSelectedOrders([]);
      setShowBulkActions(false);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to delete some orders');
    } finally {
      setLoading(false);
    }
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  // Toggle all orders on current page
  const toggleAllOrders = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map(o => o.id));
    }
  };

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
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders-management')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders Management</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Order Management</h2>
            <p style={{ color: 'var(--text-muted)' }}>Manage all customer orders</p>
          </div>
          <button
            onClick={() => navigate('/consumer/orders')}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={20} /> Create Order
          </button>
        </header>

        {/* Success Message */}
        {success && (
          <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
            <CheckCircle2 size={20} />
            {success}
            <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={20} />
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="card glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
              <Search size={20} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="inventory_validated">Inventory Validated</option>
              <option value="rider_assigned">Rider Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="picked_up">Picked Up</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
            />

            <button
              onClick={() => {
                setFilters({ status: '', dateFrom: '', dateTo: '', customer: '', service: '' });
                setSearchTerm('');
              }}
              style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Clear Filters
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedOrders.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {selectedOrders.length} orders selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <ClipboardList size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No Orders Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>No orders match your current filters</p>
          </div>
        ) : (
          <>
            <div className="card glass" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                        onChange={toggleAllOrders}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Order</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        #{String(order.id).padStart(5, '0')}
                      </td>
                      <td style={{ padding: '1rem' }}>{order.customer_name || '—'}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{order.serviceId || '—'}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.location || '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={{
                          background: STATUS_COLORS[order.status] || 'var(--border)',
                          color: 'white',
                          textTransform: 'capitalize',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem'
                        }}>
                          {order.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>${(order.amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleViewOrder(order)}
                            style={{ padding: '0.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: 'pointer' }}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEditOrder(order)}
                            style={{ padding: '0.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: 'pointer' }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDeleteModal(true);
                            }}
                            style={{ padding: '0.25rem', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card glass" style={{ padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Order Details</h3>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Order ID</label>
                  <div style={{ fontWeight: 600 }}>#{String(selectedOrder.id).padStart(5, '0')}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</label>
                  <div>
                    <span className="badge" style={{
                      background: STATUS_COLORS[selectedOrder.status] || 'var(--border)',
                      color: 'white',
                      textTransform: 'capitalize',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem'
                    }}>
                      {selectedOrder.status?.replace(/_/g, ' ') || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Customer</label>
                <div style={{ fontWeight: 600 }}>{selectedOrder.customer_name || 'N/A'}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Service</label>
                <div style={{ fontWeight: 600 }}>{selectedOrder.serviceId || 'N/A'}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Location</label>
                <div style={{ fontWeight: 600 }}>{selectedOrder.location || 'N/A'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Amount</label>
                  <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)' }}>
                    ${(selectedOrder.amount || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Created</label>
                  <div style={{ fontWeight: 600 }}>
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Notes</label>
                  <div style={{ fontWeight: 600 }}>{selectedOrder.notes}</div>
                </div>
              )}

              {selectedOrder.rider_name && (
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Assigned Partner</label>
                  <div style={{ fontWeight: 600 }}>{selectedOrder.rider_name}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditOrder(selectedOrder);
                }}
                style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Edit Order
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card glass" style={{ padding: '2rem', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Edit Order</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}
                >
                  <option value="pending">Pending</option>
                  <option value="inventory_validated">Inventory Validated</option>
                  <option value="rider_assigned">Rider Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Amount ($)</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Location</label>
                <textarea
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)', background: loading ? 'var(--border)' : 'var(--primary)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card glass" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Order?</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Are you sure you want to delete order #{String(selectedOrder.id).padStart(5, '0')}? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleDeleteOrder}
                disabled={loading}
                style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}