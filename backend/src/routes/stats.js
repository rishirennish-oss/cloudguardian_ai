const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Alert = require('../models/Alert');
const RecoveryAction = require('../models/RecoveryAction');
const { ok, fail } = require('../utils/response');

// GET /api/stats/summary -> data {"totalServers","healthyServers","degradedServers","downServers","openAlerts","recoveriesToday","successfulRecoveries","avgRecoveryTimeMs","uptimePercent"}
router.get('/summary', async (req, res) => {
  try {
    const totalServers = await Server.countDocuments({});
    const healthyServers = await Server.countDocuments({ status: 'healthy' });
    const degradedServers = await Server.countDocuments({ status: 'degraded' });
    const downServers = await Server.countDocuments({ status: 'down' });

    const openAlerts = await Alert.countDocuments({ status: 'open' });

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const recoveriesToday = await RecoveryAction.countDocuments({
      executedAt: { $gte: startOfDay }
    });

    const successfulRecoveries = await RecoveryAction.countDocuments({
      success: true
    });

    const avgResult = await RecoveryAction.aggregate([
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$durationMs' }
        }
      }
    ]);
    const avgRecoveryTimeMs =
      avgResult.length > 0 && avgResult[0].avgDuration != null
        ? Math.round(avgResult[0].avgDuration)
        : 0;

    const uptimePercent =
      totalServers > 0
        ? Number(((healthyServers / totalServers) * 100).toFixed(1))
        : 100;

    return ok(res, {
      totalServers,
      healthyServers,
      degradedServers,
      downServers,
      openAlerts,
      recoveriesToday,
      successfulRecoveries,
      avgRecoveryTimeMs,
      uptimePercent
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;

