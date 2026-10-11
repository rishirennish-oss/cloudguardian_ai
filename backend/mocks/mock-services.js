const express = require('express');

function startMockMl(port = 8000) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ml-service' });
  });

  app.post('/predict', (req, res) => {
    const { serverId, metrics } = req.body || {};
    const mem = metrics?.memoryUsage || 0;
    const cpu = metrics?.cpuUsage || 0;

    const isHigh = mem > 85 || cpu > 85;
    const failureType = mem > 85 ? 'memory_leak' : cpu > 85 ? 'cpu_overload' : 'none';
    const riskLevel = isHigh ? 'critical' : 'low';
    const prob = isHigh ? 0.92 : 0.05;

    res.json({
      serverId: serverId || 'srv-web-01',
      isAnomaly: isHigh,
      anomalyScore: isHigh ? 0.85 : 0.02,
      failureProbability: prob,
      predictedFailureType: failureType,
      riskLevel,
      topFeatures: isHigh ? [{ feature: mem > 85 ? 'memoryUsage' : 'cpuUsage', contribution: 0.8 }] : [],
      modelVersion: '1.0.0'
    });
  });

  return app.listen(port, () => {
    console.log(`[MOCK ML] Listening on port ${port}`);
  });
}

function startMockRecovery(port = 5002) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'recovery-service' });
  });

  app.post('/recover', (req, res) => {
    const { serverId, failureType, riskLevel } = req.body || {};
    const action = failureType === 'memory_leak' ? 'restart_service' : 'scale_up';
    res.json({
      serverId: serverId || 'srv-web-01',
      action,
      success: true,
      message: `Successfully executed ${action} for ${failureType}`,
      executedAt: new Date().toISOString(),
      durationMs: 120
    });
  });

  app.post('/explain', (req, res) => {
    const { serverId, prediction } = req.body || {};
    res.json({
      explanation: `Automated recovery executed due to ${prediction?.predictedFailureType || 'anomaly'}`,
      severity: prediction?.riskLevel || 'critical',
      recommendedActions: ['Monitor system resource utilization', 'Verify logs'],
      generatedBy: 'template'
    });
  });

  return app.listen(port, () => {
    console.log(`[MOCK RECOVERY] Listening on port ${port}`);
  });
}

if (require.main === module) {
  startMockMl(8000);
  startMockRecovery(5002);
}

module.exports = {
  startMockMl,
  startMockRecovery
};

