import { Star, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServiceCard({ service }) {
  const navigate = useNavigate();

  const {
    id,
    title,
    basePrice,
    rating = 4.5,
    reviewCount = 0,
    category,
    icon
  } = service;

  const handleBookClick = () => {
    navigate(`/service/${id}`);
  };

  const handleCardClick = () => {
    navigate(`/service/${id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="card glass hover-lift"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease-in-out',
        minHeight: '280px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Icon/Category Section */}
      <div style={{ padding: '1rem', background: 'var(--primary-bg)', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon || <BookOpen size={32} color="var(--primary)" />}
      </div>

      {/* Content Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {title}
        </h3>

        {category && (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {category}
          </span>
        )}

        {/* Rating Section */}
        {rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star size={16} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rating.toFixed(1)}</span>
            </div>
            {reviewCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({reviewCount} reviews)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Price and Action Section */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Starting from</span>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
            ${basePrice}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBookClick();
          }}
          className="btn-primary"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Book <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}