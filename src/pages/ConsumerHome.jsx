import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Sparkles, Clock, CheckCircle, ChevronRight, Home, Wrench, Droplet, Zap, Bug, Scissors, DollarSign, Star, Quote } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { API_BASE } from '../config';
import PriceEstimator from '../components/PriceEstimator';
import ServiceCard from '../components/ServiceCard';
import CategoryGrid from '../components/CategoryGrid';
import SearchBar from '../components/SearchBar';

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
  const [filteredServices, setFilteredServices] = useState(() => ssrData?.services || []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(() => !ssrData?.services);
  const navigate = useNavigate();

  useEffect(() => {
    if (ssrData?.services) return;
    fetch(`${API_BASE}/api/services`)
      .then(res => res.json())
      .then(data => { setServices(data); setFilteredServices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Filter services based on category and search term
  useEffect(() => {
    let filtered = services;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => {
        const categoryMap = {
          'home_cleaning': ['cleaning', 'maid', 'home cleaning'],
          'salon_beauty': ['salon', 'beauty', 'hair', 'spa'],
          'deep_cleaning': ['deep cleaning', 'deep clean'],
          'repairs_maintenance': ['plumber', 'electrician', 'repair', 'maintenance', 'handyman'],
          'painting': ['painting', 'painter'],
          'car_spa': ['car', 'auto', 'vehicle'],
          'appliance_repair': ['appliance', 'refrigerator', 'washing machine', 'ac'],
          'packers_movers': ['packers', 'movers', 'moving', 'relocation']
        };

        const categoryKeywords = categoryMap[selectedCategory] || [];
        return categoryKeywords.some(keyword =>
          service.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          service.category?.toLowerCase().includes(keyword.toLowerCase()) ||
          service.id?.toLowerCase().includes(keyword.toLowerCase())
        );
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  }, [selectedCategory, searchTerm, services]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleServiceSelect = (service) => {
    navigate(`/service/${service.id}`);
  };

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
      <section id="why-us" className="hero" style={{ background: 'linear-gradient(135deg, var(--bg-body) 0%, var(--primary-bg) 100%)', padding: '4rem 0 3rem', textAlign: 'center' }}>
        <div className="container">
          <div className="badge active" style={{ display: 'inline-flex', marginBottom: '1.5rem', background: 'white', border: '1px solid var(--border)' }}>
            <Sparkles size={16} /> Now available in New York, LA & Chicago
          </div>
          <h1 className="animate-fade-up" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            {user ? (
              <>Welcome back,<br /><span style={{ color: 'var(--primary)' }}>{user.name.split(' ')[0]}</span></>
            ) : (
              <>Quality Home Services<br /><span style={{ color: 'var(--primary)' }}>at Your Doorstep</span></>
            )}
          </h1>
          <p className="animate-fade-up" style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more. Transparent pricing, instant booking.
          </p>

          {/* Search Bar */}
          <div style={{ marginBottom: '2rem' }}>
            <SearchBar
              services={services}
              onSearch={handleSearch}
              onServiceSelect={handleServiceSelect}
            />
          </div>

          <div className="animate-fade-up" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#services" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>Browse Services</a>
            {!user && <Link to="/login" className="btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem', background: 'white' }}>Become a Pro</Link>}
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="container" style={{ padding: '3rem 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>What do you need help with?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Choose a category to find the right service</p>
        </div>
        <CategoryGrid
          onCategoryChange={handleCategoryChange}
          selectedCategory={selectedCategory}
        />
      </section>

      {/* Services Grid */}
      <section id="services" className="container" style={{ padding: '3rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {selectedCategory === 'all' ? 'All Services' : `${selectedCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Services`}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} available
            </p>
          </div>
          {(selectedCategory !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchTerm('');
              }}
              className="btn-outline"
              style={{ padding: '0.5rem 1rem' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No services found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {searchTerm ? `Try adjusting your search for "${searchTerm}"` : 'Try selecting a different category'}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchTerm('');
              }}
              className="btn-primary"
            >
              View All Services
            </button>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: '1.5rem' }}>
            {filteredServices.map(service => {
              // Add category and icon to service object if not present
              const serviceWithExtras = {
                ...service,
                category: service.category || 'Home Services',
                icon: getIconForService(service.id)
              };

              return (
                <ServiceCard
                  key={service.id}
                  service={serviceWithExtras}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* How it Works / Trust */}
      <section id="how-it-works" style={{ background: 'var(--bg-card)', padding: '5rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem' }}>How it works</h2>
          <div className="grid-4" style={{ gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700 }}>1</div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Choose a Service</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Browse our categories and select the service you need</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700 }}>2</div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Pick a Time</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Choose your preferred date and time slot</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700 }}>3</div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Get Matched</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>We connect you with a verified professional</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700 }}>4</div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Sit Back & Relax</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Your pro arrives and gets the job done</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '5rem 0', background: 'linear-gradient(135deg, var(--primary-bg) 0%, transparent 100%)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>What our customers say</h2>
            <p style={{ color: 'var(--text-muted)' }}>Join thousands of satisfied customers</p>
          </div>

          <div className="grid-3" style={{ gap: '2rem' }}>
            {[
              {
                name: 'Sarah Johnson',
                service: 'Home Cleaning',
                text: 'The cleaner was professional, thorough, and left my home spotless. Will definitely book again!',
                rating: 5
              },
              {
                name: 'Michael Chen',
                service: 'Plumbing Repair',
                text: 'Quick response time and fair pricing. The plumber fixed my leaky faucet in under 30 minutes.',
                rating: 5
              },
              {
                name: 'Emily Rodriguez',
                service: 'Salon Services',
                text: 'Amazing salon experience at home. The stylist was talented and really understood what I wanted.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="card glass"
                style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '12px',
                  position: 'relative'
                }}
              >
                <Quote size={32} color="var(--primary)" style={{ opacity: 0.2, marginBottom: '1rem' }} />

                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} color="#f59e0b" fill="#f59e0b" />
                  ))}
                </div>

                <p style={{ fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  "{testimonial.text}"
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--primary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{testimonial.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{testimonial.service}</div>
                  </div>
                </div>
              </div>
            ))}
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
