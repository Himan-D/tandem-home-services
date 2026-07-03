const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const config = require('../config');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = `You are a helpful AI assistant for the Tandem home services platform. You help users with:
- Finding and booking services (cleaning, plumbing, electrical, etc.)
- Checking wallet balances, Tandem Plus memberships
- Understanding how the platform works for consumers and partners
- Troubleshooting common issues

Keep responses concise and friendly. If asked about something outside Tandem's scope, politely redirect.`;

module.exports = function (prisma) {
  const router = express.Router();

  router.post('/chat', optionalAuth, asyncHandler(async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (!config.openrouter.apiKey) {
      const contextReply = await generateContextualReply(prisma, req.user?.id, message);
      return res.json({ reply: contextReply });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tandem-home-services.app',
          'X-Title': 'Tandem AI Assistant',
        },
        body: JSON.stringify({
          model: config.openrouter.model || 'openai/gpt-4o-mini',
          messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'OpenRouter API error');
        throw new Error(`OpenRouter returned ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      res.json({ reply });
    } catch (err) {
      logger.error({ err: err.message }, 'AI chat failed, falling back to contextual reply');
      const fallback = await generateContextualReply(prisma, req.user?.id, message);
      res.json({ reply: fallback });
    }
  }));

  return router;
};

async function generateContextualReply(prisma, userId, query) {
  const q = query.toLowerCase();

  if (q.includes('wallet') || q.includes('balance') || q.includes('money')) {
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
      if (user) return `Your current wallet balance is $${(user.walletBalance || 0).toFixed(2)}.`;
    }
    return 'Please sign in to check your wallet balance.';
  }

  if (q.includes('clean') || q.includes('wash')) {
    return 'We offer Home Cleaning, Bathroom Cleaning, Kitchen Cleaning, and more. Head to the Services page to browse and book.';
  }

  if (q.includes('plumb') || q.includes('electric') || q.includes('repair')) {
    return 'We have vetted plumbers, electricians, and handymen available. Book any service from the home page.';
  }

  if (q.includes('plus') || q.includes('member') || q.includes('subscribe')) {
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPlusMember: true } });
      if (user?.isPlusMember) return 'You are a Tandem Plus member — enjoy 10% off all bookings!';
    }
    return 'Tandem Plus gives you 10% off all bookings, priority matching, and no booking fees. Subscribe in the Account page.';
  }

  if (q.includes('partner') || q.includes('pro') || q.includes('job') || q.includes('work')) {
    return 'Sign up as a Tandem Partner to earn flexible income doing home services. Choose "Partner" during registration.';
  }

  if (q.includes('hello') || q.includes('hi ') || q.includes('hey')) {
    return 'Hello! How can I help you with Tandem today?';
  }

  return 'I can help with bookings, wallet, Tandem Plus, becoming a partner, and more. What would you like to know?';
}
