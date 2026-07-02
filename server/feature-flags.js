const crypto = require('crypto');

class FeatureFlags {
  constructor(flags = {}) {
    this.flags = flags;
  }

  load(config) {
    this.flags = { ...this.flags, ...config };
  }

  isEnabled(flagName, userId, defaults = {}) {
    const flag = this.flags[flagName];
    if (!flag) return defaults[flagName] ?? false;
    if (flag.rollout === undefined || flag.rollout >= 100) return true;
    if (flag.rollout <= 0) return false;
    if (!userId) return false;
    const hash = parseInt(crypto.createHash('md5').update(`${flagName}:${userId}`).digest('hex').slice(0, 8), 16);
    return (hash % 100) < flag.rollout;
  }

  getVariant(flagName, userId) {
    const flag = this.flags[flagName];
    if (!flag || !flag.variants || flag.variants.length === 0) return null;
    if (!userId) return flag.variants[0];
    const hash = parseInt(crypto.createHash('md5').update(`${flagName}:${userId}`).digest('hex').slice(0, 8), 16);
    return flag.variants[hash % flag.variants.length];
  }
}

const flags = new FeatureFlags({
  'ml_ranking_v2': { rollout: 50 },
  'geofence_alerts': { rollout: 100 },
  'real_time_eta': { rollout: 30, variants: ['haversine', 'ml_predicted'] },
  'partner_recommendation_v2': { rollout: 10 },
});

module.exports = { flags, FeatureFlags };
