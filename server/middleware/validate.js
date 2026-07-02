const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['consumer', 'partner']).optional().default('consumer'),
});

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  location: z.string().optional(),
  time: z.string().optional(),
  amount: z.number().positive().optional(),
  walletDeduction: z.number().nonnegative().optional(),
  preferredPartnerId: z.number().int().positive().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  promoCode: z.string().optional(),
});

const createOrderSchema = z.object({
  serviceId: z.string().min(1),
  amount: z.number().positive(),
  location: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  idempotencyKey: z.string().optional(),
});

const ratingSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

const complaintSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const partnerServicesSchema = z.object({
  services: z.array(z.string()).max(20),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  loginSchema,
  registerSchema,
  createBookingSchema,
  createOrderSchema,
  ratingSchema,
  complaintSchema,
  chatMessageSchema,
  locationUpdateSchema,
  partnerServicesSchema,
  validate,
};
