const RBush = require('rbush').default;

class SpatialIndex {
  constructor() {
    this.tree = new RBush();
    this.partnerMap = new Map();
  }

  load(partners) {
    const items = [];
    for (const p of partners) {
      if (p.lat == null || p.lng == null) continue;
      const minX = p.lng - 0.0001;
      const minY = p.lat - 0.0001;
      const maxX = p.lng + 0.0001;
      const maxY = p.lat + 0.0001;
      const item = { minX, minY, maxX, maxY, id: p.id };
      items.push(item);
      this.partnerMap.set(p.id, p);
    }
    this.tree.load(items);
  }

  upsert(partner) {
    if (partner.lat == null || partner.lng == null) return;
    const existing = this.partnerMap.get(partner.id);
    if (existing) {
      this.tree.remove(
        { minX: existing.lng - 0.0001, minY: existing.lat - 0.0001, maxX: existing.lng + 0.0001, maxY: existing.lat + 0.0001, id: existing.id },
        (a, b) => a.id === b.id
      );
    }
    this.partnerMap.set(partner.id, partner);
    this.tree.insert({ minX: partner.lng - 0.0001, minY: partner.lat - 0.0001, maxX: partner.lng + 0.0001, maxY: partner.lat + 0.0001, id: partner.id });
  }

  findNearby(lat, lng, radiusKm) {
    const degPerKm = 1 / 111;
    const dLat = radiusKm * degPerKm;
    const dLng = radiusKm * degPerKm / Math.cos(lat * Math.PI / 180);
    const candidates = this.tree.search({ minX: lng - dLng, minY: lat - dLat, maxX: lng + dLng, maxY: lat + dLat });

    const results = [];
    for (const c of candidates) {
      const p = this.partnerMap.get(c.id);
      if (!p) continue;
      const dlat = (p.lat - lat) * 111;
      const dlng = (p.lng - lng) * 111 * Math.cos(lat * Math.PI / 180);
      const distance = Math.sqrt(dlat * dlat + dlng * dlng);
      if (distance <= radiusKm) {
        results.push({ ...p, distance_km: Math.round(distance * 100) / 100 });
      }
    }
    return results.sort((a, b) => a.distance_km - b.distance_km);
  }
}

module.exports = SpatialIndex;
