import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

function ServiceCardSkeleton() {
  return (
    <div
      className="card glass"
      style={{
        minWidth: '280px',
        maxWidth: '280px',
        height: '220px',
        background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 'var(--radius-md)'
      }}
    />
  );
}

export default function RecommendedServices() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/recommendations/services`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching service recommendations:', err);
        setError(err.message);
        // Mock data for development
        setRecommendations([
          { serviceId: 'plumber', score: 0.94, reason: 'Popular in your area', title: 'Plumbing', basePrice: 89, image: '🔧' },
          { serviceId: 'electrician', score: 0.89, reason: 'Based on your history', title: 'Electrical', basePrice: 79, image: '⚡' },
          { serviceId: 'ac_repair', score: 0.85, reason: 'Seasonal trend', title: 'AC Repair', basePrice: 99, image: '❄️' },
          { serviceId: 'pest_control', score: 0.82, reason: 'Highly rated', title: 'Pest Control', basePrice: 69, image: '🐛' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="container" style={{ padding: '2rem 0' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} color="var(--primary)" />
            Recommended for You
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Personalized suggestions based on your location and preferences</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {[1, 2, 3, 4].map(i => <ServiceCardSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  if (error && recommendations.length === 0) {
    return null; // Don't show section if no recommendations available
  }

  const getReasonIcon = (reason) => {
    if (reason.toLowerCase().includes('area')) return <MapPin size={16} />;
    if (reason.toLowerCase().includes('history')) return <Clock size={16} />;
    if (reason.toLowerCase().includes('trend')) return <TrendingUp size={16} />;
    return <Sparkles size={16} />;
  };

  const getMatchScoreColor = (score) => {
    if (score >= 0.9) return '#10b981'; // green
    if (score >= 0.8) return '#3b82f6'; // blue
    return '#8b5cf6'; // purple
  };

  return (
    <section className="container" style={{ padding: '2rem 0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={24} color="var(--primary)" />
          Recommended for You
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Personalized suggestions based on your location and preferences</p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent'
        }}
        className="recommendations-scroll"
      >
        {recommendations.map((service, index) => (
          <div
            key={service.serviceId}
            className="card glass hover-lift animate-fade-up"
            style={{
              minWidth: '280px',
              maxWidth: '280px',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              animationDelay: `${index * 0.1}s`,
              border: service.score >= 0.9 ? `2px solid ${getMatchScoreColor(service.score)}` : '1px solid var(--border)',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Match Score Badge */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
            >
              {Math.round(service.score * 100)}% match
            </div>

            {/* Service Image/Icon */}
            <div
              style={{
                fontSize: '2.5rem',
                marginBottom: '1rem',
                background: 'var(--primary-bg)',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {service.image || '🏠'}
            </div>

            {/* Service Title */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              {service.title}
            </h3>

            {/* Recommendation Reason */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem'
              }}
            >
              {getReasonIcon(service.reason)}
              <span>{service.reason}</span>
            </div>

            {/* Price and CTA */}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>From </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ${service.basePrice}
                  </span>
                </div>
              </div>

              <Link
                to={`/service/${service.serviceId}`}
                className="btn-primary"
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  width: '100%',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Book <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .recommendations-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .recommendations-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .recommendations-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        .recommendations-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </section>
  );
}
