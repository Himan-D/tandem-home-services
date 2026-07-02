import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Star, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

export default function BookingStatus() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { on, joinBooking } = useSocket();
  const [matchingStatus, setMatchingStatus] = useState('finding');
  const [matchedPro, setMatchedPro] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!token) return;
    joinBooking(jobId);
    fetch(`${API_BASE}/api/my-bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const booking = data.find(j => j.id === jobId);
        if (booking && (booking.status === 'accepted' || booking.status === 'completed')) {
          setMatchedPro({ name: booking.partnerName || 'Tandem Pro', rating: 4.9, jobs: 184 });
          setMatchingStatus('matched');
        }
      })
      .catch(() => {});
  }, [jobId, token]);

  useEffect(() => {
    const unsub = on('booking:updated', (data) => {
      if (data.id !== jobId) return;
      if (data.status === 'accepted') {
        setMatchedPro({ name: data.partnerName || 'Tandem Pro', rating: 4.9, jobs: 184 });
        setMatchingStatus('matched');
      }
    });
    return () => unsub();
  }, [jobId, on]);

  useEffect(() => {
    if (matchingStatus !== 'finding') return;
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [matchingStatus]);

  useEffect(() => {
    if (matchingStatus !== 'matched') return;
    if (redirectCountdown <= 0) {
      navigate(`/dashboard/track/${jobId}`);
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [matchingStatus, redirectCountdown, navigate, jobId]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem'
    }}>
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      {matchingStatus === 'finding' ? (
        <div className="animate-fade-up" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            margin: '0 auto 2.5rem'
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                borderRadius: '50%',
                border: '2px solid rgba(99,102,241,0.3)',
                animation: `radarPulse 2s ${i * 0.5}s infinite ease-out`
              }} />
            ))}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              boxShadow: '0 0 40px rgba(99,102,241,0.5)',
              animation: 'pulse 2s infinite'
            }}>
              🔍
            </div>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Finding Your Pro...
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '320px', margin: '0 auto 2rem' }}>
            Our ML engine is matching you with the best Tandem professional near you.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50px',
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.7)'
          }}>
            <Clock size={14} />
            ML matching in progress... ({elapsed}s)
          </div>

          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
            Job ID: {jobId}
          </p>
        </div>
      ) : (
        <div className="animate-fade-up" style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: '420px', width: '100%' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 40px rgba(34,197,94,0.4)'
          }}>
            <CheckCircle2 size={44} color="white" />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Pro Matched!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
            ML recommendation engine matched the best pro for your job
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem'
              }}>
                👷
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {matchedPro?.name || 'Tandem Pro'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                  <ShieldCheck size={14} color="#22c55e" />
                  <span>ML-Ranked · Top Match</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{
                flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px', textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <Star size={14} color="#facc15" fill="#facc15" />
                  <span style={{ fontWeight: 700 }}>{matchedPro?.rating || 4.9}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Rating</div>
              </div>
              <div style={{
                flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px', textAlign: 'center'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{matchedPro?.jobs || 184}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Completed Jobs</div>
              </div>
              <div style={{
                flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px', textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <MapPin size={14} />
                  <span style={{ fontWeight: 700 }}>~12</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Min away</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/dashboard/track/${jobId}`)}
            style={{
              width: '100%', padding: '1rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
            }}
          >
            <MapPin size={18} />
            Track Arrival Live
          </button>

          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            Auto-redirecting in {redirectCountdown}s...
          </p>
        </div>
      )}

      <style>{`
        @keyframes radarPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
