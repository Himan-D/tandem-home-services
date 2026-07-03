import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Phone, ShieldCheck, ChevronLeft, ChevronRight, MessageSquare, ShieldAlert, X, CheckCircle2, Star, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';
import ChatBox from '../components/ChatBox';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LiveTracking() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { on, joinBooking } = useSocket();
  const [booking, setBooking] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVettingOpen, setIsVettingOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const bookingRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    joinBooking(jobId);
    fetch(`${API_BASE}/api/bookings/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const found = data.find(j => j.id.toString() === jobId);
        if (found) setBooking(found);
      })
      .catch(() => {});
  }, [jobId, token]);

  useEffect(() => { bookingRef.current = booking; }, [booking]);

  useEffect(() => {
    if (!booking?.lat || !booking?.lng || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([booking.lat, booking.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const destIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;background:#6366f1;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([booking.lat, booking.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Destination</b><br>${booking.location || ''}`);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      partnerMarkerRef.current = null;
    };
  }, [booking?.lat, booking?.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current || !partnerLocation || !bookingRef.current) return;
    const latlng = [partnerLocation.lat, partnerLocation.lng];
    if (!partnerMarkerRef.current) {
      const partnerIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#22c55e;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">👷</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      partnerMarkerRef.current = L.marker(latlng, { icon: partnerIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${bookingRef.current.partnerName || 'Partner'}</b><br>En route`);
    } else {
      partnerMarkerRef.current.setLatLng(latlng);
    }
    const bounds = L.latLngBounds([
      [bookingRef.current.lat, bookingRef.current.lng],
      latlng,
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [partnerLocation]);

  useEffect(() => {
    const unsub1 = on('booking:updated', (data) => {
      if (data.id !== jobId) return;
      setBooking(prev => prev ? { ...prev, status: data.status, partnerName: data.partnerName || prev.partnerName, partnerId: data.partnerId || prev.partnerId } : prev);
    });

    const unsub2 = on('partner:location', (data) => {
      if (data.partnerId === bookingRef.current?.partnerId) {
        setPartnerLocation(data);
      }
    });

    return () => { unsub1(); unsub2(); };
  }, [jobId, on]);

  useEffect(() => {
    let timer;
    if (isCalling) {
      const connectTimeout = setTimeout(() => setCallConnected(true), 2000);
      timer = setInterval(() => {
        if (callConnected) setCallDuration(prev => prev + 1);
      }, 1000);
      return () => { clearTimeout(connectTimeout); clearInterval(timer); };
    } else {
      setCallConnected(false);
      setCallDuration(0);
    }
  }, [isCalling, callConnected]);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!booking) return <div className="container" style={{ padding: '2rem' }}>Loading map...</div>;

  if (booking.status === 'completed') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)', padding: '2rem'
      }}>
        <div className="animate-fade-up" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 0 60px rgba(34,197,94,0.4)'
          }}>
            <CheckCircle2 size={50} color="white" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Service Complete!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Your Tandem service has been delivered successfully.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem'
          }}>
            <div style={{ padding: '1.25rem', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{booking.serviceTitle || 'Home Service'}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} color="#22c55e" />
                Completed by {booking.partnerName || 'Tandem Pro'}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
            }}
          >
            <Star size={18} /> Proceed to Dashboard & Rate Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/dashboard')} className="btn-outline" style={{ background: 'white', padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={24} />
        </button>
        <div className="badge" style={{ background: 'white', color: 'black', border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.9375rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'block', width: 8, height: 8, background: 'var(--success)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
          Live Tracking
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', bottom: '1rem', left: '1rem', background: 'white',
          padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1000
        }}>
          <Navigation size={14} color="var(--primary)" />
          {partnerLocation
            ? `Pro location updated ${Math.floor((Date.now() - (partnerLocation.timestamp || Date.now())) / 1000)}s ago`
            : 'Waiting for partner location...'}
        </div>
      </div>

      <div className="card glass" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', paddingBottom: '3rem', marginTop: '-20px', zIndex: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.5rem' }}></div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {booking.status === 'accepted' ? `${booking.partnerName || 'Professional'} is on the way!` : 'Loading...'}
          </h2>
          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.125rem' }}>
            {booking.status === 'accepted' ? 'Live tracking active' : 'Waiting for updates...'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👷</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{booking.partnerName || 'Service Pro'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <ShieldCheck size={14} color="var(--success)" /> Verified Pro · 4.9 ★
            </div>
            <button className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', height: 'auto', background: 'white' }} onClick={() => setIsVettingOpen(true)}>
              View Vetting & Portfolio
            </button>
          </div>
          <button className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setIsChatOpen(!isChatOpen)}>
            <MessageSquare size={20} />
          </button>
          <button className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setIsCalling(true)}>
            <Phone size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <MapPin size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Destination</strong>
              <div>{booking.location}</div>
            </div>
          </div>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'red', color: 'red', padding: '0.5rem 1rem' }} onClick={() => {
            fetch(`${API_BASE}/api/sos/trigger`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ bookingId: jobId, lat: booking?.lat, lng: booking?.lng }),
            }).then(res => res.json()).then(data => alert(data.message || 'SOS alert sent.'));
          }}>
            <ShieldAlert size={18} /> SOS
          </button>
        </div>
      </div>

      {isChatOpen && <ChatBox bookingId={booking.id} onClose={() => setIsChatOpen(false)} />}

      {isCalling && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, color: 'white' }}>
          <div className="card glass animate-fade-up" style={{ width: '90%', maxWidth: '360px', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(20, 20, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="animate-pulse" style={{ margin: '0 auto 2rem', width: '90px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--primary)' }}>
              <Phone size={44} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>{booking.partnerName || 'Service Pro'}</h3>
            <p style={{ color: callConnected ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '2rem' }}>
              {callConnected ? `Connected • ${formatDuration(callDuration)}` : 'Dialing...'}
            </p>
            <button className="btn-primary" onClick={() => setIsCalling(false)} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '1rem', width: '100%', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 600 }}>
              End Call
            </button>
          </div>
        </div>
      )}

      {isVettingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="card glass animate-fade-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
            <button onClick={() => setIsVettingOpen(false)} className="btn-outline" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', padding: '0.25rem', borderRadius: '50%', minWidth: 'auto', width: '32px', height: '32px' }}>
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>👷</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{booking.partnerName || 'Service Pro'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>Tandem Verified</span>
                  <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>ML-Ranked Pro</span>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Verification Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.5rem' }}>
                {[
                  { label: 'Govt ID Checked', desc: 'Government-issued photo ID checked and verified.' },
                  { label: '10-Point Background Check', desc: 'Checked against national criminal registry.' },
                  { label: 'Practical Skills Assessment', desc: 'Passed hands-on home service exam.' },
                  { label: 'Safety Training', desc: 'Completed Tandem Safety and Ethics course.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                    {idx < 3 && <div style={{ position: 'absolute', left: '9px', top: '22px', bottom: '-18px', width: '2px', background: 'var(--success)' }} />}
                    <div style={{ zIndex: 1, background: 'var(--bg-card)', borderRadius: '50%', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} fill="var(--success)" color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Specialties</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>Professional home services by ML-matched, vetted experts.</p>
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Work Portfolio</h4>
              <div style={{ position: 'relative', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '220px' }}>
                {(() => {
                  const slides = [
                    { src: '/kitchen_portfolio.jpg', caption: 'Kitchen counter deep cleaning results' },
                    { src: '/laundry_portfolio.jpg', caption: 'Wardrobe organization and folding results' }
                  ];
                  const slide = slides[activeSlide];
                  return (
                    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                      <img src={slide.src} alt={slide.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} onError={(e) => { e.target.style.display = 'none'; }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '1rem', color: 'white', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center' }}>{slide.caption}</div>
                    </div>
                  );
                })()}
                <button onClick={() => setActiveSlide(prev => (prev === 0 ? 1 : 0))} className="btn-outline" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', padding: '0.35rem', borderRadius: '50%', color: 'var(--text-main)', zIndex: 10, minWidth: 'auto', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setActiveSlide(prev => (prev === 1 ? 0 : 1))} className="btn-outline" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', padding: '0.35rem', borderRadius: '50%', color: 'var(--text-main)', zIndex: 10, minWidth: 'auto', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
