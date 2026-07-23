import { useState, useEffect, useRef } from 'react';
import { Search, Clock, TrendingUp } from 'lucide-react';

export default function SearchBar({ services = [], onSearch, onServiceSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredServices, setFilteredServices] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Filter services based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredServices([]);
      return;
    }

    const filtered = services.filter(service =>
      service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 6); // Limit to 6 results

    setFilteredServices(filtered);
  }, [searchTerm, services]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);

    if (onSearch) {
      onSearch(value);
    }
  };

  const handleServiceClick = (service) => {
    // Add to recent searches
    const newRecentSearches = [
      { term: service.title, timestamp: Date.now() },
      ...recentSearches.filter(s => s.term !== service.title).slice(0, 4)
    ];
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    setSearchTerm(service.title);
    setShowDropdown(false);

    if (onServiceSelect) {
      onServiceSelect(service);
    }
  };

  const handleRecentSearchClick = (searchTerm) => {
    setSearchTerm(searchTerm);
    setShowDropdown(false);

    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const popularServices = [
    'Home Cleaning',
    'Plumbing',
    'Electrician',
    'Car Spa',
    'Salon Services',
    'AC Repair'
  ];

  return (
    <div ref={searchRef} style={{ position: 'relative', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-card)',
          border: '2px solid var(--border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          transition: 'all 0.2s ease-in-out'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-bg)';
        }}
        onBlur={(e) => {
          if (!showDropdown) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <Search size={20} color="var(--text-muted)" style={{ marginRight: '0.75rem' }} />

        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search for services..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '1rem',
            color: 'var(--text-main)',
            padding: 0
          }}
        />

        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilteredServices([]);
              if (onSearch) onSearch('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 100,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {/* Filtered Services */}
          {filteredServices.length > 0 ? (
            <div>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Services
              </div>
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                      {service.title}
                    </div>
                    {service.category && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {service.category}
                      </div>
                    )}
                  </div>
                  {service.basePrice && (
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      From ${service.basePrice}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              No services found matching "{searchTerm}"
            </div>
          ) : (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Clock size={14} /> Recent Searches
                  </div>
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search.term)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'background 0.15s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Clock size={16} color="var(--text-muted)" />
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {search.term}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Services */}
              <div>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <TrendingUp size={14} /> Popular Services
                </div>
                {popularServices.map((service, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(service)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: index < popularServices.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'background 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <TrendingUp size={16} color="var(--primary)" />
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                      {service}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}