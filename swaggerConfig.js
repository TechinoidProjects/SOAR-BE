// swaggerConfig.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SOAR API',
      version: '1.0.0',
      description: 'API documentation for managing SOAR',
    },
  },
  apis: [
    './swagger.js', // Include all your separate Swagger files here
    './routes/*.js', // Include route files with inline docs if necessary
  ],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwaggerDocs = (app, port) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(`API docs available at http://localhost:${port}/api-docs`);
};

module.exports = setupSwaggerDocs;
