const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();
  const { ServiceAreaManager } = require('../services/service-areas');
  const areas = new ServiceAreaManager(prisma);

  /**
   * @openapi
   * /api/service-areas:
   *   post:
   *     tags: [Service Areas]
   *     summary: Create a service area (admin)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, polygonPoints]
   *             properties:
   *               name: { type: string }
   *               polygonPoints: { type: array, items: { type: object, properties: { lat: { type: number }, lng: { type: number } } } }
   *               priceZone: { type: number }
   *               isActive: { type: boolean }
   *     responses:
   *       201: { description: Service area created }
   *   get:
   *     tags: [Service Areas]
   *     summary: List all service areas
   *     responses:
   *       200: { description: Array of service areas }
   */
  router.post('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const [area] = await areas.create(req.body);
    res.status(201).json(area);
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const list = await areas.list();
    res.json(list);
  }));

  /**
   * @openapi
   * /api/service-areas/{id}:
   *   get:
   *     tags: [Service Areas]
   *     summary: Get service area by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: Service area details }
   *       404: { description: Not found }
   *   put:
   *     tags: [Service Areas]
   *     summary: Update service area (admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: Updated }
   *   delete:
   *     tags: [Service Areas]
   *     summary: Delete service area (admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: Deleted }
   */
  router.get('/:id', asyncHandler(async (req, res) => {
    const area = await areas.getById(parseInt(req.params.id));
    if (!area) return res.status(404).json({ error: 'Service area not found' });
    res.json(area);
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const result = await areas.update(parseInt(req.params.id), req.body);
    if (!result || result.length === 0) return res.status(404).json({ error: 'Service area not found' });
    res.json(result[0]);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    try {
      await areas.delete(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Service area not found' });
      throw err;
    }
  }));

  /**
   * @openapi
   * /api/service-areas/check:
   *   post:
   *     tags: [Service Areas]
   *     summary: Check if a point is within a service area
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [lat, lng]
   *             properties:
   *               lat: { type: number }
   *               lng: { type: number }
   *     responses:
   *       200:
   *         description: Containment result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 inServiceArea: { type: boolean }
   *                 area: { type: object, properties: { id: { type: integer }, name: { type: string }, priceZone: { type: number } } }
   */
  router.post('/check', asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const area = await areas.findContaining(lat, lng);
    if (!area) return res.json({ inServiceArea: false });
    res.json({ inServiceArea: true, area: { id: area.id, name: area.name, priceZone: area.price_zone } });
  }));

  return router;
};
