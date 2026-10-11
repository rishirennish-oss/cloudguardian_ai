const express = require('express');
const router = express.Router();
const RecoveryAction = require('../models/RecoveryAction');
const { ok, fail } = require('../utils/response');

// GET /api/recoveries?limit=50 -> data [RECOVERY...] newest first
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
    const recoveries = await RecoveryAction.find({})
      .sort({ executedAt: -1 })
      .limit(limit);

    return ok(res, recoveries);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;

