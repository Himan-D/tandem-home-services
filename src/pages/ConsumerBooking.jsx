import { useState, useEffect } from 'react';
import { API_BASE, STRIPE_PUBLISHABLE_KEY } from '../config';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Calendar, CreditCard, ChevronLeft, ChevronRight, CheckCircle2,
  MapPin, Home, User, Clock, Package, Plus, X, Camera, Upload,
  Sparkles, Shield, Star, Phone, Mail
} from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Service Selection
    selectedCategory: '',
    selectedService: '',
    selectedAddons: [],

    // Step 2: Date & Time
    date: '',
    time: '',
    requestPreferredPro: false,

    // Step 3: Address
    address: '',
    apartment: '',
    area: '',
    city: '',
    postalCode: '',
    landmark: '',

    // Step 4: Preferences
    specialInstructions: '',
    uploadedPhotos: [],

    // Step 5: Payment
    promo: '',
    useWallet: false
  });

  const [userProfile, setUserProfile] = useState(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [giftCardApplied, setGiftCardApplied] = useState(false);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');

  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [myBookings, setMyBookings] = useState([]);

  const { refreshUser, token } = useAuth();

  const cart = location.state?.cart || [];
  const baseServiceTotal = location.state?.totalCart || 129.00;

  // Service categories and pricing
  const serviceCategories = [
    { id: 'home-cleaning', name: 'Home Cleaning', icon: Home, description: 'Professional cleaning services' },
    { id: 'plumbing', name: 'Plumbing', icon: Package, description: 'Expert plumbing solutions' },
    { id: 'electrician', name: 'Electrician', icon: Sparkles, description: 'Electrical repairs and installation' },
    { id: 'ac-service', name: 'AC Service', icon: Shield, description: 'Air conditioning maintenance' },
    { id: 'carpenter', name: 'Carpenter', icon: Home, description: 'Woodwork and furniture' },
    { id: 'beauty', name: 'Beauty', icon: Star, description: 'Salon at your doorstep' }
  ];

  const addons = [
    { id: 'deep-cleaning', name: 'Deep Cleaning', price: 50, description: 'Thorough deep cleaning service' },
    { id: 'appliance-cleaning', name: 'Appliance Cleaning', price: 35, description: 'Kitchen appliance cleaning' },
    { id: 'balcony-cleaning', name: 'Balcony Cleaning', price: 25, description: 'Balcony and window cleaning' },
    { id: 'bathroom-deep-clean', name: 'Bathroom Deep Clean', price: 40, description: 'Intensive bathroom cleaning' }
  ];

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM'
  ];

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
  const walletDeduction = formData.useWallet ? Math.min(walletBalance, priceAfterGiftCard) : 0;
  const finalTotalDue = Math.max(0, priceAfterGiftCard - walletDeduction);

  const validateStep = (currentStep) => {
    const errors = {};

    switch(currentStep) {
      case 1:
        if (!formData.selectedCategory) {
          errors.selectedCategory = 'Please select a service category';
        }
        break;
      case 2:
        if (!formData.date) {
          errors.date = 'Please select a date';
        }
        if (!formData.time) {
          errors.time = 'Please select a time slot';
        }
        break;
      case 3:
        if (!formData.address) {
          errors.address = 'Please enter your address';
        }
        if (!formData.city) {
          errors.city = 'Please enter your city';
        }
        if (!formData.postalCode) {
          errors.postalCode = 'Please enter postal code';
        }
        break;
      case 4:
        // Preferences step - no required fields
        break;
      case 5:
        // Payment step - validation handled by payment processing
        break;
      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 5) {
        setStep(step + 1);
        setValidationErrors({});
      } else {
        handleBookingSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setValidationErrors({});
    }
  };

  const handleApplyPromo = () => {
    if (formData.promo.toUpperCase() === 'WELCOME20') {
      setPromoApplied(true);
      setValidationErrors({...validationErrors, promo: ''});
    } else {
      setValidationErrors({...validationErrors, promo: 'Invalid promo code'});
    }
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

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setFormData({
      ...formData,
      uploadedPhotos: [...formData.uploadedPhotos, ...newPhotos]
    });
  };

  const removePhoto = (index) => {
    const newPhotos = [...formData.uploadedPhotos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setFormData({
      ...formData,
      uploadedPhotos: newPhotos
    });
  };

  const toggleAddon = (addonId) => {
    const selectedAddons = formData.selectedAddons.includes(addonId)
      ? formData.selectedAddons.filter(id => id !== addonId)
      : [...formData.selectedAddons, addonId];

    setFormData({
      ...formData,
      selectedAddons
    });
  };

  const handleBookingSubmit = async () => {
    setIsLoading(true);
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
            setValidationErrors({...validationErrors, payment: `Payment failed: ${error.message}`});
            setIsLoading(false);
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
          serviceId: formData.selectedService || serviceId,
          location: `${formData.address}, ${formData.apartment ? formData.apartment + ', ' : ''}${formData.area}, ${formData.city} - ${formData.postalCode}`,
          time: `${formData.date}, ${formData.time}`,
          amount: finalTotalDue,
          walletDeduction: walletDeduction,
          preferredPartnerId: formData.requestPreferredPro ? pastProId : null,
          paymentIntentId,
          giftCardCode: giftCardApplied ? giftCardCode : undefined,
          giftCardAmount: giftCardDeduction > 0 ? giftCardDeduction : undefined,
          specialInstructions: formData.specialInstructions,
          addons: formData.selectedAddons
        })
      });

      if (response.ok) {
        const data = await response.json();
        await refreshUser();
        navigate(`/booking-status/${data.id}`);
      } else {
        const data = await response.json();
        setValidationErrors({...validationErrors, booking: data.error || 'Failed to confirm booking.'});
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setValidationErrors({...validationErrors, booking: 'Server error.'});
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Service', icon: <Package size={20} /> },
    { id: 2, title: 'Schedule', icon: <Calendar size={20} /> },
    { id: 3, title: 'Address', icon: <MapPin size={20} /> },
    { id: 4, title: 'Preferences', icon: <User size={20} /> },
    { id: 5, title: 'Payment', icon: <CreditCard size={20} /> }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => step > 1 ? handleBack() : navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {steps.map((s, index) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: step >= s.id ? '#3b82f6' : '#f1f5f9',
                    color: step >= s.id ? 'white' : '#64748b',
                    border: `2px solid ${step >= s.id ? '#3b82f6' : '#e2e8f0'}`,
                    transition: 'all 0.3s ease',
                    fontWeight: 600
                  }}>
                    {step > s.id ? <CheckCircle2 size={20} /> : s.icon}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: step >= s.id ? '#1e293b' : '#64748b',
                    textAlign: 'center'
                  }}>
                    {s.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: step > s.id ? '#3b82f6' : '#e2e8f0',
                    margin: '0 0.5rem',
                    transition: 'all 0.3s ease'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          minHeight: '400px'
        }}>
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                Select Service Category
              </h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Choose the type of service you need</p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                {serviceCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.id}
                      onClick={() => setFormData({...formData, selectedCategory: category.id})}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: `2px solid ${formData.selectedCategory === category.id ? '#3b82f6' : '#e2e8f0'}`,
                        background: formData.selectedCategory === category.id ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: formData.selectedCategory === category.id ? '#3b82f6' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        <Icon size={28} color={formData.selectedCategory === category.id ? 'white' : '#64748b'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                          {category.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {category.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {validationErrors.selectedCategory && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {validationErrors.selectedCategory}
                </div>
              )}

              {/* Add-ons */}
              {formData.selectedCategory && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>
                    Available Add-ons
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {addons.map((addon) => (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '8px',
                          border: `2px solid ${formData.selectedAddons.includes(addon.id) ? '#3b82f6' : '#e2e8f0'}`,
                          background: formData.selectedAddons.includes(addon.id) ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={formData.selectedAddons.includes(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                            style={{ width: '1.2rem', height: '1.2rem', accentColor: '#3b82f6' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{addon.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{addon.description}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1rem' }}>
                          ${addon.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                Choose Date & Time
              </h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Select your preferred service time</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Date Selection */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                    Select Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.date && (
                    <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {validationErrors.date}
                    </div>
                  )}
                </div>

                {/* Time Slots */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                    Select Time Slot <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setFormData({...formData, time: slot})}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: `2px solid ${formData.time === slot ? '#3b82f6' : '#e2e8f0'}`,
                          background: formData.time === slot ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontWeight: 500,
                          color: formData.time === slot ? '#3b82f6' : '#1e293b',
                          fontSize: '0.9rem'
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  {validationErrors.time && (
                    <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {validationErrors.time}
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Pro */}
              {pastProId && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <input
                    type="checkbox"
                    id="request-preferred-pro"
                    checked={formData.requestPreferredPro}
                    onChange={(e) => setFormData({...formData, requestPreferredPro: e.target.checked})}
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                  <label htmlFor="request-preferred-pro" style={{ cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                      Request same professional as last time ({pastProName})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      We'll prioritize assigning this job to them based on their availability
                    </div>
                  </label>
                </div>
              )}

              <div style={{
                marginTop: '2rem',
                padding: '1rem 1.25rem',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Clock size={20} color="#d97706" />
                <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
                  <strong>Tip:</strong> Morning slots (8AM - 12PM) tend to fill up faster. Book early to secure your preferred time!
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                Service Address
              </h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Enter your complete address for accurate service delivery</p>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                    House/Flat No. <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter house/flat number"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                  />
                  {validationErrors.address && (
                    <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {validationErrors.address}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                    Apartment/Society Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter apartment/society name"
                    value={formData.apartment}
                    onChange={(e) => setFormData({...formData, apartment: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                      Area <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter area"
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                      City <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                      }}
                    />
                    {validationErrors.city && (
                      <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {validationErrors.city}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                      Postal Code <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter postal code"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                      }}
                    />
                    {validationErrors.postalCode && (
                      <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {validationErrors.postalCode}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Near landmark, building, etc."
                    value={formData.landmark}
                    onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div style={{
                marginTop: '2rem',
                padding: '1rem 1.25rem',
                background: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <MapPin size={20} color="#3b82f6" />
                <div style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>Service Area:</strong> We currently serve most major cities. Check availability during booking confirmation.
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="animate-fade-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                Additional Preferences
              </h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Help us serve you better with specific instructions</p>

              <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Special Instructions */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                    Special Instructions
                  </label>
                  <textarea
                    placeholder="Any specific requirements or instructions for the service professional..."
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({...formData, specialInstructions: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem',
                      minHeight: '120px',
                      resize: 'vertical',
                      transition: 'all 0.2s'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Examples: "Focus on kitchen cleaning", "Bring eco-friendly products", "Have own parking space"
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                    Upload Photos (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Upload Button */}
                    <div>
                      <input
                        type="file"
                        id="photo-upload"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="photo-upload"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '120px',
                          height: '120px',
                          borderRadius: '12px',
                          border: '2px dashed #cbd5e1',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          gap: '0.5rem'
                        }}
                      >
                        <Upload size={24} color="#64748b" />
                        <span style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                          Upload Photos
                        </span>
                      </label>
                    </div>

                    {/* Preview Photos */}
                    {formData.uploadedPhotos.map((photo, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          src={photo.preview}
                          alt={photo.name}
                          style={{
                            width: '120px',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0'
                          }}
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: 700
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.75rem' }}>
                    Upload photos of the area that needs service. This helps professionals come prepared.
                  </div>
                </div>
              </div>

              {/* Contact Information Preview */}
              <div style={{
                marginTop: '2rem',
                padding: '1.25rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>
                  Contact Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone size={18} color="#64748b" />
                    <span style={{ color: '#1e293b' }}>{userProfile?.phone || 'Not provided'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Mail size={18} color="#64748b" />
                    <span style={{ color: '#1e293b' }}>{userProfile?.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 5 && (
            <div className="animate-fade-up">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                Payment Details
              </h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Review your booking and complete payment</p>

              {/* Price Breakdown */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#1e293b' }}>
                  Price Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cart.length > 0 ? (
                    cart.map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            background: idx === 0 ? '#dbeafe' : '#f1f5f9',
                            color: idx === 0 ? '#1d4ed8' : '#64748b',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>
                            {idx === 0 ? 'Base' : 'Add-on'}
                          </span>
                          <span style={{ fontWeight: idx === 0 ? 600 : 400, color: '#1e293b' }}>{item.title}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>${item.price.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>Base</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>Base Service ({serviceId})</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>${baseServiceTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {formData.selectedAddons.map((addonId) => {
                    const addon = addons.find(a => a.id === addonId);
                    if (!addon) return null;
                    return (
                      <div key={addon.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            background: '#fef3c7',
                            color: '#d97706',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>Add-on</span>
                          <span style={{ color: '#1e293b' }}>{addon.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>${addon.price.toFixed(2)}</span>
                      </div>
                    );
                  })}

                  {(bedrooms > 1 || bathrooms > 1) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem', paddingLeft: '0.5rem' }}>
                      <span>Customization ({bedrooms} BR / {bathrooms} BA)</span>
                      <span>+${((bedrooms - 1) * 20 + (bathrooms - 1) * 15).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Subtotal</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>${calculatedTotal.toFixed(2)}</span>
                  </div>

                  {userProfile?.isPlusMember === 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3b82f6' }}>
                      <span>Plus Discount (10%)</span>
                      <span>-${(calculatedTotal * 0.10).toFixed(2)}</span>
                    </div>
                  )}

                  {promoApplied && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Taxes & Fees</span>
                    <span style={{ color: '#1e293b' }}>$12.50</span>
                  </div>

                  {walletDeduction > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                      <span>Wallet Deduction</span>
                      <span>-${walletDeduction.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
                  <span style={{ color: '#1e293b' }}>Total Due</span>
                  <span style={{ color: '#3b82f6' }}>${finalTotalDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              {!promoApplied && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={formData.promo}
                    onChange={(e) => setFormData({...formData, promo: e.target.value})}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={handleApplyPromo}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      color: '#1e293b',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}

              {validationErrors.promo && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {validationErrors.promo}
                </div>
              )}

              {/* Gift Card */}
              {giftCardApplied ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      background: '#f59e0b',
                      color: '#fff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>G</div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Gift Card Applied</span>
                      <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>{giftCardCode}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setGiftCardApplied(false); setGiftCardBalance(0); setGiftCardCode(''); setGiftCardError(''); }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Gift card code (e.g. GIFT-XXXX-XXXX-XXXX)"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      onClick={handleApplyGiftCard}
                      disabled={giftCardLoading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        color: '#1e293b',
                        fontWeight: 600,
                        cursor: giftCardLoading ? 'not-allowed' : 'pointer',
                        opacity: giftCardLoading ? 0.6 : 1
                      }}
                    >
                      {giftCardLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {giftCardError && <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{giftCardError}</div>}
                </div>
              )}

              {/* Wallet Balance */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: '#f0fdf4',
                border: '1px solid #22c55e',
                borderRadius: '8px',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    id="use-wallet-checkbox"
                    checked={formData.useWallet}
                    onChange={(e) => setFormData({...formData, useWallet: e.target.checked})}
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                  <label htmlFor="use-wallet-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      background: '#22c55e',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>$</div>
                    <span style={{ color: '#1e293b' }}>Use Wallet Balance</span>
                  </label>
                </div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>${walletBalance.toFixed(2)} available</div>
              </div>

              {/* Payment Method */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <CreditCard size={20} color="#64748b" />
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>Credit or Debit Card</span>
                </div>
                {stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <CardElementInput />
                  </Elements>
                ) : (
                  <div style={{
                    padding: '0.75rem',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>
                    Card payment (dev mode — set VITE_STRIPE_PUBLISHABLE_KEY to enable)
                  </div>
                )}
              </div>

              {validationErrors.payment && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  {validationErrors.payment}
                </div>
              )}

              {validationErrors.booking && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  {validationErrors.booking}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              onClick={handleBack}
              disabled={step === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: 'white',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: 600,
                cursor: step === 1 ? 'not-allowed' : 'pointer',
                opacity: step === 1 ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.95rem'
              }}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Step {step} of 5
              </span>
              <button
                onClick={handleNext}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  fontSize: '0.95rem'
                }}
              >
                {step === 5 ? (isLoading ? 'Processing...' : 'Complete Booking') : 'Next Step'}
                {step < 5 && <ChevronRight size={18} />}
                {step === 5 && !isLoading && <CheckCircle2 size={18} />}
              </button>
            </div>
          </div>
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
    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dbeafe', borderRadius: '8px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '0.5rem' }}>
        Frequently Bought Together
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {bundles.slice(0, 3).map((rec) => (
          <div key={rec.service_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ textTransform: 'capitalize', color: '#1e293b' }}>{rec.service_id.replace(/_/g, ' ')}</span>
            <Link to={`/service/${rec.service_id}`} style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none', fontSize: '0.8rem' }}>
              View Service →
            </Link>
          </div>
        ))}
      </div>
      {bundles.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>
          ML-powered recommendations
        </div>
      )}
    </div>
  );
}