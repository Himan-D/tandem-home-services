import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  if (location.pathname.includes('/partner') || location.pathname.includes('/admin') || location.pathname.includes('/login')) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar glass" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>
            <span style={{ color: 'var(--primary)' }}>Tandem</span>
          </Link>
          
          <div className="desktop-only" style={{ display: 'flex', gap: '2rem', alignItems: 'center', height: '100%' }}>
            <Link to="/#why-us" style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text-main)' }}>Why us</Link>
            
            <Link to="/#services" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontWeight: 500, fontSize: '0.9375rem' }}>
              Services <ChevronDown size={16} />
            </Link>

            <Link to="/page/cities" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontWeight: 500, fontSize: '0.9375rem' }}>
              Cities <ChevronDown size={16} />
            </Link>

            <Link to="/#how-it-works" style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text-main)' }}>How it works</Link>
          </div>

          <div className="desktop-only" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user ? (
              <>
                <NotificationBell />
                {!user.isPlusMember && user.role === 'consumer' && (
                  <Link to="/plus" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontWeight: 600 }}>
                    <Sparkles size={16} /> Tandem Plus
                  </Link>
                )}
                <Link to={user.role === 'consumer' ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <User size={18} /> {user.name}
                </Link>
                {user.role === 'admin' && <Link to="/admin" className="btn-outline">Admin Portal</Link>}
                {user.role === 'partner' && <Link to="/partner" className="btn-outline">Partner Portal</Link>}
                <button onClick={handleLogout} className="btn-outline">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Login</Link>
                <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Become a Pro</Link>
              </>
            )}
          </div>

          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', top: '76px', left: 0, right: 0, bottom: 0, background: 'var(--bg-main)', zIndex: 40, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {user ? (
            <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          ) : null}

          <Link to="/" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.25rem', fontWeight: 500 }}>Home</Link>
          <Link to="/#services" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.25rem', fontWeight: 500 }}>Services</Link>
          <Link to="/#how-it-works" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.25rem', fontWeight: 500 }}>How it works</Link>
          <Link to="/page/faqs" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.25rem', fontWeight: 500 }}>FAQs</Link>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {user ? (
              <>
                {user.role === 'admin' && <Link to="/admin" className="btn-primary" style={{ justifyContent: 'center' }}>Admin Portal</Link>}
                {user.role === 'partner' && <Link to="/partner" className="btn-primary" style={{ justifyContent: 'center' }}>Partner Portal</Link>}
                <button onClick={handleLogout} className="btn-outline" style={{ justifyContent: 'center' }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline" style={{ justifyContent: 'center' }}>Login</Link>
                <Link to="/login" className="btn-primary" style={{ justifyContent: 'center' }}>Become a Pro</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
