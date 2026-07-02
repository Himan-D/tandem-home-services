function makePoint(lat, lng) {
  return `ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)`;
}

function makePointGeo(lat, lng) {
  return `${makePoint(lat, lng)}::geography`;
}

function distanceSphere(lat1, lng1, lat2, lng2) {
  return `ST_DistanceSphere(ST_MakePoint(${parseFloat(lng1)}, ${parseFloat(lat1)}), ST_MakePoint(${parseFloat(lng2)}, ${parseFloat(lat2)}))`;
}

function distanceSphereKmExpr(lat, lng, colLat = 'lat', colLng = 'lng') {
  return `ST_DistanceSphere(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), ST_MakePoint(${colLng}, ${colLat})) / 1000`;
}

function dWithinExpr(lat, lng, colLat = 'lat', colLng = 'lng', meters) {
  return `ST_DWithin(ST_MakePoint(${colLng}, ${colLat})::geography, ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)})::geography, ${parseInt(meters)})`;
}

function makePolygon(wktPlaceholder) {
  return `ST_SetSRID(ST_GeomFromText(${wktPlaceholder}), 4326)`;
}

function containsPolygonPoint(polyCol, lat, lng) {
  return `ST_Contains(${polyCol}, ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326))`;
}

const geomTriggerSQL = `
  CREATE OR REPLACE FUNCTION update_geom_from_latlng()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
      NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

function createGeomTrigger(table) {
  return `
    DROP TRIGGER IF EXISTS trg_${table}_geom ON ${table};
    CREATE TRIGGER trg_${table}_geom
    BEFORE INSERT OR UPDATE OF lat, lng ON ${table}
    FOR EACH ROW EXECUTE FUNCTION update_geom_from_latlng();
  `;
}

module.exports = {
  makePoint,
  makePointGeo,
  distanceSphere,
  distanceSphereKmExpr,
  dWithinExpr,
  geomTriggerSQL,
  createGeomTrigger,
};
