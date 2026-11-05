/**
 * Master API Routes Aggregator
 * 
 * Mounts modular route handlers under the /api namespace.
 */

const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');

// Mount Health Check endpoint at /api/health
router.use('/health', healthRoutes);

// Future Phase 2 Routes will be mounted here:
// router.use('/auth', authRoutes);
// router.use('/accounts', accountRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/audit', auditRoutes);

module.exports = router;
