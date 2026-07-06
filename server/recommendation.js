const logger = require('./lib/logger');

class RecommendationClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async request(method, path, body, timeout = 5000) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(url, opts);
      if (!res.ok) {
        const text = await res.text();
        logger.warn({ status: res.status, body: text }, 'ML request failed');
        return null;
      }
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn({ path }, 'ML request timed out');
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async train(interactions) {
    return this.request('POST', '/train/recommender', { interactions });
  }

  async trainProRanker(features, scores) {
    return this.request('POST', '/train/pro-ranker', { features, scores });
  }

  async trainPricing(features, targets) {
    return this.request('POST', '/train/pricing', { features, targets });
  }

  async trainETA(features, targets) {
    return this.request('POST', '/train/eta', { features, targets });
  }

  async trainChurn(features, targets) {
    return this.request('POST', '/train/churn', { features, targets });
  }

  async trainLTV(features, targets) {
    return this.request('POST', '/train/ltv', { features, targets });
  }

  async trainBundler(bookingHistories) {
    return this.request('POST', '/train/bundler', { booking_histories: bookingHistories });
  }

  async trainForecaster(hourlyData) {
    return this.request('POST', '/train/forecaster', { hourly_data: hourlyData });
  }

  async trainSurgeDetector(serviceStates) {
    return this.request('POST', '/train/surge-detector', { service_states: serviceStates });
  }

  async recommend(userId, topK = 6, allServiceIds = null) {
    const result = await this.request('POST', '/recommend', {
      user_id: userId,
      top_k: topK,
      service_ids: allServiceIds,
    });
    return result?.recommendations || [];
  }

  async rankPros(pros) {
    const result = await this.request('POST', '/rank-pros', { user_id: 0, pros });
    return result?.ranked_pros || [];
  }

  async predictRating(userId, serviceId) {
    return this.request('POST', '/predict-rating', { user_id: userId, service_id: serviceId });
  }

  async predictPrice(bookings) {
    const result = await this.request('POST', '/predict-price', { bookings });
    return result?.prices || [];
  }

  async predictETA(routes) {
    const result = await this.request('POST', '/predict-eta', { routes });
    return result?.etas || [];
  }

  async predictChurn(users) {
    const result = await this.request('POST', '/predict-churn', { users });
    return result?.churn_predictions || [];
  }

  async recommendBundles(selectedServices, topK = 3) {
    const result = await this.request('POST', '/bundle-services', {
      selected_services: selectedServices,
      top_k: topK,
    });
    return result?.bundles || [];
  }

  async frequentlyBoughtTogether(serviceId, topK = 3) {
    const result = await this.request('POST', '/frequently-bought-together', {
      selected_services: [serviceId],
      top_k: topK,
    });
    return result?.recommendations || [];
  }

  async forecast(dayOfWeek, hourOfDay, serviceId = null) {
    const body = { day_of_week: dayOfWeek, hour_of_day: hourOfDay };
    if (serviceId) body.service_id = serviceId;
    const result = await this.request('POST', '/forecast', body);
    return result?.forecasts || {};
  }

  async detectSurge(serviceStates) {
    const result = await this.request('POST', '/detect-surge', { service_states: serviceStates });
    return result?.surges || {};
  }

  async recordState(serviceStates) {
    return this.request('POST', '/record-state', { service_states: serviceStates });
  }
}

module.exports = { RecommendationClient };
