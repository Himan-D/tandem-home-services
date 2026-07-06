import { useState, useEffect } from 'react';
import { API_BASE, STRIPE_PUBLISHABLE_KEY } from '../config';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calendar, CreditCard, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

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

export default function ConsumerBooking() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ address: '', date: '', time: '' });
  const [userProfile, setUserProfile] = useState(null);
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [giftCardApplied, setGiftCardApplied] = useState(false);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');
  
  // Custom states added for bedrooms, bathrooms and wallet toggle
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [useWallet, setUseWallet] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [requestPreferredPro, setRequestPreferredPro] = useState(false);

  const { refreshUser, token } = useAuth();
  
  const cart = location.state?.cart || [];
  const baseServiceTotal = location.state?.totalCart || 129.00;
  
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setUserProfile(data));

      fetch(`${API_BASE}/api/bookings/my`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMyBookings(data);
          }
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  const handleApplyPromo = () => {
    if (promo.toUpperCase() === 'WELCOME20') setPromoApplied(true);
    else alert('Invalid promo code');
  };

  const handleApplyGiftCard = async () => {
    if (!giftCardCode) return;
    setGiftCardLoading(true);
    setGiftCardError('');
    try {
      const res = await fetch(`${API_BASE}/api/gift-cards/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: giftCardCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setGiftCardBalance(data.remainingBalance);
        setGiftCardApplied(true);
      } else {
        setGiftCardError(data.error || 'Invalid gift card');
      }
    } catch {
      setGiftCardError('Failed to check gift card');
    }
    setGiftCardLoading(false);
  };

  // Find preferred pro details
  const pastCompleted = myBookings.find(b => b.status === 'completed' && b.partnerId);
  const pastProName = pastCompleted ? (pastCompleted.partnerName || 'Tandem Pro') : null;
  const pastProId = pastCompleted ? pastCompleted.partnerId : null;

  // Pricing computations
  const calculatedTotal = baseServiceTotal + (bedrooms - 1) * 20 + (bathrooms - 1) * 15;
  const walletBalance = userProfile?.walletBalance || 0;
  const priceAfterDiscounts = calculatedTotal + 12.50 - (userProfile?.isPlusMember === 1 ? calculatedTotal * 0.10 : 0) - (promoApplied ? 20 : 0);
  const giftCardDeduction = giftCardApplied ? Math.min(giftCardBalance, priceAfterDiscounts) : 0;
  const priceAfterGiftCard = priceAfterDiscounts - giftCardDeduction;
  const walletDeduction = useWallet ? Math.min(walletBalance, priceAfterGiftCard) : 0;
  const finalTotalDue = Math.max(0, priceAfterGiftCard - walletDeduction);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      try {
        let paymentIntentId = null;

        if (finalTotalDue > 0 && stripePromise) {
          const piRes = await fetch(`${API_BASE}/api/payments/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: finalTotalDue }),
          });
          const piData = await piRes.json();
          paymentIntentId = piData.paymentIntent?.id;

          if (piData.paymentIntent?.client_secret) {
            const stripe = await stripePromise;
            const { error } = await stripe.confirmCardPayment(piData.paymentIntent.client_secret);
            if (error) {
              alert(`Payment failed: ${error.message}`);
              return;
            }
          }
        }

        const response = await fetch(`${API_BASE}/api/bookings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceId,
            location: formData.address,
            time: `${formData.date}, ${formData.time}`,
            amount: finalTotalDue,
            walletDeduction: walletDeduction,
            preferredPartnerId: requestPreferredPro ? pastProId : null,
            paymentIntentId,
            giftCardCode: giftCardApplied ? giftCardCode : undefined,
            giftCardAmount: giftCardDeduction > 0 ? giftCardDeduction : undefined,
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          await refreshUser();
          navigate(`/booking-status/${data.id}`); 
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to confirm booking.');
        }
      } catch (err) {
        console.error(err);
        alert('Server error.');
      }
    }
  };

  return (
    <div className="container" style={{ paddingTop: '6rem', minHeight: '100vh' }}>
      <button className="btn-outline" onClick={() => step > 1 ? setStep(step-1) : navigate('/')} style={{ marginBottom: '2rem' }}>
        <ChevronLeft size={20} /> Back
      </button>

      <div className="card glass animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '2rem' }}>Complete your Booking</h2>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
          {[
            { id: 1, title: 'Details', icon: <CheckCircle2 size={24} /> },
            { id: 2, title: 'Schedule', icon: <Calendar size={24} /> },
            { id: 3, title: 'Payment', icon: <CreditCard size={24} /> }
          ].map((s) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= s.id ? 'var(--primary)' : 'var(--bg-card)',
                color: step >= s.id ? 'white' : 'var(--text-muted)',
                border: `2px solid ${step >= s.id ? 'var(--primary)' : 'var(--border)'}`
              }}>
                {s.icon}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: step >= s.id ? 'var(--text-main)' : 'var(--text-muted)' }}>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ minHeight: '300px' }}>
          {step === 1 && (
            <div className="animate-fade-up">
              <h3 style={{ marginBottom: '1.5rem' }}>Service Requirements for {serviceId}</h3>
              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Number of Bedrooms</label>
                  <select 
                    style={{ width: '100%' }} 
                    value={bedrooms} 
                    onChange={(e) => setBedrooms(parseInt(e.target.value) || 1)}
                  >
                    <option value={1}>1 Bedroom</option>
                    <option value={2}>2 Bedrooms</option>
                    <option value={3}>3 Bedrooms</option>
                    <option value={4}>4 Bedrooms</option>
                    <option value={5}>5 Bedrooms</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Number of Bathrooms</label>
                  <select 
                    style={{ width: '100%' }} 
                    value={bathrooms} 
                    onChange={(e) => setBathrooms(parseInt(e.target.value) || 1)}
                  >
                    <option value={1}>1 Bathroom</option>
                    <option value={2}>2 Bathrooms</option>
                    <option value={3}>3 Bathrooms</option>
                    <option value={4}>4 Bathrooms</option>
                    <option value={5}>5 Bathrooms</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Address</label>
                  <input type="text" placeholder="Full Address" style={{ width: '100%' }} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-up">
              <h3 style={{ marginBottom: '1.5rem' }}>Select Date & Time</h3>
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date</label>
                  <input type="date" style={{ width: '100%' }} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Time Slot</label>
                  <select style={{ width: '100%' }} value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}>
                    <option value="">Select a time</option>
                    <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                  </select>
                </div>
              </div>
              
              {pastProId && (
                <div style={{ 
                  marginTop: '2rem', 
                  padding: '1.25rem', 
                  background: 'var(--bg-hover)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  transition: 'var(--transition)'
                }}>
                  <input 
                    type="checkbox" 
                    id="request-preferred-pro"
                    checked={requestPreferredPro} 
                    onChange={(e) => setRequestPreferredPro(e.target.checked)} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="request-preferred-pro" style={{ fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Request same professional as last time ({pastProName})</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>We'll prioritize assigning this job to them.</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-up">
              <h3 style={{ marginBottom: '1.5rem' }}>Payment details</h3>
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  Itemized Summary
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {cart.length > 0 ? (
                    cart.map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge" style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.2rem 0.5rem', 
                            background: idx === 0 ? 'var(--primary-bg)' : 'var(--bg-hover)',
                            color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                          }}>
                            {idx === 0 ? 'Base' : 'Add-on'}
                          </span>
                          <span style={{ fontWeight: idx === 0 ? 600 : 400 }}>{item.title}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Base</span>
                        <span style={{ fontWeight: 600 }}>Base Service ({serviceId})</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>${baseServiceTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {(bedrooms > 1 || bathrooms > 1) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '0.5rem' }}>
                      <span>Customization ({bedrooms} BR / {bathrooms} BA)</span>
                      <span>+${((bedrooms - 1) * 20 + (bathrooms - 1) * 15).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <BundleRecommendations serviceId={serviceId} />

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Subtotal</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>${calculatedTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', paddingLeft: '0.75rem' }}>
                    <span>└ Provider Share (75% gross)</span>
                    <span>${(calculatedTotal * 0.75).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', paddingLeft: '0.75rem' }}>
                    <span>└ Tandem Platform Fee (25%)</span>
                    <span>${(calculatedTotal * 0.25).toFixed(2)}</span>
                  </div>

                  {userProfile?.isPlusMember === 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                      <span>Tandem Plus Discount (10%)</span>
                      <span>-${(calculatedTotal * 0.10).toFixed(2)}</span>
                    </div>
                  )}

                  {promoApplied && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                      <span>Promo Code (WELCOME20)</span>
                      <span>-$20.00</span>
                    </div>
                  )}

                  {giftCardDeduction > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 600 }}>
                      <span>Gift Card</span>
                      <span>-${giftCardDeduction.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                     <span>Taxes & Fees</span>
                     <span style={{ color: 'var(--text-main)' }}>$12.50</span>
                  </div>

                  {walletDeduction > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 600 }}>
                      <span>Wallet Deduction</span>
                      <span>-${walletDeduction.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
                  <span style={{ color: 'var(--text-main)' }}>Total Due</span>
                  <span style={{ color: 'var(--primary)' }}>
                    ${finalTotalDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Promo Code Input */}
              {!promoApplied && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                  <input type="text" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-outline" onClick={handleApplyPromo}>Apply</button>
                </div>
              )}

              {/* Gift Card */}
              {giftCardApplied ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, background: '#f59e0b', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>G</div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Gift Card Applied</span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{giftCardCode}</span>
                    </div>
                  </div>
                  <button className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => { setGiftCardApplied(false); setGiftCardBalance(0); setGiftCardCode(''); setGiftCardError(''); }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <input type="text" placeholder="Gift card code (e.g. GIFT-XXXX-XXXX-XXXX)" value={giftCardCode} onChange={(e) => setGiftCardCode(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn-outline" onClick={handleApplyGiftCard} disabled={giftCardLoading}>
                      {giftCardLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {giftCardError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{giftCardError}</p>}
                </div>
              )}

              {/* Wallet Balance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="use-wallet-checkbox"
                    checked={useWallet} 
                    onChange={(e) => setUseWallet(e.target.checked)} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="use-wallet-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                    <div style={{ width: 24, height: 24, background: 'var(--success)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>$</div>
                    <span>Use Wallet Balance</span>
                  </label>
                </div>
                <div style={{ fontWeight: 600 }}>
                  ${walletBalance.toFixed(2)} available
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <CreditCard size={20} color="var(--text-muted)" />
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Credit or debit card</span>
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
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn-primary" onClick={handleNext}>
            {step === 3 ? 'Confirm Booking' : 'Next Step'} <CheckCircle2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function BundleRecommendations({ serviceId }) {
  const [bundles, setBundles] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/ml/frequently-bought-together`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.recommendations?.length) setBundles(data.recommendations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceId]);

  if (!bundles || bundles.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--primary-bg)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
        Frequently Bought Together
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {bundles.slice(0, 3).map((rec) => (
          <div key={rec.service_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ textTransform: 'capitalize' }}>{rec.service_id.replace(/_/g, ' ')}</span>
            <Link to={`/service/${rec.service_id}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none', fontSize: '0.8rem' }}>
              View Service →
            </Link>
          </div>
        ))}
      </div>
      {bundles.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          ML-powered recommendations
        </div>
      )}
    </div>
  );
}
