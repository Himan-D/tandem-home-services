import { useRef, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';

export default function MessageOptionsMenu({
  isVisible,
  onClose,
  onEdit,
  onDelete,
  position
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position?.top || '0px',
        left: position?.left || '0px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        overflow: 'hidden',
        minWidth: '120px',
      }}
    >
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'white',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#333',
        }}
        onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
        onMouseLeave={(e) => e.target.style.background = 'white'}
      >
        <Edit size={16} />
        Edit
      </button>
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'white',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#d32f2f',
        }}
        onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
        onMouseLeave={(e) => e.target.style.background = 'white'}
      >
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );
}