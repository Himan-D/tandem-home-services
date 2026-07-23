import { useState, useEffect, useRef } from 'react';
import { Send, X, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';
import MessageOptionsMenu from './MessageOptionsMenu';
import EditMessageModal from './EditMessageModal';

export default function ChatBox({ bookingId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [editedMessages, setEditedMessages] = useState(new Set());
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMessageText, setEditMessageText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { token, user } = useAuth();
  const { on, emit, joinBooking } = useSocket();
  const userId = user ? user.id : (token ? JSON.parse(atob(token.split('.')[1])).id : null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/chat/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(data || []));

    joinBooking(bookingId);

    const unsub = on('chat:message', (msg) => {
      if (msg.bookingId === bookingId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    const unsubEdited = on('chat:message:edited', (msg) => {
      if (msg.bookingId === bookingId) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: msg.message } : m));
        setEditedMessages(prev => new Set([...prev, msg.id]));
      }
    });

    const unsubDeleted = on('chat:message:deleted', (msg) => {
      if (msg.bookingId === bookingId) {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        setEditedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(msg.id);
          return newSet;
        });
      }
    });

    return () => {
      unsub();
      unsubEdited();
      unsubDeleted();
    };
  }, [bookingId, token, on, joinBooking]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !token) return;
    emit('chat:send', { bookingId, message: input });
    setInput('');
  };

  const canEditMessage = (msg) => {
    if (!msg || msg.senderId !== userId) return false;
    const fiveMinutes = 5 * 60 * 1000;
    const messageAge = Date.now() - new Date(msg.createdAt).getTime();
    return messageAge <= fiveMinutes;
  };

  const handleMenuClick = (e, msg) => {
    if (!canEditMessage(msg)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: `${rect.bottom + 5}px`,
      left: `${rect.left}px`
    });
    setSelectedMessage(msg);
    setMenuVisible(true);
  };

  const handleEdit = () => {
    if (selectedMessage) {
      setEditMessageText(selectedMessage.message);
      setEditModalVisible(true);
    }
  };

  const handleDelete = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedMessage || !token) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/chat/messages/${selectedMessage.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
        setEditedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedMessage.id);
          return newSet;
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
      setMenuVisible(false);
    }
  };

  const saveEdit = async (newText) => {
    if (!selectedMessage || !token) return;

    setIsEditing(true);
    try {
      const response = await fetch(`${API_BASE}/api/chat/messages/${selectedMessage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newText })
      });

      if (response.ok) {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, message: newText } : m));
        setEditedMessages(prev => new Set([...prev, selectedMessage.id]));
        setEditModalVisible(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', height: '450px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 100, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--primary)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>Chat Support</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-body)' }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 'auto', marginBottom: 'auto' }}>No messages yet. Say hi!</p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === userId;
              const canEdit = canEditMessage(msg);
              const isEdited = editedMessages.has(msg.id);

              return (
                <div key={msg.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  {!isMe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{msg.senderName}</div>}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{
                      background: isMe ? 'var(--primary)' : 'white',
                      color: isMe ? 'white' : 'black',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '1rem',
                      borderBottomRightRadius: isMe ? 0 : '1rem',
                      borderBottomLeftRadius: isMe ? '1rem' : 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: '0.9375rem'
                    }}>
                      {msg.message}
                      {isEdited && <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>(edited)</span>}
                    </div>
                    {canEdit && (
                      <button
                        onClick={(e) => handleMenuClick(e, msg)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          opacity: 0.6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} style={{ padding: '0.75rem', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Type a message..."
            style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={18} />
          </button>
        </form>
      </div>

      <MessageOptionsMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        position={menuPosition}
      />

      <EditMessageModal
        isVisible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={saveEdit}
        messageText={editMessageText}
        isLoading={isEditing}
      />

      {deleteConfirmVisible && (
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
          onClick={() => setDeleteConfirmVisible(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Delete Message</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666' }}>
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirmVisible(false)}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: isDeleting ? '#ccc' : '#d32f2f',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}