import React from 'react';
import { X } from 'lucide-react';

export default function EditMessageModal({
  isVisible,
  onClose,
  onSave,
  messageText,
  isLoading
}) {
  const [text, setText] = React.useState(messageText || '');

  React.useEffect(() => {
    setText(messageText || '');
  }, [messageText]);

  if (!isVisible) return null;

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  const maxLength = 500;
  const remainingChars = maxLength - text.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Edit Message</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength}
          placeholder="Edit your message..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '12px', color: remainingChars < 50 ? '#d32f2f' : '#666' }}>
            {remainingChars} characters remaining
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                background: 'white',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !text.trim()}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: isLoading || !text.trim() ? '#ccc' : 'var(--primary)',
                color: 'white',
                borderRadius: '6px',
                cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}