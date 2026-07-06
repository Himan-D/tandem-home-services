import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, LogOut, Users, Briefcase, Tag, Warehouse, DollarSign, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminServiceAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [form, setForm] = useState({ name: '', priceZone: '1.0', isActive: true, polygonPoints: [{ lat: '', lng: '' }] });
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { 'Authorization': `Bearer ${token}` };
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/service-areas`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAreas(data);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAreas(); }, []);

  useEffect(() => {
    if (loading || areas.length === 0 || mapRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.7128, -74.006],
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }
    if (layerRef.current) { mapInstanceRef.current.removeLayer(layerRef.current); }
    const geoLayer = L.geoJSON(null, {
      style: (feature) => ({
        color: '#6366f1',
        weight: 2,
        opacity: 0.8,
        fillColor: feature.properties?.is_active ? '#6366f1' : '#9ca3af',
        fillOpacity: 0.15,
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(`
          <strong>${p.name || 'Unnamed'}</strong><br/>
          Price Zone: ${p.price_zone || 1.0}x<br/>
          Area: ${p.area_sqm ? (p.area_sqm / 1e6).toFixed(2) + ' km²' : '—'}<br/>
          Status: ${p.is_active ? 'Active' : 'Inactive'}
        `);
        layer.on('click', () => setSelectedArea(p.id));
      },
    });
    const features = areas.filter(a => a.boundary_geojson).map(a => ({
      type: 'Feature',
      properties: { id: a.id, name: a.name, price_zone: a.price_zone, area_sqm: a.area_sqm, is_active: a.is_active },
      geometry: a.boundary_geojson,
    }));
    if (features.length > 0) {
      geoLayer.addData({ type: 'FeatureCollection', features });
      geoLayer.addTo(mapInstanceRef.current);
      mapInstanceRef.current.fitBounds(geoLayer.getBounds().pad(0.1));
    }
    layerRef.current = geoLayer;
  }, [loading, areas]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', priceZone: '1.0', isActive: true, polygonPoints: [{ lat: '', lng: '' }] });
    setShowForm(true);
  };

  const openEdit = (a) => {
    let points = [{ lat: '', lng: '' }];
    if (a.boundary_geojson?.coordinates?.[0]) {
      points = a.boundary_geojson.coordinates[0].map(c => ({
        lat: String(c[1]),
        lng: String(c[0]),
      }));
      if (points.length > 1) points.pop();
    }
    setEditing(a.id);
    setForm({ name: a.name, priceZone: String(a.price_zone ?? 1.0), isActive: !!a.is_active, polygonPoints: points });
    setShowForm(true);
  };

  const addPoint = () => setForm({ ...form, polygonPoints: [...form.polygonPoints, { lat: '', lng: '' }] });
  const removePoint = (i) => {
    if (form.polygonPoints.length <= 1) return;
    setForm({ ...form, polygonPoints: form.polygonPoints.filter((_, idx) => idx !== i) });
  };
  const updatePoint = (i, field, val) => {
    const pts = [...form.polygonPoints];
    pts[i] = { ...pts[i], [field]: val };
    setForm({ ...form, polygonPoints: pts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validPoints = form.polygonPoints.filter(p => p.lat !== '' && p.lng !== '');
    if (validPoints.length < 3) { setError('Polygon needs at least 3 points'); return; }
    try {
      const url = editing ? `${API_BASE}/api/service-areas/${editing}` : `${API_BASE}/api/service-areas`;
      const method = editing ? 'PUT' : 'POST';
      const body = {
        name: form.name,
        priceZone: parseFloat(form.priceZone),
        isActive: form.isActive,
        polygonPoints: validPoints.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) })),
      };
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowForm(false);
      setEditing(null);
      fetchAreas();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service area?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/service-areas/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
      fetchAreas();
    } catch (e) { setError(e.message); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>Tandem</span>Admin
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/admin')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Overview</button>
          <button onClick={() => navigate('/admin/services')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Briefcase size={20} /> Services</button>
          <button onClick={() => navigate('/admin/promos')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Tag size={20} /> Promo Codes</button>
          <button onClick={() => navigate('/admin/dark-stores')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Warehouse size={20} /> Dark Stores</button>
          <button onClick={() => navigate('/admin/service-areas')} className="sidebar-link active" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Map size={20} /> Service Areas</button>
          <button onClick={() => navigate('/admin/partners')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Partners</button>
          <button onClick={() => navigate('/admin/customers')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><Users size={20} /> Customers</button>
          <button onClick={() => navigate('/admin/orders')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><ClipboardList size={20} /> Orders</button>
          <button onClick={() => navigate('/admin/payouts')} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><DollarSign size={20} /> Payouts</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Service Areas</h2>
          <button className="btn-primary" onClick={openCreate}><Plus size={18} /> New Area</button>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </div>
        )}

        {showForm && (
          <div className="card glass animate-fade-up" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Service Area' : 'New Service Area'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Price Zone Multiplier</label>
                  <input className="input" type="number" step="0.1" min="0.5" max="10" value={form.priceZone} onChange={e => setForm({ ...form, priceZone: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Active</label>
                  <select className="input" value={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Polygon Coordinates (lat, lng)</label>
                  <button type="button" className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={addPoint}>+ Add Point</button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Define the service area boundary. Minimum 3 points required.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {form.polygonPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '20px' }}>{i + 1}.</span>
                      <input className="input" type="number" step="any" placeholder="Latitude" value={pt.lat} onChange={e => updatePoint(i, 'lat', e.target.value)} style={{ flex: 1 }} />
                      <input className="input" type="number" step="any" placeholder="Longitude" value={pt.lng} onChange={e => updatePoint(i, 'lng', e.target.value)} style={{ flex: 1 }} />
                      <button type="button" className="btn-outline" style={{ padding: '0.3rem', color: 'var(--danger)' }} onClick={() => removePoint(i)} disabled={form.polygonPoints.length <= 1}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary"><Check size={18} /> {editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}><X size={18} /> Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            {loading ? (
              <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={32} className="spinner" color="var(--primary)" />
              </div>
            ) : areas.length === 0 ? (
              <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
                <Map size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <h3>No Service Areas</h3>
                <p style={{ color: 'var(--text-muted)' }}>Define service areas with polygon boundaries and price zones.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {areas.map(a => (
                  <div key={a.id} className="card glass animate-fade-up" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem',
                    cursor: 'pointer', border: selectedArea === a.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  }} onClick={() => setSelectedArea(a.id === selectedArea ? null : a.id)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Price Zone: {a.price_zone}x · Area: {a.area_sqm ? `${(a.area_sqm / 1e6).toFixed(2)} km²` : '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge" style={{ background: a.is_active ? 'var(--success)' : 'var(--border)', color: a.is_active ? 'white' : 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button className="btn-outline" style={{ padding: '0.3rem' }} onClick={(e) => { e.stopPropagation(); openEdit(a); }}><Edit2 size={14} /></button>
                      <button className="btn-outline" style={{ padding: '0.3rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card glass" style={{ minHeight: '500px', padding: 0, overflow: 'hidden' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '500px' }} />
          </div>
        </div>
      </main>
    </div>
  );
}
