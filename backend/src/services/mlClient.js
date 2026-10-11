const axios = require('axios');
const { config } = require('../config');

const ML_TIMEOUT_MS = 5000;

const FALLBACK_PREDICTION = {
  isAnomaly: false,
  anomalyScore: 0,
  failureProbability: 0,
  predictedFailureType: 'none',
  riskLevel: 'low',
  topFeatures: [],
  modelVersion: 'fallback'
};

async function predict(serverId, metrics) {
  try {
    const payload = {
      serverId,
      metrics: {
        cpuUsage: Number(metrics.cpuUsage),
        memoryUsage: Number(metrics.memoryUsage),
        diskUsage: Number(metrics.diskUsage),
        networkIn: Number(metrics.networkIn),
        networkOut: Number(metrics.networkOut),
        responseTimeMs: Number(metrics.responseTimeMs),
        errorRate: Number(metrics.errorRate),
        requestsPerSec: Number(metrics.requestsPerSec)
      }
    };

    const url = `${config.mlServiceUrl}/predict`;
    const response = await axios.post(url, payload, {
      timeout: ML_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && typeof response.data === 'object') {
      return {
        ...FALLBACK_PREDICTION,
        ...response.data
      };
    }
    return { ...FALLBACK_PREDICTION };
  } catch (err) {
    console.warn(`[BACKEND] ML service /predict error (${err.message}). Using fallback prediction.`);
    return { ...FALLBACK_PREDICTION };
  }
}

module.exports = {
  predict,
  FALLBACK_PREDICTION
};

