class ServiceAreaManager {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    const { name, polygonPoints, priceZone, isActive } = data;
    const wkt = `POLYGON((${polygonPoints.map(p => `${p.lng} ${p.lat}`).join(', ')}))`;
    const rows = await this.prisma.$queryRaw`
      INSERT INTO service_areas (name, boundary, price_zone, is_active)
      VALUES (${name}, ST_GeomFromText(${wkt}, 4326), ${priceZone || 1.0}, ${isActive !== undefined ? (isActive ? 1 : 0) : 1})
      RETURNING id, name, price_zone, is_active
    `;
    return rows;
  }

  async list() {
    return this.prisma.$queryRaw`
      SELECT id, name, price_zone, is_active,
             ST_AsGeoJSON(boundary)::jsonb as boundary_geojson,
             ST_Area(boundary::geography) as area_sqm,
             created_at
      FROM service_areas ORDER BY name
    `;
  }

  async getById(id) {
    const rows = await this.prisma.$queryRaw`
      SELECT id, name, price_zone, is_active,
             ST_AsGeoJSON(boundary)::jsonb as boundary_geojson,
             created_at
      FROM service_areas WHERE id = ${id}
    `;
    return rows[0] || null;
  }

  async update(id, data) {
    const sets = [];
    const values = [];
    let paramIdx = 1;

    if (data.name !== undefined) { sets.push(`name = $${paramIdx++}`); values.push(data.name); }
    if (data.priceZone !== undefined) { sets.push(`price_zone = $${paramIdx++}`); values.push(data.priceZone); }
    if (data.isActive !== undefined) { sets.push(`is_active = $${paramIdx++}`); values.push(data.isActive ? 1 : 0); }
    if (data.polygonPoints) {
      const wkt = `POLYGON((${data.polygonPoints.map(p => `${p.lng} ${p.lat}`).join(', ')}))`;
      sets.push(`boundary = ST_GeomFromText($${paramIdx++}, 4326)`);
      values.push(wkt);
    }
    if (sets.length === 0) return null;
    values.push(id);

    const rows = await this.prisma.$queryRawUnsafe(
      `UPDATE service_areas SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING id, name, price_zone, is_active`,
      ...values
    );
    return rows;
  }

  async delete(id) {
    return this.prisma.serviceArea.delete({ where: { id } });
  }

  async findContaining(lat, lng) {
    const rows = await this.prisma.$queryRaw`
      SELECT id, name, price_zone FROM service_areas
      WHERE is_active = 1 AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      ORDER BY price_zone ASC LIMIT 1
    `;
    return rows[0] || null;
  }
}

module.exports = { ServiceAreaManager };
