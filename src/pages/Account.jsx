import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, CreditCard, Bell, LogOut, ChevronRight, Settings, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '6rem 1rem 5rem', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Account</h1>
      
      <div className="card glass animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{user.name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          <div className="badge active" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
            Wallet: ${(user.walletBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Preferences</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'space-between', padding: '1rem 1.5rem' }} onClick={() => navigate('/page/payment-methods')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><CreditCard size={20} /> Payment Methods</div>
              <ChevronRight size={16} />
            </button>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'space-between', padding: '1rem 1.5rem' }} onClick={() => navigate('/page/notifications')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Bell size={20} /> Notifications</div>
              <ChevronRight size={16} />
            </button>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'space-between', padding: '1rem 1.5rem' }} onClick={() => navigate('/page/security')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Shield size={20} /> Security</div>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Support & Settings</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'space-between', padding: '1rem 1.5rem' }} onClick={() => navigate('/page/help')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><HelpCircle size={20} /> Help Center</div>
              <ChevronRight size={16} />
            </button>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'space-between', padding: '1rem 1.5rem' }} onClick={() => navigate('/page/settings')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Settings size={20} /> App Settings</div>
              <ChevronRight size={16} />
            </button>
            <button className="sidebar-link" style={{ borderRadius: 0, justifyContent: 'flex-start', padding: '1rem 1.5rem', color: 'var(--danger)' }} onClick={handleLogout}>
              <LogOut size={20} /> Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
