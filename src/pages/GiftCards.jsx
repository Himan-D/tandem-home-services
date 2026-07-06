import { useState, useEffect } from 'react';
import { API_BASE, STRIPE_PUBLISHABLE_KEY } from '../config';
import { Gift, ChevronLeft, Copy, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const AMOUNT_PRESETS = [25, 50, 100, 200];

function CardElementInput() {
  return (
    <div style={{ padding: '0.5rem 0' }}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#1a1a2e',
              '::placeholder': { color: '#a0aec0' },
            },
          },
        }}
      />
    </div>
  );
}

export default function GiftCards() {
  const { token } = useAuth();

  const [tab, setTab] = useState('purchase');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const [purchasedCards, setPurchasedCards] = useState([]);
  const [receivedCards, setReceivedCards] = useState([]);
  const [fetching, setFetching] = useState(true);

  const displayAmount = useCustomAmount ? parseFloat(customAmount) || 0 : amount;

  useEffect(() => {
    if (token) {
      Promise.all([fetchPurchased(), fetchReceived()]).finally(() => setFetching(false));
    }
  }, [token]);

  const fetchPurchased = async () => {
    const res = await fetch(`${API_BASE}/api/gift-cards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setPurchasedCards(await res.json());
  };

  const fetchReceived = async () => {
    const res = await fetch(`${API_BASE}/api/gift-cards/received`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setReceivedCards(await res.json());
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePurchase = async () => {
    const finalAmount = displayAmount;
    if (!recipientEmail) { setError('Recipient email is required'); return; }
    if (finalAmount < 5) { setError('Minimum amount is $5'); return; }
    if (finalAmount > 500) { setError('Maximum amount is $500'); return; }

    setLoading(true);
    setError('');
    try {
      let paymentIntentId = null;

      if (stripePromise) {
        const piRes = await fetch(`${API_BASE}/api/payments/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: finalAmount }),
        });
        const piData = await piRes.json();
        paymentIntentId = piData.paymentIntent?.id;

        if (piData.paymentIntent?.client_secret) {
          const stripe = await stripePromise;
          const { error: stripeError } = await stripe.confirmCardPayment(piData.paymentIntent.client_secret);
          if (stripeError) { setError(stripeError.message); setLoading(false); return; }
        }
      }

      const res = await fetch(`${API_BASE}/api/gift-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: finalAmount,
          recipientEmail,
          recipientName: recipientName || undefined,
          message: personalMessage || undefined,
          paymentIntentId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setPurchasedCode(data.code);
        setRecipientEmail('');
        setRecipientName('');
        setPersonalMessage('');
        setAmount(25);
        setUseCustomAmount(false);
        setCustomAmount('');
        fetchPurchased();
        fetchReceived();
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch {
      setError('Server error during purchase');
    }
    setLoading(false);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const cardStatusBadge = (status) => {
    const colors = { active: 'var(--success)', partially_redeemed: '#f59e0b', redeemed: 'var(--text-muted)', expired: '#ef4444', cancelled: '#ef4444' };
    const labels = { active: 'Active', partially_redeemed: 'Partially Used', redeemed: 'Redeemed', expired: 'Expired', cancelled: 'Cancelled' };
    return <span style={{ color: colors[status] || 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{labels[status] || status}</span>;
  };

  return (
    <div className="container" style={{ paddingTop: '6rem', minHeight: '100vh' }}>
      <button className="btn-outline" onClick={() => window.history.back()} style={{ marginBottom: '1.5rem' }}>
        <ChevronLeft size={20} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #05ac5f, #047545)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Gift size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Gift Cards</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Send a gift card or check your balance</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['purchase', 'purchased', 'received'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'var(--transition)',
            }}
          >
            {t === 'purchase' ? 'Purchase' : t === 'purchased' ? 'My Purchases' : 'Received'}
          </button>
        ))}
      </div>

      {tab === 'purchase' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          <div className="card glass" style={{ padding: '2rem' }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
                <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Gift Card Purchased!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your gift card code:</p>
                <div style={{
                  background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '1rem',
                  fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.1em',
                  marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                }}>
                  {purchasedCode}
                  <button onClick={() => handleCopy(purchasedCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button className="btn-primary" onClick={() => { setSuccess(false); setPurchasedCode(''); }} style={{ marginTop: '1rem' }}>
                  Purchase Another
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: '1.5rem' }}>Send a Gift Card</h3>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Recipient Email *</label>
                  <input type="email" placeholder="friend@example.com" style={{ width: '100%' }} value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Recipient Name (optional)</label>
                  <input type="text" placeholder="Friend's name" style={{ width: '100%' }} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Personal Message (optional)</label>
                  <textarea placeholder="Happy birthday! Enjoy your cleaning service." style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Amount *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {AMOUNT_PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setAmount(p); setUseCustomAmount(false); }}
                        style={{
                          flex: 1, minWidth: '60px', padding: '0.6rem 0.25rem', border: amount === p && !useCustomAmount ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)', background: amount === p && !useCustomAmount ? 'var(--primary-bg)' : 'var(--bg-card)',
                          color: amount === p && !useCustomAmount ? 'var(--primary)' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center',
                        }}
                      >${p}</button>
                    ))}
                    <button
                      onClick={() => { setUseCustomAmount(true); setCustomAmount(''); }}
                      style={{
                        flex: 1, minWidth: '60px', padding: '0.6rem 0.25rem', border: useCustomAmount ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', background: useCustomAmount ? 'var(--primary-bg)' : 'var(--bg-card)',
                        color: useCustomAmount ? 'var(--primary)' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center',
                      }}
                    >Custom</button>
                  </div>
                  {useCustomAmount && (
                    <input type="number" min="5" max="500" placeholder="Enter amount ($5 - $500)" style={{ width: '100%' }} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Gift size={20} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Payment</span>
                    </div>
                    {stripePromise ? (
                      <Elements stripe={stripePromise}>
                        <CardElementInput />
                      </Elements>
                    ) : (
                      <div style={{ padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Card payment (dev mode — set VITE_STRIPE_PUBLISHABLE_KEY to enable)
                      </div>
                    )}
                  </div>
                </div>

                {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

                <button className="btn-primary" onClick={handlePurchase} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Processing...' : `Purchase $${displayAmount.toFixed(2)} Gift Card`}
                </button>
              </>
            )}
          </div>

          <div style={{ position: 'sticky', top: '6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #05ac5f, #047545)',
              borderRadius: '16px', padding: '2rem', color: '#fff',
              boxShadow: '0 8px 32px rgba(5, 172, 95, 0.3)',
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tandem Gift Card</div>
              <div style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1 }}>
                ${displayAmount > 0 ? displayAmount.toFixed(0) : '25'}
              </div>
              {recipientName && <div style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>To: {recipientName}</div>}
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>From: You</div>
              {personalMessage && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.85 }}>
                  "{personalMessage}"
                </div>
              )}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', opacity: 0.6 }}>
                Valid for 1 year &bull; Redeemable on tandem.app
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'purchased' && (
        <div className="card glass" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Gift Cards I've Purchased</h3>
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="spinner" /></div>
          ) : purchasedCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <Gift size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>You haven't purchased any gift cards yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recipient</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expires</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {purchasedCards.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{c.code}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>${c.initial_balance}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{c.recipient_name || c.recipient_email}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{cardStatusBadge(c.status)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(c.expires_at)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <button onClick={() => handleCopy(c.code)} className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          <Copy size={14} /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'received' && (
        <div className="card glass" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Gift Cards I've Received</h3>
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="spinner" /></div>
          ) : receivedCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <Gift size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No gift cards received yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>From</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Remaining</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedCards.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{c.purchaser_name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>${c.initial_balance}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary)', fontWeight: 700 }}>${c.remaining_balance}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{cardStatusBadge(c.status)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
