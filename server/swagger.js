const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const logger = require('./lib/logger');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lumina Home API',
      version: '1.0.0',
      description: 'Home services platform API — booking, tracking, payments, and partner management',
      contact: { name: 'Lumina Home' },
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server/routes/*.js'],
};

const spec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lumina Home API Docs',
  }));
  app.get('/api-docs.json', (req, res) => res.json(spec));
  logger.info({ path: `/api-docs` }, 'Swagger docs mounted');
}

module.exports = { setupSwagger, spec };
