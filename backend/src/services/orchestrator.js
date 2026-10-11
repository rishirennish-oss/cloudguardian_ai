const Metric = require('../models/Metric');
const Server = require('../models/Server');
const Alert = require('../models/Alert');
const RecoveryAction = require('../models/RecoveryAction');
const mlClient = require('./mlClient');
const recoveryClient = require('./recoveryClient');
const { getServerById } = require('../config');

const REQUIRED_NUMERIC_FIELDS = [
  'cpuUsage',
  'memoryUsage',
  'diskUsage',
  'networkIn',
  'networkOut',
  'responseTimeMs',
  'errorRate',
  'requestsPerSec'
];

function validateMetricInput(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Metric payload must be a JSON object' };
  }

  const { serverId } = data;
  if (!serverId || typeof serverId !== 'string') {
    return { valid: false, error: 'Field serverId is required and must be a string' };
  }

  const knownServer = getServerById(serverId);
  if (!knownServer) {
    return { valid: false, error: `Unknown serverId: ${serverId}` };
  }

  for (const field of REQUIRED_NUMERIC_FIELDS) {
    if (data[field] === undefined || data[field] === null || typeof data[field] !== 'number' || isNaN(data[field])) {
      return { valid: false, error: `Field '${field}' is required and must be a number` };
    }
  }

  return { valid: true };
}

async function processMetric(metricData) {
  try {
    const { serverId } = metricData;

    // 1. Save Metric
    const metricDoc = new Metric({
      serverId,
      timestamp: metricData.timestamp ? new Date(metricData.timestamp) : new Date(),
      cpuUsage: Number(metricData.cpuUsage),
      memoryUsage: Number(metricData.memoryUsage),
      diskUsage: Number(metricData.diskUsage),
      networkIn: Number(metricData.networkIn),
      networkOut: Number(metricData.networkOut),
      responseTimeMs: Number(metricData.responseTimeMs),
      errorRate: Number(metricData.errorRate),
      requestsPerSec: Number(metricData.requestsPerSec),
      status: metricData.status || 'healthy'
    });
    const savedMetric = await metricDoc.save();
    const metricJson = savedMetric.toJSON();

    // 2. Call ML /predict
    const prediction = await mlClient.predict(serverId, metricJson);

    const riskLevel = prediction.riskLevel || 'low';
    const failureProbability =
      typeof prediction.failureProbability === 'number' ? prediction.failureProbability : 0;
    const serverStatus = metricData.status || 'healthy';

    // 3. Update Server
    await Server.findOneAndUpdate(
      { serverId },
      {
        $set: {
          status: serverStatus,
          riskLevel,
          failureProbability,
          latestMetrics: metricJson,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );

    // 4. Auto-resolve open/recovering alerts when status healthy and riskLevel low
    if (serverStatus === 'healthy' && riskLevel === 'low') {
      await Alert.updateMany(
        {
          serverId,
          status: { $in: ['open', 'recovering'] }
        },
        {
          $set: {
            status: 'resolved',
            resolvedAt: new Date()
          }
        }
      );
    }

    // 5. If riskLevel high/critical -> check duplicate/cooldown -> create Alert & trigger Recovery
    if (riskLevel === 'high' || riskLevel === 'critical') {
      const activeAlert = await Alert.findOne({
        serverId,
        status: { $in: ['open', 'recovering'] }
      });

      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const recentlyResolved = await Alert.findOne({
        serverId,
        status: 'resolved',
        resolvedAt: { $gte: thirtySecondsAgo }
      });

      if (!activeAlert && !recentlyResolved) {
        // Create initial alert
        const alert = new Alert({
          serverId,
          riskLevel,
          failureType: prediction.predictedFailureType || 'none',
          failureProbability,
          anomalyScore: typeof prediction.anomalyScore === 'number' ? prediction.anomalyScore : 0,
          explanation: '',
          recommendedActions: [],
          status: 'recovering',
          createdAt: new Date(),
          resolvedAt: null
        });
        await alert.save();

        // Call recovery
        const recoveryResult = await recoveryClient.recover(
          serverId,
          prediction.predictedFailureType,
          riskLevel
        );

        // Save RecoveryAction
        const recoveryAction = new RecoveryAction({
          alertId: alert._id,
          serverId,
          action: recoveryResult.action || 'none',
          success: Boolean(recoveryResult.success),
          message: recoveryResult.message || '',
          executedAt: recoveryResult.executedAt ? new Date(recoveryResult.executedAt) : new Date(),
          durationMs: typeof recoveryResult.durationMs === 'number' ? recoveryResult.durationMs : 0
        });
        await recoveryAction.save();

        // Call explain
        const explainResult = await recoveryClient.explain(
          serverId,
          metricJson,
          prediction,
          recoveryResult
        );

        // Update Alert with explanation, recommendations, and status
        alert.explanation = explainResult.explanation || 'Explanation unavailable';
        alert.recommendedActions = Array.isArray(explainResult.recommendedActions)
          ? explainResult.recommendedActions
          : [];

        if (recoveryResult.success) {
          alert.status = 'resolved';
          alert.resolvedAt = new Date();
        } else {
          alert.status = 'open';
        }
        await alert.save();
      }
    }

    return {
      metric: metricJson,
      prediction
    };
  } catch (err) {
    console.error(`[BACKEND] Error in orchestrator processMetric: ${err.message}`, err);
    // Never crash out of a request
    return {
      metric: metricData,
      prediction: mlClient.FALLBACK_PREDICTION
    };
  }
}

module.exports = {
  validateMetricInput,
  processMetric
};

