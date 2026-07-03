import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am Tandem AI Assistant. I can help you find services, check your wallet balance, or troubleshoot issues. What do you need help with today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userText, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #10b981 100%)', color: 'white', border: 'none', cursor: 'pointer', zIndex: 100, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Bot size={30} />
        </button>
      )}

      {isOpen && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', height: '500px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 100, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #10b981 100%)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} /> Tandem AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-body)' }}>
            {messages.map((msg, i) => {
              const isMe = msg.role === 'user';
              return (
                <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ background: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : 'black', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomRightRadius: isMe ? 0 : '1rem', borderBottomLeftRadius: isMe ? '1rem' : 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9375rem', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    {!isMe && <Sparkles size={14} style={{ color: 'var(--primary)', marginBottom: '4px' }} />}
                    <div>{msg.content}</div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{ background: 'white', color: 'var(--text-muted)', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomLeftRadius: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9375rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: `bounce 1.4s infinite ease-in-out ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ padding: '0.75rem', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="Ask anything..." value={input} onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', background: 'var(--bg-body)' }} />
            <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
