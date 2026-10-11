const axios = require('axios');
const { config } = require('../config');

const RECOVERY_TIMEOUT_MS = 5000;

async function recover(serverId, failureType, riskLevel) {
  try {
    const url = `${config.recoveryServiceUrl}/recover`;
    const payload = {
      serverId,
      failureType: failureType || 'none',
      riskLevel: riskLevel || 'low'
    };

    const response = await axios.post(url, payload, {
      timeout: RECOVERY_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && typeof response.data === 'object') {
      return {
        action: response.data.action || 'none',
        success: Boolean(response.data.success),
        message: response.data.message || '',
        executedAt: response.data.executedAt || new Date().toISOString(),
        durationMs: typeof response.data.durationMs === 'number' ? response.data.durationMs : 0
      };
    }

    return {
      action: 'none',
      success: false,
      message: 'Empty response from recovery-service',
      executedAt: new Date().toISOString(),
      durationMs: 0
    };
  } catch (err) {
    console.warn(`[BACKEND] Recovery service /recover error (${err.message}). Using fallback.`);
    return {
      action: 'none',
      success: false,
      message: 'recovery-service unavailable',
      executedAt: new Date().toISOString(),
      durationMs: 0
    };
  }
}

async function explain(serverId, metrics, prediction, recovery) {
  try {
    const url = `${config.recoveryServiceUrl}/explain`;
    const payload = {
      serverId,
      metrics,
      prediction,
      recovery
    };

    const response = await axios.post(url, payload, {
      timeout: RECOVERY_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && typeof response.data === 'object') {
      return {
        explanation: response.data.explanation || 'Explanation unavailable',
        severity: response.data.severity || prediction?.riskLevel || 'low',
        recommendedActions: Array.isArray(response.data.recommendedActions)
          ? response.data.recommendedActions
          : [],
        generatedBy: response.data.generatedBy || 'template'
      };
    }

    return {
      explanation: 'Explanation unavailable',
      severity: prediction?.riskLevel || 'low',
      recommendedActions: [],
      generatedBy: 'template'
    };
  } catch (err) {
    console.warn(`[BACKEND] Recovery service /explain error (${err.message}). Using fallback.`);
    return {
      explanation: 'Explanation unavailable',
      severity: prediction?.riskLevel || 'low',
      recommendedActions: [],
      generatedBy: 'template'
    };
  }
}

module.exports = {
  recover,
  explain
};

