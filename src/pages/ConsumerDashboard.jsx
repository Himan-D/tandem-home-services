import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE } from '../config';

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [complaintTarget, setComplaintTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [review, setReview] = useState('');
  const [complaintReason, setComplaintReason] = useState('Poor Service Quality');
  const [complaintDesc, setComplaintDesc] = useState('');
  
  const { token } = useAuth();
  const { on } = useSocket();

  const fetchBookings = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/bookings/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { setBookings(data); setLoading(false); });
  };

  useEffect(() => {
    if (!token) return;
    fetchBookings();
    const interval = setInterval(fetchBookings, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const unsub = on('booking:updated', (data) => {
      setBookings(prev => prev.map(b => b.id === data.id ? { ...b, ...data } : b));
    });
    return () => unsub();
  }, [on]);

  const submitRating = async () => {
    const res = await fetch(`${API_BASE}/api/bookings/${ratingTarget}/rate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookingId: ratingTarget, rating: ratingValue, review })
    });
    if (!res.ok) {
      alert('Could not submit rating. Please try again.');
      return;
    }
    setRatingTarget(null); setReview(''); fetchBookings();
  };

  const submitComplaint = async () => {
    const res = await fetch(`${API_BASE}/api/bookings/${complaintTarget}/complaint`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookingId: complaintTarget, reason: complaintReason, description: complaintDesc })
    });
    if (!res.ok) {
      alert('Could not submit complaint. Please try again.');
      return;
    }
    setComplaintTarget(null); setComplaintDesc(''); fetchBookings();
  };

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '2rem' }}>My Bookings</h2>

      {ratingTarget && (
        <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Rate Your Service</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>How was the service provided by your Tandem Pro?</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star} size={32} 
                onClick={() => setRatingValue(star)} 
                fill={star <= ratingValue ? 'var(--warning)' : 'none'}
                color={star <= ratingValue ? 'var(--warning)' : 'var(--border)'}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
          <textarea 
            placeholder="Leave a review..." 
            style={{ width: '100%', marginBottom: '1rem', minHeight: '100px' }}
            value={review} onChange={(e) => setReview(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={submitRating}>Submit Rating</button>
            <button className="btn-outline" onClick={() => setRatingTarget(null)}>Cancel</button>
          </div>
        </div>
      )}

      {complaintTarget && (
        <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', border: '2px solid var(--danger)' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertTriangle /> Report an Issue
          </h3>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason</label>
          <select style={{ width: '100%', marginBottom: '1rem' }} value={complaintReason} onChange={(e) => setComplaintReason(e.target.value)}>
            <option>Poor Service Quality</option>
            <option>Professional was late / no-show</option>
            <option>Unprofessional Behavior</option>
            <option>Billing Issue</option>
            <option>Other</option>
          </select>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
          <textarea 
            placeholder="Please provide details..." 
            style={{ width: '100%', marginBottom: '1rem', minHeight: '100px' }}
            value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={submitComplaint}>Submit Complaint</button>
            <button className="btn-outline" onClick={() => setComplaintTarget(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You have no bookings yet.</p>
        ) : (
          bookings.map(job => (
            <div key={job.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span className={`badge ${job.status}`}>{job.status}</span>
                    <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{job.serviceTitle}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {job.location}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> {job.time}</span>
                    {job.partner_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.5rem' }}>
                        <CheckCircle size={16} /> Assigned to Pro: {job.partner_name}
                      </span>
                    )}
                    {job.match_score && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        <Star size={12} /> ML match score: {(job.match_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${Math.floor(job.payout / 0.75).toFixed(2)}</div>
                  {job.status === 'pending' && (
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'var(--success)' }} 
                      onClick={() => navigate(`/booking-status/${job.id}`)}
                    >
                      Waiting for Match
                    </button>
                  )}
                  {job.status === 'accepted' && (
                    <button className="btn-primary" style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }} onClick={() => navigate(`/dashboard/track/${job.id}`)}>
                      Track Pro
                    </button>
                  )}
                  {job.status === 'completed' && job.rated === 0 && (
                    <button className="btn-primary" style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => setRatingTarget(job.id)}>
                      Leave a Rating
                    </button>
                  )}
                  {job.status === 'completed' && job.rated === 1 && (
                    <div style={{ color: 'var(--warning)', marginTop: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <Star size={16} fill="currentColor" /> Rated
                    </div>
                  )}
                  {job.status === 'completed' && (
                    <div style={{ marginTop: '1rem' }}>
                      <button className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setComplaintTarget(job.id)}>
                        Report Issue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
