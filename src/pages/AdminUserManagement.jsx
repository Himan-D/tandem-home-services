import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  Users, MapPin, Star, Briefcase, RefreshCw, X, LogOut, Tag, Warehouse,
  Search, Plus, Eye, Edit, Trash2, Shield, UserCheck, UserX, ChevronDown,
  Calendar, Mail, Phone, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DeleteUserModal from '../components/DeleteUserModal';

export default function AdminUserManagement() {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers`, { headers });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data.map(c => ({ ...c, userType: 'customer' })));
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/partners`, { headers });
      if (!res.ok) throw new Error('Failed to fetch partners');
      const data = await res.json();
      setPartners(data.map(p => ({ ...p, userType: 'partner' })));
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchCustomers(), fetchPartners()]);
    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const getFilteredUsers = () => {
    const users = activeTab === 'customers' ? customers : partners;
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query) ||
      user.location?.toLowerCase().includes(query)
    );
  };

  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleDeleteClick = (user) => {
    setShowDeleteModal(user);
  };

  const handleDeleteConfirm = async (userToDelete) => {
    setActionLoading(true);
    try {
      const endpoint = userToDelete.userType === 'customer'
        ? `/api/admin/users/${userToDelete.id}`
        : `/api/admin/partners/${userToDelete.id}`;

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error('Failed to delete user');

      if (userToDelete.userType === 'customer') {
        setCustomers(prev => prev.filter(c => c.id !== userToDelete.id));
      } else {
        setPartners(prev => prev.filter(p => p.id !== userToDelete.id));
      }

      setShowDeleteModal(null);
      setSelectedUsers(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    setActionLoading(true);
    try {
      const endpoint = user.userType === 'customer'
        ? `/api/admin/users/${user.id}`
        : `/api/admin/partners/${user.id}`;

      const newStatus = user.status === 'active' ? 'suspended' : 'active';

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update user status');

      const updatedUser = await res.json();

      if (user.userType === 'customer') {
        setCustomers(prev => prev.map(c => c.id === user.id ? { ...c, ...updatedUser } : c));
      } else {
        setPartners(prev => prev.map(p => p.id === user.id ? { ...p, ...updatedUser } : p));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    setActionLoading(true);
    try {
      const promises = Array.from(selectedUsers).map(userId => {
        const user = [...customers, ...partners].find(u => u.id === userId);
        if (!user) return Promise.resolve();

        if (action === 'delete') {
          const endpoint = user.userType === 'customer'
            ? `/api/admin/users/${userId}`
            : `/api/admin/partners/${userId}`;
          return fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers });
        } else if (action === 'activate' || action === 'suspend') {
          const endpoint = user.userType === 'customer'
            ? `/api/admin/users/${userId}`
            : `/api/admin/partners/${userId}`;
          return fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action === 'activate' ? 'active' : 'suspended' })
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      await fetchAllData();
      setSelectedUsers(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = getFilteredUsers();
  const allSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;

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
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Building2 size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/users')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Shield size={20} /> User Management</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Orders</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>User Management</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage customers and partners</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/admin/users/create')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> Create User
          </button>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => { setActiveTab('customers'); setSelectedUsers(new Set()); }}
            className="tab-button"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'customers' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'customers' ? 600 : 400,
              color: activeTab === 'customers' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Users size={18} /> Customers ({customers.length})
          </button>
          <button
            onClick={() => { setActiveTab('partners'); setSelectedUsers(new Set()); }}
            className="tab-button"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'partners' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'partners' ? 600 : 400,
              color: activeTab === 'partners' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building2 size={18} /> Partners ({partners.length})
          </button>
        </div>

        {/* Search and Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {selectedUsers.size > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {selectedUsers.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="btn-outline"
                disabled={actionLoading}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <UserCheck size={16} /> Activate
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                className="btn-outline"
                disabled={actionLoading}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <UserX size={16} /> Suspend
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="btn-primary"
                disabled={actionLoading}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: 'var(--danger)',
                  borderColor: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
            {activeTab === 'customers' ? <Users size={48} color="var(--text-muted)" /> : <Building2 size={48} color="var(--text-muted)" />}
            <h3>No {activeTab === 'customers' ? 'Customers' : 'Partners'}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'No results match your search.' : `No ${activeTab} found in the system.`}
            </p>
          </div>
        ) : (
          <div className="card glass" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '1rem' }}>User</th>
                  <th style={{ padding: '1rem' }}>Contact</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Stats</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {user.userType === 'partner' && <Briefcase size={12} />}
                            {user.userType === 'customer' && <Users size={12} />}
                            {user.userType === 'partner' && user.isPlusMember && (
                              <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.7rem' }}>Plus</span>
                            )}
                            {user.userType === 'partner' && user.online && (
                              <span className="badge" style={{ background: 'var(--success)', color: 'white', fontSize: '0.7rem' }}>Online</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          <Mail size={14} color="var(--text-muted)" /> {user.email || 'No email'}
                        </div>
                        {user.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <Phone size={14} color="var(--text-muted)" /> {user.phone}
                          </div>
                        )}
                        {user.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={14} color="var(--text-muted)" /> {user.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{
                        background: user.status === 'active' ? 'var(--success)' : 'var(--danger)',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}>
                        {user.status || 'active'}
                      </span>
                      {user.createdAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {user.userType === 'partner' && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Star size={14} color="var(--primary)" /> {user.ratingAvg || '—'} rating
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Briefcase size={14} /> {user.jobsCompleted || 0} jobs
                            </div>
                          </>
                        )}
                        {user.userType === 'customer' && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              💰 ${user.wallet_balance?.toFixed(2) || '0.00'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Briefcase size={14} /> {user.total_bookings || 0} bookings
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                          className="btn-outline"
                          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Edit user"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className="btn-outline"
                          disabled={actionLoading}
                          style={{
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: user.status === 'active' ? 'var(--warning)' : 'var(--success)'
                          }}
                          title={user.status === 'active' ? 'Suspend user' : 'Activate user'}
                        >
                          {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="btn-outline"
                          disabled={actionLoading}
                          style={{
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--danger)'
                          }}
                          title="Delete user"
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
        )}

        {showDeleteModal && (
          <DeleteUserModal
            user={showDeleteModal}
            onCancel={() => setShowDeleteModal(null)}
            onConfirm={handleDeleteConfirm}
            loading={actionLoading}
          />
        )}
      </main>
    </div>
  );
}