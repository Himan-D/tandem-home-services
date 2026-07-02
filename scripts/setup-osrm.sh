#!/bin/bash
set -e

# Download and prepare NYC routing graph for OSRM
# Usage: ./scripts/setup-osrm.sh

OSRM_DIR="osrm-data"
PBF_FILE="new-york-latest.osm.pbf"
OSRM_FILE="new-york-latest.osrm"
URL="https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf"

if [ -d "$OSRM_DIR" ] && [ -f "$OSRM_DIR/$OSRM_FILE" ]; then
  echo "OSRM graph already exists in $OSRM_DIR/$OSRM_FILE"
  exit 0
fi

mkdir -p "$OSRM_DIR"
cd "$OSRM_DIR"

echo "Downloading NYC OSM extract from Geofabrik..."
curl -L -o "$PBF_FILE" "$URL"

echo "Processing OSM data (this takes a few minutes)..."
docker run --rm -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-extract -p /opt/car.lua "/data/$PBF_FILE"
docker run --rm -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-partition "/data/$OSRM_FILE"
docker run --rm -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-customize "/data/$OSRM_FILE"

rm -f "$PBF_FILE"
echo "Done! OSRM graph ready in $OSRM_DIR/"
echo "Start with: docker compose up osrm"
