const http = require('http');

class RecommendationClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(method, path, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const opts = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      };

      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async train(interactions) {
    return this.request('POST', '/train', { interactions });
  }

  async recommend(userId, topK = 6, allServiceIds = null) {
    const result = await this.request('POST', '/recommend', {
      user_id: userId,
      top_k: topK,
      all_service_ids: allServiceIds,
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
}

module.exports = { RecommendationClient };
