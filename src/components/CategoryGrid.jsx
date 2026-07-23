import { Home, Scissors, Sparkles, Wrench, Palette, Car, Refrigerator, Package, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const categories = [
  { id: 'all', name: 'View All', icon: Package, color: 'var(--primary)' },
  { id: 'home_cleaning', name: 'Home Cleaning', icon: Home, color: '#10B981' },
  { id: 'salon_beauty', name: 'Salon & Beauty', icon: Scissors, color: '#EC4899' },
  { id: 'deep_cleaning', name: 'Deep Cleaning', icon: Sparkles, color: '#3B82F6' },
  { id: 'repairs_maintenance', name: 'Repairs & Maintenance', icon: Wrench, color: '#F59E0B' },
  { id: 'painting', name: 'Painting', icon: Palette, color: '#8B5CF6' },
  { id: 'car_spa', name: 'Car Spa', icon: Car, color: '#EF4444' },
  { id: 'appliance_repair', name: 'Appliance Repair', icon: Refrigerator, color: '#06B6D4' },
  { id: 'packers_movers', name: 'Packers & Movers', icon: Package, color: '#F97316' },
];

export default function CategoryGrid({ onCategoryChange, selectedCategory = 'all' }) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        padding: '2rem 0'
      }}
      className="category-grid"
    >
      {categories.map((category) => {
        const IconComponent = category.icon;
        const isActive = activeCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1.5rem 1rem',
              background: isActive ? 'var(--primary-bg)' : 'var(--bg-card)',
              border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              textAlign: 'center',
              minHeight: '120px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: isActive ? 'var(--primary)' : `${category.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <IconComponent
                size={24}
                color={isActive ? 'white' : category.color}
              />
            </div>

            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              {category.name}
            </span>

            {category.id === 'all' && (
              <ChevronRight size={16} color="var(--primary)" style={{ marginTop: '0.25rem' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Responsive breakpoints
export const categoryGridStyles = `
  @media (min-width: 640px) {
    .category-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 768px) {
    .category-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .category-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  @media (min-width: 1280px) {
    .category-grid {
      grid-template-columns: repeat(8, 1fr);
    }
  }
`;