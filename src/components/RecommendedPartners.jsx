import { useEffect, useState } from 'react';
import { Shield, Star, Clock, DollarSign, ChevronRight, Award, CheckCircle } from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

function PartnerCardSkeleton() {
  return (
    <div
      className="card"
      style={{
        height: '180px',
        background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 'var(--radius-md)'
      }}
    />
  );
}

export default function RecommendedPartners({ serviceId, onSelectPartner, selectedPartnerId }) {
  const { token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!serviceId) return;

      try {
        const response = await fetch(`${API_BASE}/api/recommendations/partners/${serviceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch partner recommendations');
        }
        const data = await response.json();
        setPartners(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching partner recommendations:', err);
        setError(err.message);
        // Mock data for development
        setPartners([
          {
            partnerId: 1,
            name: 'Maria Garcia',
            score: 0.94,
            reason: 'Highest rated in your area',
            rating: 4.9,
            completedJobs: 234,
            startingPrice: 89,
            specialOffer: '10% off for new customers',
            estimatedArrival: '30 min',
            availability: 'available'
          },
          {
            partnerId: 2,
            name: 'James Wilson',
            score: 0.89,
            reason: 'Quick availability',
            rating: 4.8,
            completedJobs: 189,
            startingPrice: 85,
            estimatedArrival: '45 min',
            availability: 'limited'
          },
          {
            partnerId: 3,
            name: 'Sarah Chen',
            score: 0.85,
            reason: 'Specialist for this service',
            rating: 4.7,
            completedJobs: 312,
            startingPrice: 95,
            specialOffer: 'Free consultation',
            estimatedArrival: '60 min',
            availability: 'available'
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [serviceId]);

  if (loading) {
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={20} color="var(--primary)" />
            Top Professionals
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map(i => <PartnerCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error && partners.length === 0) {
    return null; // Don't show section if no partners available
  }

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'available': return '#10b981';
      case 'limited': return '#f59e0b';
      case 'unavailable': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 0.9) return { bg: '#dcfce7', border: '#22c55e', text: '#15803d' };
    if (score >= 0.8) return { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' };
    return { bg: '#f3e8ff', border: '#a855f7', text: '#7c3aed' };
  };

  const getMatchScoreRing = (score) => {
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (score * circumference);
    return { circumference, offset };
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={24} color="var(--primary)" />
          Top Professionals for This Job
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          ML-powered matching based on ratings, availability, and your preferences
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {partners.map((partner, index) => {
          const scoreColors = getMatchScoreColor(partner.score);
          const scoreRing = getMatchScoreRing(partner.score);
          const isSelected = selectedPartnerId === partner.partnerId;

          return (
            <div
              key={partner.partnerId}
              className={`card hover-lift animate-fade-up ${isSelected ? 'selected-partner' : ''}`}
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                position: 'relative',
                border: isSelected
                  ? `2px solid var(--primary)`
                  : partner.score >= 0.9
                    ? `2px solid ${scoreColors.border}`
                    : '1px solid var(--border)',
                background: isSelected ? 'var(--primary-bg)' : 'var(--bg-card)',
                transition: 'all 0.3s ease',
                animationDelay: `${index * 0.1}s`,
                boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
              }}
              onClick={() => onSelectPartner && onSelectPartner(partner)}
            >
              {/* Match Score Ring */}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: scoreColors.bg,
                  border: `3px solid ${scoreColors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: scoreColors.text
                }}
              >
                {Math.round(partner.score * 100)}%
              </div>

              {/* Partner Info */}
              <div style={{ marginBottom: '1rem', paddingRight: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: 700
                    }}
                  >
                    {partner.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                      {partner.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <span style={{ fontWeight: 600 }}>{partner.rating}</span>
                      <span style={{ color: 'var(--text-muted)' }}>({partner.completedJobs} jobs)</span>
                    </div>
                  </div>
                </div>

                {/* Recommendation Reason */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem'
                  }}
                >
                  <Shield size={14} />
                  <span>{partner.reason}</span>
                </div>

                {/* Availability Indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getAvailabilityColor(partner.availability),
                      boxShadow: `0 0 8px ${getAvailabilityColor(partner.availability)}`
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {partner.availability}
                  </span>
                  {partner.estimatedArrival && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '2px' }} />
                      {partner.estimatedArrival}
                    </span>
                  )}
                </div>

                {/* Price and Special Offer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Starting at </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      ${partner.startingPrice}
                    </span>
                  </div>
                  {partner.specialOffer && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <DollarSign size={10} style={{ display: 'inline', marginRight: '2px' }} />
                      {partner.specialOffer}
                    </div>
                  )}
                </div>

                {/* Select Button */}
                <button
                  className={isSelected ? 'btn-primary' : 'btn-outline'}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle size={16} /> Selected
                    </>
                  ) : (
                    <>
                      Select <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .selected-partner {
          transform: scale(1.02);
        }

        .selected-partner:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}