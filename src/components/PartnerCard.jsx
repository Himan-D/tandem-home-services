import { Star, MapPin, Clock, ChevronRight, Briefcase } from 'lucide-react';
import ProfessionalBadge from './ProfessionalBadge';

export default function PartnerCard({ partner, onBookNow = () => {} }) {
  const {
    id,
    name,
    photo,
    rating,
    reviewCount,
    completedJobs,
    isVerified,
    skills,
    certifications,
    about,
    hourlyRate,
    serviceArea,
    responseTime,
    availability
  } = partner;

  const handleBookNow = () => {
    onBookNow(partner);
  };

  return (
    <div
      className="card glass hover-lift"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '400px'
      }}
    >
      {/* Header Section - Photo and Basic Info */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Profile Photo with Verified Badge Overlay */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--primary-bg)',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {photo ? (
              <img
                src={photo}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--primary)'
              }}>
                {name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          {/* Verified Badge Overlay */}
          {isVerified && (
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '24px',
              height: '24px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
            </div>
          )}
        </div>

        {/* Name and Status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {name}
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ProfessionalBadge type="verified" size="sm" showTooltip={false} />
            <ProfessionalBadge type="background_checked" size="sm" showTooltip={false} />
            <ProfessionalBadge type="insured" size="sm" showTooltip={false} />
          </div>

          {/* Rating and Reviews */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star size={16} fill="#fbbf24" color="#fbbf24" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rating?.toFixed(1) || 'New'}</span>
            </div>
            {reviewCount > 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </div>

          {/* Completed Jobs */}
          {completedJobs > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Briefcase size={14} />
              <span>{completedJobs}+ jobs completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Skills/Services Tags */}
      {skills && skills.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            {skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'var(--primary-bg)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: '1px solid var(--border)'
                }}
              >
                {skill}
              </span>
            ))}
            {skills.length > 4 && (
              <span style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                +{skills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* About Section */}
      {about && (
        <div>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {about}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {serviceArea && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MapPin size={14} />
            <span>{serviceArea}</span>
          </div>
        )}
        {responseTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Clock size={14} />
            <span>{responseTime}</span>
          </div>
        )}
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {certifications.map((cert, index) => (
            <ProfessionalBadge
              key={index}
              type="certified"
              size="sm"
              showTooltip={true}
            />
          ))}
        </div>
      )}

      {/* Footer - Price and Book Now */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Hourly Rate */}
        <div>
          {hourlyRate ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Starting at</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                ${hourlyRate}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/hr</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Contact for pricing
            </div>
          )}
        </div>

        {/* Book Now Button */}
        <button
          onClick={handleBookNow}
          className="btn-primary"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          Book Now
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Availability Indicator */}
      {availability && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.75rem',
          background: availability === 'available' ? '#d1fae5' : '#fef3c7',
          color: availability === 'available' ? '#065f46' : '#92400e',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: availability === 'available' ? '#10b981' : '#f59e0b'
          }} />
          {availability === 'available' ? 'Available' : 'Busy'}
        </div>
      )}
    </div>
  );
}