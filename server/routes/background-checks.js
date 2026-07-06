const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../lib/logger');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  router.post('/consent', authenticateToken, requireRole('partner'), asyncHandler(async (req, res) => {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id, status FROM background_checks WHERE partner_id = $1`, req.user.id
    );
    if (existing.length > 0 && existing[0].status !== 'not_started') {
      return res.status(400).json({ error: 'Background check already in progress' });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO background_checks (partner_id, status, consent_given, consent_at)
       VALUES ($1, 'pending', 1, NOW())
       ON CONFLICT (partner_id) DO UPDATE SET status = 'pending', consent_given = 1, consent_at = NOW()`,
      req.user.id
    );
    await prisma.$executeRawUnsafe(
      `UPDATE users SET background_check_status = 'pending' WHERE id = $1`, req.user.id
    );

    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }, select: { id: true },
    });
    if (admin) {
      await notifyUser(admin.id, 'in_app', 'Background Check Needed',
        `Partner #${req.user.id} has consented to a background check.`, {});
    }

    res.json({ success: true, status: 'pending' });
  }));

  router.get('/my-status', authenticateToken, asyncHandler(async (req, res) => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT bc.*, u.background_check_status
       FROM background_checks bc
       JOIN users u ON u.id = bc.partner_id
       WHERE bc.partner_id = $1`, req.user.id
    );
    if (rows.length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { backgroundCheckStatus: true },
      });
      return res.json({ status: user?.backgroundCheckStatus || 'not_started' });
    }
    res.json({
      id: rows[0].id,
      status: rows[0].status,
      provider: rows[0].provider,
      consentGiven: !!rows[0].consent_given,
      consentAt: rows[0].consent_at,
      completedAt: rows[0].completed_at,
      expiresAt: rows[0].expires_at,
    });
  }));

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const where = req.query.status ? `WHERE bc.status = '${req.query.status}'` : '';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT bc.*, u.name AS partner_name, u.email AS partner_email
       FROM background_checks bc
       JOIN users u ON u.id = bc.partner_id
       ${where}
       ORDER BY bc.created_at DESC`
    );
    const parsing = rows.map((r) => ({
      id: r.id, partnerId: r.partner_id, status: r.status,
      provider: r.provider, externalId: r.external_id,
      reportUrl: r.report_url, consentGiven: !!r.consent_given,
      consentAt: r.consent_at, initiatedBy: r.initiated_by,
      initiatedAt: r.initiated_at, completedAt: r.completed_at,
      expiresAt: r.expires_at, notes: r.notes,
      createdAt: r.created_at, updatedAt: r.updated_at,
      partnerName: r.partner_name, partnerEmail: r.partner_email,
    }));
    res.json(parsing);
  }));

  router.get('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT bc.*, u.name AS partner_name, u.email AS partner_email
       FROM background_checks bc
       JOIN users u ON u.id = bc.partner_id
       WHERE bc.id = $1`, parseInt(req.params.id)
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: rows[0].id, partnerId: rows[0].partner_id, status: rows[0].status,
      provider: rows[0].provider, externalId: rows[0].external_id,
      reportUrl: rows[0].report_url, consentGiven: !!rows[0].consent_given,
      consentAt: rows[0].consent_at, initiatedBy: rows[0].initiated_by,
      initiatedAt: rows[0].initiated_at, completedAt: rows[0].completed_at,
      expiresAt: rows[0].expires_at, notes: rows[0].notes,
      createdAt: rows[0].created_at, updatedAt: rows[0].updated_at,
      partnerName: rows[0].partner_name, partnerEmail: rows[0].partner_email,
    });
  }));

  router.post('/:id/initiate', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, status, partner_id FROM background_checks WHERE id = $1`, parseInt(req.params.id)
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: `Cannot initiate check with status '${rows[0].status}'` });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE background_checks SET status = 'in_progress', initiated_by = $1, initiated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      req.user.id, rows[0].id
    );
    await prisma.$executeRawUnsafe(
      `UPDATE users SET background_check_status = 'in_progress' WHERE id = $1`, rows[0].partner_id
    );

    await notifyUser(rows[0].partner_id, 'in_app', 'Background Check In Progress',
      `Your background check is now in progress. We'll notify you when it's complete.`, {});

    setTimeout(async () => {
      try {
        const outcomes = ['clear', 'clear', 'clear', 'clear', 'disputed', 'clear'];
        const result = outcomes[Math.floor(Math.random() * outcomes.length)];
        const externalId = `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (result === 'clear') {
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          await prisma.$executeRawUnsafe(
            `UPDATE background_checks SET status = 'clear', external_id = $1, completed_at = NOW(), expires_at = $2, updated_at = NOW() WHERE id = $3`,
            externalId, expiresAt, rows[0].id
          );
          await prisma.$executeRawUnsafe(
            `UPDATE users SET background_check_status = 'clear' WHERE id = $1`, rows[0].partner_id
          );
          await notifyUser(rows[0].partner_id, 'both', 'Background Check Cleared',
            `Congratulations! Your background check has been cleared. You're fully verified on Tandem.`, {});
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE background_checks SET status = 'disputed', external_id = $1, completed_at = NOW(), notes = 'Potential discrepancy found — needs admin review.', updated_at = NOW() WHERE id = $2`,
            externalId, rows[0].id
          );
          await prisma.$executeRawUnsafe(
            `UPDATE users SET background_check_status = 'disputed' WHERE id = $1`, rows[0].partner_id
          );
          await notifyUser(rows[0].partner_id, 'email', 'Background Check Needs Review',
            `Your background check requires additional review. An admin will contact you shortly.`, {});
          const admin = await prisma.user.findFirst({
            where: { role: 'admin' }, select: { id: true },
          });
          if (admin) {
            await notifyUser(admin.id, 'in_app', 'Background Check Dispute',
              `Background check for partner #${rows[0].partner_id} flagged for review.`, {});
          }
        }
      } catch (err) {
        logger.error({ err: err.message, checkId: rows[0].id }, 'Background check callback failed');
      }
    }, 3000);

    res.json({ success: true, status: 'in_progress' });
  }));

  router.post('/:id/result', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const valid = ['clear', 'disputed', 'suspended', 'failed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, partner_id FROM background_checks WHERE id = $1`, parseInt(req.params.id)
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const updateFields = status === 'clear'
      ? `status = '${status}', completed_at = NOW(), expires_at = NOW() + INTERVAL '1 year', notes = $2, updated_at = NOW()`
      : `status = '${status}', completed_at = NOW(), notes = $2, updated_at = NOW()`;

    await prisma.$executeRawUnsafe(
      `UPDATE background_checks SET ${updateFields} WHERE id = $3`,
      notes || null, rows[0].id
    );
    await prisma.$executeRawUnsafe(
      `UPDATE users SET background_check_status = $1 WHERE id = $2`,
      status, rows[0].partner_id
    );

    if (status === 'clear') {
      await notifyUser(rows[0].partner_id, 'both', 'Background Check Cleared',
        `Your background check has been cleared. You're fully verified!`, {});
    } else {
      await notifyUser(rows[0].partner_id, 'email', `Background Check ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your background check status has been updated to: ${status}. Please contact support for details.`, {});
    }

    res.json({ success: true, status });
  }));

  return router;
};
