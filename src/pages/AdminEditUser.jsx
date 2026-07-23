import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  Users, Building2, Mail, Phone, MapPin, Shield, Briefcase, RefreshCw,
  LogOut, Tag, Warehouse, Loader, Save, UserCheck, UserX, ArrowLeft,
  Check, X, Calendar, Star, Wallet, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminEditUser() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    status: 'active',
    role: 'customer',
    isPlusMember: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleLogout = () => { logout(); navigate('/'); };

  const fetchUser = async () => {
    setLoading(true);
    try {
      // Try both customers and partners endpoints
      let res = await fetch(`${API_BASE}/api/admin/customers`, { headers });
      let customers = [];
      if (res.ok) customers = await res.json();

      res = await fetch(`${API_BASE}/api/admin/partners`, { headers });
      let partners = [];
      if (res.ok) partners = await res.json();

      const allUsers = [
        ...customers.map(c => ({ ...c, userType: 'customer' })),
        ...partners.map(p => ({ ...p, userType: 'partner' }))
      ];

      const foundUser = allUsers.find(u => u.id === parseInt(id));

      if (!foundUser) {
        throw new Error('User not found');
      }

      setUser(foundUser);
      setFormData({
        name: foundUser.name || '',
        email: foundUser.email || '',
        phone: foundUser.phone || '',
        location: foundUser.location || '',
        status: foundUser.status || 'active',
        role: foundUser.userType,
        isPlusMember: foundUser.isPlusMember === 1 || foundUser.isPlusMember === true
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const endpoint = formData.role === 'partner'
        ? `/api/admin/partners/${id}`
        : `/api/admin/users/${id}`;

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location || null,
        status: formData.status,
        isPlusMember: formData.isPlusMember ? 1 : 0
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = () => {
    const newStatus = formData.status === 'active' ? 'suspended' : 'active';
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
          </div>
          <nav className="sidebar-nav">
            <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
            <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
            <button onClick={() => navigate('/admin/users')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Shield size={20} /> User Management</button>
          </nav>
          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
          </div>
        </aside>
        <main className="main-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <RefreshCw size={32} className="spinner" color="var(--primary)" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
          </div>
          <nav className="sidebar-nav">
            <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
            <button onClick={() => navigate('/admin/users')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Shield size={20} /> User Management</button>
          </nav>
          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
          </div>
        </aside>
        <main className="main-content">
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Error</h2>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
            <button
              onClick={() => navigate('/admin/users')}
              className="btn-primary"
              style={{ marginTop: '1rem' }}
            >
              <ArrowLeft size={18} /> Back to User Management
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            <button
              onClick={() => navigate('/admin/users')}
              className="btn-outline"
              style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={18} /> Back to Users
            </button>
            <h2>Edit User</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Update user information and status</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {formData.role === 'partner' ? <Building2 size={24} color="var(--primary)" /> : <Users size={24} color="var(--primary)" />}
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formData.role === 'partner' ? 'Partner Account' : 'Customer Account'}</span>
          </div>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {saveSuccess && (
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <Check size={18} /> User updated successfully!
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Main Form */}
          <div className="card glass" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.5rem'
              }}>
                {user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user?.name || 'Unknown User'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ID: {user?.id}</div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={saving}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={saving}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={saving}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Account Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Account Status
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleStatusToggle}
                    className="btn-outline"
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: formData.status === 'active' ? 'var(--success)' : 'var(--danger)',
                      color: 'white',
                      borderColor: formData.status === 'active' ? 'var(--success)' : 'var(--danger)'
                    }}
                  >
                    {formData.status === 'active' ? (
                      <><UserCheck size={18} /> Active</>
                    ) : (
                      <><UserX size={18} /> Suspended</>
                    )}
                  </button>
                  <span className="badge" style={{
                    background: formData.status === 'active' ? 'var(--success)' : 'var(--danger)',
                    color: 'white',
                    padding: '0.5rem 1rem'
                  }}>
                    {formData.status === 'active' ? 'Can access platform' : 'Access restricted'}
                  </span>
                </div>
              </div>

              {/* Plus Member (Partners only) */}
              {formData.role === 'partner' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isPlusMember"
                      name="isPlusMember"
                      checked={formData.isPlusMember}
                      onChange={handleChange}
                      disabled={saving}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="isPlusMember" style={{ fontWeight: 600, cursor: 'pointer' }}>
                      Plus Member
                    </label>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Plus members get priority matching and higher visibility
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="btn-outline"
                  disabled={saving}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center'
                  }}
                >
                  {saving ? (
                    <>
                      <Loader size={18} className="spinner" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* User Stats Card */}
          <div className="card glass" style={{ gridColumn: '1', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
              <Settings size={18} /> Account Information
            </div>
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>User ID:</span>
                <span className="tabular-nums">{user?.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Type:</span>
                <span>{formData.role === 'partner' ? 'Partner' : 'Customer'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className="badge" style={{
                  background: formData.status === 'active' ? 'var(--success)' : 'var(--danger)',
                  color: 'white'
                }}>
                  {formData.status}
                </span>
              </div>
              {user?.createdAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Member Since:</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Stats Card */}
          <div className="card glass" style={{ gridColumn: '2', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
              <Star size={18} /> Activity Stats
            </div>
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {formData.role === 'partner' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rating:</span>
                    <span className="tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Star size={14} color="var(--primary)" /> {user?.ratingAvg || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Jobs Completed:</span>
                    <span className="tabular-nums">{user?.jobsCompleted || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Response Time:</span>
                    <span className="tabular-nums">{user?.responseTimeMins ? `${user.responseTimeMins}min` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Online Status:</span>
                    <span className="badge" style={{
                      background: user?.online ? 'var(--success)' : 'var(--border)',
                      color: user?.online ? 'white' : 'var(--text-muted)'
                    }}>
                      {user?.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Wallet Balance:</span>
                    <span className="tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wallet size={14} /> ${user?.wallet_balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Bookings:</span>
                    <span className="tabular-nums">{user?.total_bookings || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Plus Member:</span>
                    <span className="badge" style={{
                      background: user?.is_plus_member ? 'var(--primary)' : 'var(--border)',
                      color: user?.is_plus_member ? 'white' : 'var(--text-muted)'
                    }}>
                      {user?.is_plus_member ? 'Yes' : 'No'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}