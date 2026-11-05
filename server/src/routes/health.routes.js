/**
 * Health Routes
 * 
 * Maps GET /api/health to health.controller
 */

const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/health.controller');

// @route   GET /api/health
// @desc    Check API uptime, status, and financial invariants
// @access  Public
router.get('/', getHealth);

module.exports = router;
