import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

export default function ChatBox({ bookingId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
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

    return () => unsub();
  }, [bookingId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !token) return;
    emit('chat:send', { bookingId, message: input });
    setInput('');
  };

  return (
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
            return (
              <div key={msg.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                {!isMe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{msg.senderName}</div>}
                <div style={{ background: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : 'black', padding: '0.5rem 0.75rem', borderRadius: '1rem', borderBottomRightRadius: isMe ? 0 : '1rem', borderBottomLeftRadius: isMe ? '1rem' : 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9375rem' }}>
                  {msg.message}
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
  );
}
