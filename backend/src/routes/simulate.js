const express = require('express');
const router = express.Router();
const axios = require('axios');
const { config, getServerById } = require('../config');
const { ok, fail } = require('../utils/response');

// POST /api/simulate/fault {"serverId","faultType"} -> data {"serverId","faultType","started":true}
router.post('/fault', async (req, res) => {
  try {
    const { serverId, faultType } = req.body || {};
    if (!serverId) {
      return fail(res, 'serverId is required', 400);
    }
    if (!faultType) {
      return fail(res, 'faultType is required', 400);
    }

    const server = getServerById(serverId);
    if (!server) {
      return fail(res, `Unknown serverId: ${serverId}`, 404);
    }

    const simUrl = `http://${config.simHost}:${server.port}/control/fault`;
    const response = await axios.post(
      simUrl,
      { faultType },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return ok(res, response.data);
  } catch (err) {
    console.error(`[BACKEND] Error in simulate/fault: ${err.message}`);
    return fail(res, `Simulation fault error: ${err.message}`, 502);
  }
});

// POST /api/simulate/reset {"serverId"} -> data {"serverId","reset":true}
router.post('/reset', async (req, res) => {
  try {
    const { serverId } = req.body || {};
    if (!serverId) {
      return fail(res, 'serverId is required', 400);
    }

    const server = getServerById(serverId);
    if (!server) {
      return fail(res, `Unknown serverId: ${serverId}`, 404);
    }

    const simUrl = `http://${config.simHost}:${server.port}/control/reset`;
    const response = await axios.post(
      simUrl,
      {},
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return ok(res, response.data);
  } catch (err) {
    console.error(`[BACKEND] Error in simulate/reset: ${err.message}`);
    return fail(res, `Simulation reset error: ${err.message}`, 502);
  }
});

module.exports = router;

