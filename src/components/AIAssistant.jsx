import { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I am Tandem AI Assistant. I can help you find services, check your wallet balance, or troubleshoot issues. What do you need help with today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const newMsgs = [...messages, { sender: 'user', text: userText }];
    setMessages(newMsgs);
    setInput('');
    setIsTyping(true);

    // Mock AI response with dynamic, account-aware replies
    setTimeout(() => {
      let reply = "I can definitely help with that. Let me look up the best professionals for you.";
      const query = userText.toLowerCase();

      if (query.includes('help') || query.includes('menu') || query.includes('services')) {
        reply = "Here are things you can ask me:\n• 'How do I book a cleaning service?'\n• 'What is my wallet balance?'\n• 'Tell me about Tandem Plus'\n• 'How do I become a Partner pro?'";
      } else if (query.includes('clean') || query.includes('wash') || query.includes('mop')) {
        reply = "Tandem offers premium Home Cleaning, Kitchen Cabinet Cleaning, Bathroom Cleaning, and Fridge Cleaning. You can book an instant dispatch or schedule one under the Services section on the Home page.";
      } else if (query.includes('ac') || query.includes('cool') || query.includes('repair') || query.includes('appliance')) {
        reply = "For AC repair or electrical troubleshooting, we match you with vetted technicians in under 15 minutes. Tap any service card on the Home screen to begin booking.";
      } else if (query.includes('wallet') || query.includes('balance') || query.includes('money') || query.includes('pay')) {
        if (user) {
          reply = `Your current Tandem Wallet Balance is $${(user.walletBalance || 0).toFixed(2)}. You can check this or review transactions under the "Account" section on your dashboard. You can also toggle "Use Wallet Balance" on Step 3 of any booking request!`;
        } else {
          reply = "Please sign in to your Tandem account to check your wallet balance. You can log in using the 'Sign In' button on the navbar.";
        }
      } else if (query.includes('plus') || query.includes('member') || query.includes('subscribe')) {
        if (user?.isPlusMember === 1) {
          reply = "You are already a premium Tandem Plus member! Thank you for subscribing. You will receive a 10% discount automatically on the payments step of all booking requests.";
        } else {
          reply = "Tandem Plus is our premium membership plan. For a small monthly fee, you get: 1) 10% off all bookings, 2) Priority matching, and 3) No booking fees. Tap 'Tandem Plus' in the navigation bar to subscribe!";
        }
      } else if (query.includes('pro') || query.includes('partner') || query.includes('job') || query.includes('work')) {
        reply = "Tandem Partners are verified local professionals who earn competitive rates with flexible hours. You can sign up as a Partner by choosing 'Partner (Service Professional)' in our Register/Sign Up form!";
      }

      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #10b981 100%)', color: 'white', border: 'none', cursor: 'pointer', zIndex: 100, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Bot size={30} />
        </button>
      )}

      {/* Chat Window */}
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
              const isMe = msg.sender === 'user';
              return (
                <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ background: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : 'black', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomRightRadius: isMe ? 0 : '1rem', borderBottomLeftRadius: isMe ? '1rem' : 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9375rem', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    {!isMe && <Sparkles size={14} style={{ color: 'var(--primary)', marginBottom: '4px' }} />}
                    <div>{msg.text}</div>
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{ background: 'white', color: 'var(--text-muted)', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomLeftRadius: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9375rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }}></div>
                  <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></div>
                  <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={{ padding: '0.75rem', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Ask anything..." 
              style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', background: 'var(--bg-body)' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
