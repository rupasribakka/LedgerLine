/**
 * Express Application Configuration
 * 
 * Sets up security headers (Helmet), CORS, JSON body parsing,
 * request logging, and mounts all application routes.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Structured HTTP request logging (disabled during automated test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome & discovery endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'LedgerLine Financial Core API',
    version: '1.0.0',
    documentation: 'See README.md and /api/health for system status',
    status: 'Operational',
  });
});

// Mount modular API routes under /api
app.use('/api', apiRoutes);

// Catch 404 for undefined routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
