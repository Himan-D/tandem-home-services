import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuth();
  const { on } = useSocket();

  const fetchNotifications = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotifications(data || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  useEffect(() => {
    const unsub = on('notification', (notif) => {
      setNotifications(prev => [{ id: Date.now(), title: notif.title, message: notif.message, read: 0, createdAt: new Date().toISOString() }, ...prev]);
    });
    return () => unsub();
  }, [on]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn-outline" 
        style={{ padding: '0.5rem', borderRadius: '50%', position: 'relative' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', top: -4, right: -4, 
            background: 'var(--danger)', color: 'white', 
            borderRadius: '50%', width: '18px', height: '18px', 
            fontSize: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="card glass animate-fade-up" style={{ position: 'absolute', top: '40px', right: 0, width: '320px', zIndex: 100, padding: '1rem' }}>
          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Notifications</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No new notifications.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => markAsRead(n.id)} style={{ cursor: 'pointer', opacity: n.read ? 0.6 : 1, padding: '0.5rem', background: n.read ? 'transparent' : 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
