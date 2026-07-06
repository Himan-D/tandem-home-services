import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Heart, Star, Briefcase, MapPin, Trash2, RefreshCw, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConsumerFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/favorites`, { headers });
      if (res.ok) setFavorites(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchFavorites(); }, []);

  const removeFavorite = async (partnerId) => {
    await fetch(`${API_BASE}/api/favorites/${partnerId}`, { method: 'DELETE', headers });
    fetchFavorites();
  };

  return (
    <div className="container" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate('/account')} className="btn-outline" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Heart size={24} color="var(--danger)" /> My Favorite Pros
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your saved service professionals</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw size={32} className="spinner" color="var(--primary)" /></div>
      ) : favorites.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
          <Heart size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No Saved Pros</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tap the heart icon on a completed booking to save your favorite pros.</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>View My Bookings</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {favorites.map(f => (
            <div key={f.id} className="card glass animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {f.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: '0.85rem', display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                    <span><Star size={14} color="var(--primary)" /> {f.rating_avg || '—'}</span>
                    <span><Briefcase size={14} /> {f.jobs_completed || 0} jobs</span>
                    {f.location && <span><MapPin size={14} /> {f.location}</span>}
                  </div>
                </div>
              </div>
              <button className="btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => removeFavorite(f.partner_id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
