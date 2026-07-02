const config = require('../config');

class KalmanFilter1D {
  constructor(processNoise, measurementNoise, initialValue = 0) {
    this.Q = processNoise;
    this.R = measurementNoise;
    this.x = initialValue;
    this.P = 1.0;
  }

  update(measurement) {
    this.P = this.P + this.Q;
    const K = this.P / (this.P + this.R);
    this.x = this.x + K * (measurement - this.x);
    this.P = (1 - K) * this.P;
    return this.x;
  }
}

class GpsFilter {
  constructor() {
    this.minAccuracy = config.gps.minAccuracyM;
    this.maxSpeedKph = config.gps.maxSpeedKph;
    this.processNoise = config.gps.kalmanProcessNoise;
    this.measurementNoise = config.gps.kalmanMeasurementNoise;

    this.tracks = new Map();
  }

  _getTrack(userId) {
    if (!this.tracks.has(userId)) {
      this.tracks.set(userId, {
        lastValid: null,
        latFilter: null,
        lngFilter: null,
        buffer: [],
      });
    }
    return this.tracks.get(userId);
  }

  _haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  validate(userId, reading) {
    const { lat, lng, accuracy, speed, timestamp } = reading;

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return { valid: false, reason: 'missing_coordinates' };
    }

    if (accuracy != null && accuracy > this.minAccuracy) {
      return { valid: false, reason: `low_accuracy_${Math.round(accuracy)}m` };
    }

    const track = this._getTrack(userId);
    const last = track.lastValid;

    if (last) {
      const elapsedSec = Math.max((timestamp - last.timestamp) / 1000, 1);
      const distanceKm = this._haversineKm(last.lat, last.lng, lat, lng);
      const calculatedSpeedKph = (distanceKm / elapsedSec) * 3600;

      if (calculatedSpeedKph > this.maxSpeedKph) {
        return {
          valid: false,
          reason: `speed_outlier_${Math.round(calculatedSpeedKph)}kph`,
          expected: `max ${this.maxSpeedKph}kph`,
        };
      }
    }

    let smoothedLat = lat;
    let smoothedLng = lng;

    if (last) {
      if (!track.latFilter) {
        track.latFilter = new KalmanFilter1D(this.processNoise, this.measurementNoise, last.lat);
        track.lngFilter = new KalmanFilter1D(this.processNoise, this.measurementNoise, last.lng);
      }
      smoothedLat = track.latFilter.update(lat);
      smoothedLng = track.lngFilter.update(lng);
    }

    track.lastValid = { lat: smoothedLat, lng: smoothedLng, accuracy, timestamp };

    return {
      valid: true,
      raw: { lat, lng, accuracy },
      smoothed: { lat: smoothedLat, lng: smoothedLng },
      speed: speed || (last ? ((this._haversineKm(last.lat, last.lng, smoothedLat, smoothedLng) / Math.max((timestamp - last.timestamp) / 1000, 1)) * 3600) : 0),
    };
  }

  getBuffer(userId) {
    return this._getTrack(userId).buffer;
  }

  addToBuffer(userId, point) {
    const track = this._getTrack(userId);
    track.buffer.push(point);
    if (track.buffer.length > config.gps.snapBatchSize) {
      track.buffer.shift();
    }
    return track.buffer;
  }

  clearBuffer(userId) {
    const track = this._getTrack(userId);
    const batch = track.buffer.slice();
    track.buffer = [];
    return batch;
  }

  reset(userId) {
    this.tracks.delete(userId);
  }
}

module.exports = { GpsFilter, KalmanFilter1D };
