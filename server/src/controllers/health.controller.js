/**
 * Health Controller
 * 
 * Provides system diagnostics and status checks for uptime monitoring,
 * load balancers, and frontend health probes.
 */

const getHealth = (req, res) => {
  const healthData = {
    status: 'UP',
    service: 'LedgerLine Financial Core API',
    phase: 'Phase 1 - Project Setup',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    invariants: {
      currencyPrecision: 'integer_paise',
      doubleEntryEnforced: true,
      rowLockingStrategy: 'pessimistic_select_for_update',
      idempotencyEnforced: true,
      aiAutonomousApproval: false,
    },
  };

  return res.status(200).json(healthData);
};

module.exports = {
  getHealth,
};
