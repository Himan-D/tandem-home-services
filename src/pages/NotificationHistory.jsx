import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, Mail, Smartphone, RefreshCw, ArrowLeft, Inbox, Trash2, BookOpen } from 'lucide-react';

const TYPE_LABELS = {
  email: { label: 'Email', color: '#3b82f6' },
  sms: { label: 'SMS', color: '#8b5cf6' },
  in_app: { label: 'In-App', color: '#ec4899' },
  both: { label: 'Email & SMS', color: '#05ac5f' },
};

export default function NotificationHistory() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async (pg) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: '30' });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`${API_BASE}/api/notifications?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
      }
    } catch {} finally { setLoading(false); }
  }, [typeFilter]);

  const loadUnread = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, { headers });
      if (res.ok) { const d = await res.json(); setUnreadCount(d.count); }
    } catch {}
  };

  useEffect(() => { load(1); loadUnread(); }, [load]);

  const markRead = async (id) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH', headers });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'POST', headers });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const formatTime = (ts) => {
    const d = new Date(ts + 'Z');
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="container" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => navigate(-1)} className="btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {unreadCount > 0 && (
            <button className="btn-outline" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
              <CheckCheck size={16} /> Mark All Read
            </button>
          )}
          <button className="btn-outline" onClick={() => load(page)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', 'email', 'sms', 'in_app', 'both'].map(t => (
          <button key={t} onClick={() => { setTypeFilter(t); }} className={typeFilter === t ? 'btn-primary' : 'btn-outline'}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <RefreshCw size={28} className="spinner" color="var(--primary)" />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Inbox size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map(n => {
              const typeInfo = TYPE_LABELS[n.type] || { label: n.type, color: '#6b7280' };
              return (
                <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                  className="card glass" style={{
                    padding: '1rem', cursor: 'pointer', transition: 'opacity 0.2s',
                    borderLeft: `4px solid ${n.read ? 'transparent' : typeInfo.color}`,
                    opacity: n.read ? 0.7 : 1,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: n.read ? 400 : 600, fontSize: '0.95rem' }}>{n.title}</span>
                        <span style={{
                          fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px',
                          background: typeInfo.color + '20', color: typeInfo.color, fontWeight: 500,
                        }}>{typeInfo.label}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{n.message}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => load(p)} className={p === page ? 'btn-primary' : 'btn-outline'}
                  style={{ padding: '0.3rem 0.75rem', minWidth: '36px' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {total} total notifications
          </p>
        </>
      )}
    </div>
  );
}
