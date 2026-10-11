const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const { getServerById } = require('../config');
const { ok, fail } = require('../utils/response');

// GET /api/servers -> data [{ "serverId", "name", "type", "status", "riskLevel", "failureProbability", "latestMetrics": METRIC, "lastUpdated" }]
router.get('/', async (req, res) => {
  try {
    const servers = await Server.find({});
    return ok(res, servers);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// GET /api/servers/:serverId -> data (one server object)
router.get('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await Server.findOne({ serverId });
    if (!server) {
      return fail(res, `Server ${serverId} not found`, 404);
    }
    return ok(res, server);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// GET /api/servers/:serverId/metrics?limit=50 -> data [METRIC...] oldest first
router.get('/:serverId/metrics', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await Server.findOne({ serverId });
    if (!server && !getServerById(serverId)) {
      return fail(res, `Server ${serverId} not found`, 404);
    }

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
    // Fetch latest N metrics sorted desc, then reverse to oldest first
    const metrics = await Metric.find({ serverId })
      .sort({ timestamp: -1 })
      .limit(limit);

    metrics.reverse();

    return ok(res, metrics);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;

