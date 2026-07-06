import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Sparkles, Clock, CheckCircle, ChevronRight, Home, Wrench, Droplet, Zap, Bug, Scissors, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { API_BASE } from '../config';
import PriceEstimator from '../components/PriceEstimator';

function LoadingSkeleton() {
  return (
    <div className="grid-3" style={{ gap: '2rem', padding: '4rem 0' }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="card glass" style={{ height: '220px', background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      ))}
    </div>
  );
}

export default function ConsumerHome() {
  const { user } = useAuth();
  const ssrData = useData();
  const [services, setServices] = useState(() => ssrData?.services || []);
  const [loading, setLoading] = useState(() => !ssrData?.services);
  const navigate = useNavigate();

  useEffect(() => {
    if (ssrData?.services) return;
    fetch(`${API_BASE}/api/services`)
      .then(res => res.json())
      .then(data => { setServices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getIconForService = (id) => {
    switch(id) {
      case 'plumber': return <Droplet size={32} color="var(--primary)" />;
      case 'electrician': return <Zap size={32} color="var(--primary)" />;
      case 'ac_repair': return <Wrench size={32} color="var(--primary)" />;
      case 'pest_control': return <Bug size={32} color="var(--primary)" />;
      case 'painting': return <Scissors size={32} color="var(--primary)" />;
      case 'handyman': return <Wrench size={32} color="var(--primary)" />;
      default: return <Home size={32} color="var(--primary)" />;
    }
  };

  return (
    <div>
      <Helmet>
        <title>Tandem | On-Demand Home Services</title>
        <meta name="description" content="Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more. Transparent pricing, instant booking." />
        <meta property="og:title" content="Tandem | On-Demand Home Services" />
        <meta property="og:description" content="Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tandem.com" />
        <meta property="og:image" content="https://tandem.com/og-image.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Tandem | On-Demand Home Services" />
        <meta property="twitter:description" content="Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more." />
        <link rel="canonical" href="https://tandem.com" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Tandem",
          "url": "https://tandem.com",
          "description": "On-demand home services marketplace",
          "areaServed": ["New York", "Los Angeles", "Chicago"],
          "serviceType": ["Cleaning", "Plumbing", "Electrical", "Pest Control", "Painting", "Handyman"]
        })}</script>
      </Helmet>
      {/* Hero Section */}
      <section id="why-us" className="hero" style={{ background: 'linear-gradient(135deg, var(--bg-body) 0%, var(--primary-bg) 100%)', padding: '6rem 0 4rem', textAlign: 'center' }}>
        <div className="container">
          <div className="badge active" style={{ display: 'inline-flex', marginBottom: '1.5rem', background: 'white', border: '1px solid var(--border)' }}>
            <Sparkles size={16} /> Now available in New York, LA & Chicago
          </div>
          <h1 className="animate-fade-up" style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            {user ? (
              <>Welcome back,<br /><span style={{ color: 'var(--primary)' }}>{user.name.split(' ')[0]}</span></>
            ) : (
              <>Home services,<br /><span style={{ color: 'var(--primary)' }}>done right.</span></>
            )}
          </h1>
          <p className="animate-fade-up" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more. Transparent pricing, instant booking.
          </p>
          <div className="animate-fade-up" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#services" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>Book a Service</a>
            {!user && <Link to="/login" className="btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem', background: 'white' }}>Become a Pro</Link>}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="container" style={{ padding: '4rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem' }}>What do you need help with?</h2>
        
        {loading ? <LoadingSkeleton /> : (
        <div className="grid-3" style={{ gap: '2rem' }}>
          {services.map(service => (
            <div key={service.id} onClick={() => navigate(`/service/${service.id}`)} className="card glass hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', background: 'var(--primary-bg)', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIconForService(service.id)}
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>{service.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>Professional {service.title.toLowerCase()} by vetted experts. Satisfaction guaranteed.</p>
              
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>From ${service.basePrice}</span>
                  <Link to={`/service/${service.id}`} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>View Details <ChevronRight size={16} /></Link>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <PriceEstimator serviceId={service.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* How it Works / Trust */}
      <section id="how-it-works" style={{ background: 'var(--bg-card)', padding: '6rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '4rem', fontSize: '2.5rem' }}>Why choose Tandem?</h2>
          <div className="grid-3">
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Shield size={40} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Vetted Professionals</h3>
              <p style={{ color: 'var(--text-muted)' }}>Every Pro on our platform goes through a strict background check and skills verification process.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <CheckCircle size={40} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Transparent Pricing</h3>
              <p style={{ color: 'var(--text-muted)' }}>See the price before you book. No hidden fees, no surprises. Pay securely online.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Clock size={40} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Instant Booking</h3>
              <p style={{ color: 'var(--text-muted)' }}>Pick a time that works for you, and we'll instantly confirm your appointment with a local Pro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fat Footer */}
      <footer style={{ background: 'var(--text-main)', color: 'white', padding: '4rem 0 2rem' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Tandem</h3>
              <p style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
                Your trusted partner for home services. Book cleaning, repairs, and maintenance instantly.
              </p>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li><Link to="/page/about-us" style={{ color: '#a1a1aa', textDecoration: 'none' }}>About Us</Link></li>
                <li><Link to="/page/careers" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Careers</Link></li>
                <li><Link to="/page/blog" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Blog</Link></li>
                <li><Link to="/page/contact" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>For Customers</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li><a href="#how-it-works" style={{ color: '#a1a1aa', textDecoration: 'none' }}>How it works</a></li>
                <li><Link to="/page/safety" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Safety</Link></li>
                <li><Link to="/page/help-center" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Help Center</Link></li>
                <li><Link to="/page/anti-discrimination" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Anti-Discrimination</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>For Pros</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li><Link to="/login" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Become a Pro</Link></li>
                <li><Link to="/page/pro-requirements" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Pro Requirements</Link></li>
                <li><Link to="/page/pro-help-center" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Pro Help Center</Link></li>
              </ul>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #3f3f46', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#a1a1aa', fontSize: '0.875rem' }}>
            <div>&copy; 2026 Tandem Services Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link to="/page/privacy" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Privacy</Link>
              <Link to="/page/terms" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Terms</Link>
              <Link to="/page/sitemap" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
