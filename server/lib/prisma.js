const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

function sql(strings, ...values) {
  return { strings, values };
}

function makePoint(lat, lng) {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

function makePointGeo(lat, lng) {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

function dWithinKm(lat, lng, colTable, colLat = 'lat', colLng = 'lng', km) {
  return Prisma.sql`ST_DWithin(${Prisma.raw(`${colTable}.${colLng}::geography`)}::geography, ST_MakePoint(${lng}, ${lat})::geography, ${km * 1000})`;
}

function distanceSphere(lat, lng, colLat = 'lat', colLng = 'lng') {
  return Prisma.sql`ST_DistanceSphere(ST_MakePoint(${lng}, ${lat}), ${Prisma.raw(colLng)}, ${Prisma.raw(colLat)})`;
}

function containsPoint(polygonCol, lat, lng) {
  return Prisma.sql`ST_Contains(${Prisma.raw(polygonCol)}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`;
}

module.exports = { prisma, Prisma, sql, makePoint, makePointGeo, dWithinKm, distanceSphere, containsPoint };
