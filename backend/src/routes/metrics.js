const express = require('express');
const router = express.Router();
const { validateMetricInput, processMetric } = require('../services/orchestrator');
const { ok, fail } = require('../utils/response');

// POST /api/metrics (body METRIC) -> data { "metric": {}, "prediction": {} | null }
router.post('/', async (req, res) => {
  try {
    const validation = validateMetricInput(req.body);
    if (!validation.valid) {
      return fail(res, validation.error, 400);
    }

    const result = await processMetric(req.body);
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;

