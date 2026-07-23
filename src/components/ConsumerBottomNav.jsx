// Tandem Transition: Consumer Bottom Nav
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarClock, User, ShieldCheck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConsumerBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Only show bottom nav for logged in consumers on main pages
  if (!user || user.role !== 'consumer') return null;
  if (['/login', '/onboarding', '/admin', '/partner'].some(path => location.pathname.includes(path))) return null;
  
  // Hide on tracking or booking pages to avoid clutter
  if (location.pathname.includes('/book/') || location.pathname.includes('/track/')) return null;

  return (
    <nav className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-main)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0', zIndex: 100 }}>
      <Link to="/" className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: location.pathname === '/' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', gap: '0.25rem' }}>
        <Home size={24} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Home</span>
      </Link>
      
      <Link to="/consumer/orders" className={`bottom-nav-item ${location.pathname === '/consumer/orders' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: location.pathname === '/consumer/orders' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', gap: '0.25rem' }}>
        <Package size={24} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Orders</span>
      </Link>

      <Link to="/plus" className={`bottom-nav-item ${location.pathname === '/plus' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: location.pathname === '/plus' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', gap: '0.25rem' }}>
        <ShieldCheck size={24} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Plus</span>
      </Link>

      <Link to="/account" className={`bottom-nav-item ${location.pathname === '/account' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: location.pathname === '/account' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', gap: '0.25rem' }}>
        <User size={24} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Account</span>
      </Link>
    </nav>
  );
}
