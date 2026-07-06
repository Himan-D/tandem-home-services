import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useData } from '../context/DataContext';
import { ChevronLeft, Star, Shield, Clock, Check, Plus, ChevronRight } from 'lucide-react';

// Mock sub-services for each category to simulate a robust listing
const subServicesMock = {
  cleaning: [
    { id: 'c1', title: 'Deep Home Cleaning', price: 129, time: '3-4 hrs', rating: 4.8, reviews: 2100, desc: 'Intensive cleaning for every corner of your home.' },
    { id: 'c2', title: 'Bathroom Cleaning', price: 49, time: '1 hr', rating: 4.9, reviews: 340, desc: 'Deep stain removal and sanitization of toilets and tubs.' },
    { id: 'c3', title: 'Sofa Cleaning', price: 69, time: '1-2 hrs', rating: 4.7, reviews: 890, desc: 'Shampooing and deep vacuuming of your couch.' }
  ],
  plumber: [
    { id: 'p1', title: 'Tap & Sink Repair', price: 59, time: '1 hr', rating: 4.8, reviews: 1200, desc: 'Fix leaking taps or blocked sinks.' },
    { id: 'p2', title: 'Toilet Repair', price: 89, time: '1.5 hrs', rating: 4.9, reviews: 800, desc: 'Fix flush issues or leaks.' }
  ],
  electrician: [
    { id: 'e1', title: 'Switch & Socket Repair', price: 49, time: '45 mins', rating: 4.8, reviews: 1500, desc: 'Fix or replace faulty switches.' },
    { id: 'e2', title: 'Fan Installation', price: 79, time: '1 hr', rating: 4.7, reviews: 400, desc: 'Ceiling or exhaust fan installation.' }
  ]
};

export default function ServiceDetails() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const ssrData = useData();
  const ssrService = ssrData?.service?.id === serviceId ? ssrData.service : null;
  const [service, setService] = useState(ssrService);
  const [cart, setCart] = useState([]);
  const [reviewsData, setReviewsData] = useState({ average: null, count: 0, reviews: [] });

  useEffect(() => {
    const hasData = ssrService && !ssrService._fetchedReviews;
    if (!hasData) {
      fetch(`${API_BASE}/api/services`)
        .then(res => res.json())
        .then(data => {
          const found = data.find(s => s.id === serviceId);
          setService(found);
        });
    }
    fetch(`${API_BASE}/api/services/${serviceId}/reviews?limit=10`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setReviewsData(data); })
      .catch(() => {});
  }, [serviceId]);

  // Use mapped subservices, or a generic fallback if not in the mock list
  const subServices = subServicesMock[serviceId] || [
    { id: 'g1', title: `Standard ${service?.title || 'Service'}`, price: service?.basePrice || 99, time: '1-2 hrs', rating: 4.8, reviews: 120, desc: 'Standard service including inspection and labor.' },
    { id: 'g2', title: `Premium ${service?.title || 'Service'}`, price: (service?.basePrice || 99) + 50, time: '2-3 hrs', rating: 4.9, reviews: 85, desc: 'Comprehensive premium service with extended warranty.' }
  ];

  const handleAdd = (item) => {
    if (!cart.find(c => c.id === item.id)) {
      setCart([...cart, item]);
    }
  };

  const handleRemove = (itemId) => {
    setCart(cart.filter(c => c.id !== itemId));
  };

  const totalCart = cart.reduce((sum, item) => sum + item.price, 0);

  if (!service) return (
    <div className="container" style={{ padding: '6rem 0' }}>
      <Helmet>
        <title>Service Details | Tandem</title>
        <meta name="description" content="Book professional home services on demand." />
      </Helmet>
      Loading...
    </div>
  );

  const serviceTitle = service.title || serviceId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const serviceDesc = `Book professional ${serviceTitle.toLowerCase()} services on demand. Transparent pricing, vetted professionals, instant booking.`;

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh', paddingBottom: '100px' }}>
      <Helmet>
        <title>{serviceTitle} | Tandem</title>
        <meta name="description" content={serviceDesc} />
        <meta property="og:title" content={`${serviceTitle} | Tandem`} />
        <meta property="og:description" content={serviceDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://tandem.com/service/${serviceId}`} />
        <meta property="og:image" content="https://tandem.com/og-image.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${serviceTitle} | Tandem`} />
        <meta property="twitter:description" content={serviceDesc} />
        <link rel="canonical" href={`https://tandem.com/service/${serviceId}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": serviceTitle,
          "provider": { "@type": "Organization", "name": "Tandem" },
          "description": serviceDesc,
          "offers": { "@type": "Offer", "price": service.basePrice, "priceCurrency": "USD" },
          "areaServed": ["New York", "Los Angeles", "Chicago"]
        })}</script>
      </Helmet>
      {/* Header Banner */}
      <div style={{ background: 'var(--text-main)', color: 'white', padding: '6rem 0 3rem' }}>
        <div className="container">
          <Link to="/" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2rem', textDecoration: 'none' }}>
            <ChevronLeft size={16} /> Back to Home
          </Link>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>{service.title}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star size={16} color="var(--primary)" fill="var(--primary)" />
              {reviewsData.average ? `${reviewsData.average} (${reviewsData.count} review${reviewsData.count === 1 ? '' : 's'})` : 'New service'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Shield size={16} /> Tandem Guarantee</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '3rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Sub Services */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Select a Service</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {subServices.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <div key={item.id} className="card glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '70%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}><Star size={14} fill="var(--primary)" /> {item.rating} ({item.reviews})</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {item.time}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{item.desc}</p>
                    <div style={{ marginTop: '1rem', fontWeight: 700, fontSize: '1.125rem' }}>${item.price}</div>
                  </div>
                  
                  <div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-bg)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                        <Check size={18} /> Added
                        <button onClick={() => handleRemove(item.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', marginLeft: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAdd(item)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                        <Plus size={18} /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Desktop Cart summary (Optional) */}
        <div className="desktop-only card glass" style={{ width: '350px', position: 'sticky', top: '100px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Tandem Promise</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><Shield size={20} color="var(--success)" style={{ flexShrink: 0 }} /> Verified professionals</li>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><Check size={20} color="var(--success)" style={{ flexShrink: 0 }} /> Hassle-free booking</li>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><Star size={20} color="var(--success)" style={{ flexShrink: 0 }} /> High quality service</li>
          </ul>
        </div>
      </div>

      {/* Reviews */}
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={22} color="var(--primary)" fill="var(--primary)" /> Customer Reviews
          {reviewsData.average && (
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {reviewsData.average} avg · {reviewsData.count} total
            </span>
          )}
        </h2>
        {reviewsData.reviews.length === 0 ? (
          <div className="card glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No reviews yet. Be the first to book and review this service!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviewsData.reviews.map((r) => (
              <div key={r.id} className="card glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{r.customerName}</div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} color="var(--warning)" fill={s <= r.rating ? 'var(--warning)' : 'none'} />
                    ))}
                  </div>
                </div>
                {r.review && <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{r.review}</p>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--text-main)', color: 'white', padding: '1rem', zIndex: 50, animation: 'fade-up 0.3s ease-out' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>${totalCart}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{cart.length} service{cart.length > 1 ? 's' : ''} added</div>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => navigate(`/book/${serviceId}`, { state: { cart, totalCart } })} 
              style={{ padding: '0.75rem 2rem', fontSize: '1.125rem' }}
            >
              Continue <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
