const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');
const logger = require('../lib/logger');

const stripe = config.stripe.secretKey
  ? require('stripe')(config.stripe.secretKey)
  : null;

module.exports = function (prisma) {
  const router = express.Router();

  router.post('/create-payment-intent', authenticateToken, asyncHandler(async (req, res) => {
    const { amount, currency = 'usd', bookingId } = req.body;

    if (!stripe) {
      const fakeIntent = {
        id: `pi_dev_${Date.now()}`,
        client_secret: `pi_dev_${Date.now()}_secret_fake`,
        amount,
        currency,
        status: 'succeeded',
      };
      logger.info({ amount, userId: req.user.id }, 'Payment (dev mode — set STRIPE_SECRET_KEY for real)');
      return res.json({ paymentIntent: fakeIntent });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { userId: String(req.user.id), bookingId: bookingId || '' },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ paymentIntent: { id: paymentIntent.id, client_secret: paymentIntent.client_secret } });
  }));

  router.post('/webhook', asyncHandler(async (req, res) => {
    if (!stripe || !config.stripe.webhookSecret) {
      return res.status(200).json({ received: true });
    }

    const sig = req.headers['stripe-signature'];
    const payload = req.rawBody;
    if (!Buffer.isBuffer(payload)) {
      logger.error('Stripe webhook missing raw body — ensure express.json verify hook is active');
      return res.status(400).json({ error: 'Raw body required' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, config.stripe.webhookSecret);
    } catch (err) {
      logger.error({ err: err.message }, 'Stripe webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      logger.info({ piId: pi.id, amount: pi.amount, userId: pi.metadata.userId }, 'Payment succeeded');
    }

    res.json({ received: true });
  }));

  return router;
};
