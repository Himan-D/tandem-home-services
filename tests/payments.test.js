import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signAccessToken } from '../server/middleware/authRefresh';
import createPaymentsRouter from '../server/routes/payments';

const TOKEN = signAccessToken({ id: 1, role: 'consumer', name: 'Tester' });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', createPaymentsRouter({}));
  return app;
}

describe('payments route (dev mode — no STRIPE_SECRET_KEY)', () => {
  it('creates a fake payment intent with a client secret', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create-payment-intent')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ amount: 50, currency: 'usd' });

    expect(res.status).toBe(200);
    expect(res.body.paymentIntent).toBeDefined();
    expect(res.body.paymentIntent.client_secret).toMatch(/secret/);
    expect(res.body.paymentIntent.status).toBe('succeeded');
  });

  it('passes the amount through in the fake intent', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create-payment-intent')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ amount: 129.99, bookingId: 'JOB-abc' });

    expect(res.status).toBe(200);
    expect(res.body.paymentIntent.amount).toBe(129.99);
  });

  it('rejects requests without a token (401)', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create-payment-intent')
      .send({ amount: 50 });

    expect(res.status).toBe(401);
  });

  it('acknowledges a webhook with no Stripe config', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .send({ type: 'payment_intent.succeeded' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
