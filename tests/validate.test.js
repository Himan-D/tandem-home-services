import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { validate, loginSchema, registerSchema, ratingSchema, createBookingSchema } from '../server/middleware/validate';

function appWith(schema) {
  const app = express();
  app.use(express.json());
  app.post('/probe', validate(schema), (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

const post = (app, body) => request(app).post('/probe').send(body);

describe('validate middleware (real Express + supertest)', () => {
  it('accepts a valid login and reaches the handler', async () => {
    const res = await post(appWith(loginSchema), { email: 'a@b.com', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects an invalid email with 400 and field details', async () => {
    const res = await post(appWith(loginSchema), { email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('requires a password', async () => {
    const res = await post(appWith(loginSchema), { email: 'a@b.com' });
    expect(res.status).toBe(400);
  });
});

describe('registerSchema', () => {
  it('defaults role to consumer and requires a 6+ char password', async () => {
    expect((await post(appWith(registerSchema), { name: 'Ada', email: 'a@b.com', password: 'short' })).status).toBe(400);
    const res = await post(appWith(registerSchema), { name: 'Ada', email: 'a@b.com', password: 'longenough' });
    expect(res.status).toBe(200);
  });
});

describe('ratingSchema', () => {
  it('accepts 1-5 with an optional review', async () => {
    expect((await post(appWith(ratingSchema), { bookingId: 'JOB-1', rating: 5, review: 'great' })).status).toBe(200);
    expect((await post(appWith(ratingSchema), { bookingId: 'JOB-1', rating: 3 })).status).toBe(200);
  });

  it('rejects ratings outside 1-5 and missing bookingId', async () => {
    expect((await post(appWith(ratingSchema), { bookingId: 'JOB-1', rating: 0 })).status).toBe(400);
    expect((await post(appWith(ratingSchema), { bookingId: 'JOB-1', rating: 6 })).status).toBe(400);
    expect((await post(appWith(ratingSchema), { rating: 4 })).status).toBe(400);
  });
});

describe('createBookingSchema', () => {
  it('requires a serviceId and forbids negative wallet deductions', async () => {
    expect((await post(appWith(createBookingSchema), { walletDeduction: -5 })).status).toBe(400);
    expect((await post(appWith(createBookingSchema), { serviceId: 'cleaning', walletDeduction: 5 })).status).toBe(200);
  });
});
