import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Phone, MessageSquare, CheckCircle, ChevronLeft, CheckCircle2, Camera, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatBox from '../components/ChatBox';

export default function JobNavigation() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [job, setJob] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Simulation states
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(false);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [isSosOpen, setIsSosOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchJob = () => {
      fetch(`${API_BASE}/api/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const found = data.active?.find(j => j.id.toString() === jobId);
          setJob(found);
        })
        .catch(console.error);
    };

    fetchJob();
    const interval = setInterval(fetchJob, 5000);
    return () => clearInterval(interval);
  }, [jobId, token]);

  // Handle VoIP Timer
  useEffect(() => {
    let timer;
    if (isCalling) {
      const connectTimeout = setTimeout(() => {
        setCallConnected(true);
      }, 2000);

      timer = setInterval(() => {
        if (callConnected) {
          setCallDuration(prev => prev + 1);
        }
      }, 1000);

      return () => {
        clearTimeout(connectTimeout);
        clearInterval(timer);
      };
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

  const handleComplete = async () => {
    if (!token) return;
    await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed' })
    });
    alert('Job marked as completed!');
    navigate('/partner');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadPhoto = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      alert('Proof of work photo uploaded successfully!');
      setIsPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    }, 1500);
  };

  const triggerSos = () => {
    setSosSent(true);
    setTimeout(() => {
      setSosSent(false);
      setIsSosOpen(false);
      alert('Emergency operations team notified. We are monitoring your location.');
    }, 2000);
  };

  if (!job) return <div className="container" style={{ padding: '2rem' }}>Loading map...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Top Bar over map */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} className="btn-outline" style={{ background: 'white', padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={24} />
        </button>
        <div className="badge" style={{ background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '1rem', padding: '0.5rem 1rem' }}>
          Navigating to Job
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, background: '#e5e7eb', position: 'relative' }}>
        <iframe 
          title="Navigation Map"
          width="100%" 
          height="100%" 
          frameBorder="0" 
          src={`https://maps.google.com/maps?q=${encodeURIComponent(job.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
          style={{ filter: 'contrast(1.1) saturate(1.2)' }}
        ></iframe>
      </div>

      {/* Bottom Sheet Details */}
      <div className="card glass" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', paddingBottom: '3rem', marginTop: '-20px', zIndex: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.5rem' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{job.customerName}</h2>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem' }}>
              <MapPin size={16} /> {job.location}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>${job.payout}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{job.serviceTitle}</div>
          </div>
        </div>

        {job.status === 'accepted' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <button className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleComplete}>
              <CheckCircle2 size={24} /> Mark Job Complete
            </button>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-outline" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setIsPhotoModalOpen(true)}
              >
                <Camera size={18} /> Proof Photo
              </button>
              <button 
                className="btn-outline" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'red', borderColor: 'red' }} 
                onClick={() => setIsSosOpen(true)}
              >
                <ShieldAlert size={18} /> SOS
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 600, marginBottom: '2rem' }}>
            Job Completed successfully!
          </div>
        )}

        <div className="grid-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className="btn-outline" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => setIsCalling(true)}
          >
            <Phone size={18} /> Call Customer
          </button>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setIsChatOpen(!isChatOpen)}>
            <MessageSquare size={18} /> Message
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.location)}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#000', color: 'white' }}>
            <Navigation size={20} /> Start Google Maps
          </a>
          <button onClick={handleComplete} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--success)' }}>
            <CheckCircle size={20} /> Arrived & Complete
          </button>
        </div>
      </div>

      {isChatOpen && <ChatBox bookingId={job.id} onClose={() => setIsChatOpen(false)} />}

      {/* VoIP Dialer Modal */}
      {isCalling && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, color: 'white' }}>
          <div className="card glass animate-fade-up" style={{ width: '90%', maxWidth: '360px', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(20, 20, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="animate-pulse" style={{ margin: '0 auto 2rem', width: '90px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--primary)' }}>
              <Phone size={44} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>{job.customerName}</h3>
            <p style={{ color: callConnected ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '2rem' }}>
              {callConnected ? `Connected • ${formatDuration(callDuration)}` : 'Dialing...'}
            </p>
            <button className="btn-primary" onClick={() => setIsCalling(false)} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '1rem', width: '100%', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 600 }}>
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Proof Photo Modal */}
      {isPhotoModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card glass animate-fade-up" style={{ width: '90%', maxWidth: '400px', padding: '2rem', background: 'var(--bg-card)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Upload Proof of Work</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Please capture or upload a clear photo of the completed job area.</p>
            
            {photoPreview ? (
              <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', height: '200px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={photoPreview} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer', background: 'var(--bg-hover)' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="proof-photo-input" 
                  style={{ display: 'none' }} 
                  onChange={handlePhotoChange}
                />
                <label htmlFor="proof-photo-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={36} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Click to select/take a photo</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setIsPhotoModalOpen(false); setPhotoFile(null); setPhotoPreview(null); }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1 }} 
                disabled={!photoFile || uploading} 
                onClick={handleUploadPhoto}
              >
                {uploading ? 'Uploading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Alert Modal */}
      {isSosOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card glass animate-fade-up" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem 2rem', textAlign: 'center', border: '2px solid #ef4444', background: '#1c1c24', color: 'white' }}>
            <div style={{ margin: '0 auto 1.5rem', width: '70px', height: '70px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={40} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '1rem', fontWeight: 700 }}>EMERGENCY SOS</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              This will immediately notify Tandem emergency dispatch operations and share your live GPS location.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                style={{ background: '#ef4444', border: 'none', color: 'white', padding: '1rem' }} 
                onClick={triggerSos}
                disabled={sosSent}
              >
                {sosSent ? 'Contacting Dispatch...' : 'CONFIRM EMERGENCY'}
              </button>
              <button 
                className="btn-outline" 
                style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '1rem' }} 
                onClick={() => setIsSosOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
