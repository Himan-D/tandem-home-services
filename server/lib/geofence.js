const config = require('../config');

class GeofenceEngine {
  constructor() {
    this.fences = new Map();
    this.states = new Map();
    this.dwellTimers = new Map();
    this.radius = config.geofence.radiusM;
    this.exitRadius = config.geofence.exitRadiusM;
    this.dwellSec = config.geofence.dwellSec;
    this.approachingM = config.geofence.approachingM;
  }

  _haversineM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  createFence(entityId, lat, lng, options = {}) {
    this.fences.set(entityId, {
      lat,
      lng,
      radius: options.radius || this.radius,
      exitRadius: options.exitRadius || this.exitRadius,
      dwellSec: options.dwellSec || this.dwellSec,
      approachingM: options.approachingM || this.approachingM,
    });
  }

  removeFence(entityId) {
    this.fences.delete(entityId);
    this.states.delete(entityId);
    const timer = this.dwellTimers.get(entityId);
    if (timer) {
      clearTimeout(timer);
      this.dwellTimers.delete(entityId);
    }
  }

  getFence(entityId) {
    return this.fences.get(entityId);
  }

  check(entityId, lat, lng, callbacks = {}) {
    const fence = this.fences.get(entityId);
    if (!fence) return { state: 'no_fence' };

    const distanceM = this._haversineM(lat, lng, fence.lat, fence.lng);
    const prevState = this.states.get(entityId) || 'outside';
    let newState = prevState;

    if (prevState === 'outside') {
      if (distanceM <= fence.radius) {
        newState = 'entered';
        this._startDwell(entityId, callbacks);
        if (callbacks.onEnter) callbacks.onEnter({ entityId, distanceM, fence });
      } else if (distanceM <= fence.approachingM) {
        newState = 'approaching';
        if (callbacks.onApproaching) callbacks.onApproaching({ entityId, distanceM, fence });
      }
    } else if (prevState === 'approaching') {
      if (distanceM <= fence.radius) {
        newState = 'entered';
        this._startDwell(entityId, callbacks);
        if (callbacks.onEnter) callbacks.onEnter({ entityId, distanceM, fence });
      } else if (distanceM > fence.approachingM) {
        newState = 'outside';
        if (callbacks.onExitApproaching) callbacks.onExitApproaching({ entityId, distanceM, fence });
      }
    } else if (prevState === 'entered' || prevState === 'arrived') {
      if (distanceM > fence.exitRadius) {
        newState = 'outside';
        this._cancelDwell(entityId);
        if (callbacks.onExit) callbacks.onExit({ entityId, distanceM, fence });
      }
    }

    this.states.set(entityId, newState);

    return {
      state: newState,
      distanceM: Math.round(distanceM),
      insideGeofence: distanceM <= fence.radius,
      approaching: distanceM <= fence.approachingM,
    };
  }

  _startDwell(entityId, callbacks) {
    const fence = this.fences.get(entityId);
    if (!fence) return;

    this._cancelDwell(entityId);

    const timer = setTimeout(() => {
      this.states.set(entityId, 'arrived');
      this.dwellTimers.delete(entityId);
      if (callbacks.onArrived) callbacks.onArrived({ entityId, fence });
    }, fence.dwellSec * 1000);

    this.dwellTimers.set(entityId, timer);
  }

  _cancelDwell(entityId) {
    const timer = this.dwellTimers.get(entityId);
    if (timer) {
      clearTimeout(timer);
      this.dwellTimers.delete(entityId);
    }
  }

  getState(entityId) {
    return this.states.get(entityId) || 'outside';
  }

  forceArrived(entityId) {
    this.states.set(entityId, 'arrived');
    this._cancelDwell(entityId);
  }

  listFences() {
    const result = [];
    for (const [id, fence] of this.fences) {
      result.push({
        entityId: id,
        ...fence,
        state: this.states.get(id) || 'outside',
      });
    }
    return result;
  }
}

module.exports = GeofenceEngine;
