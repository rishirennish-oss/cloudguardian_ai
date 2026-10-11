const { getServerById } = require('../config');
const simulatorClient = require('./simulatorClient');

// Safety rules
const RULES = {
  cooldownMs: 60 * 1000,              // 60 seconds cooldown per server
  rateLimitWindowMs: 10 * 60 * 1000,  // 10 minutes window
  maxActionsPerWindow: 3,             // Maximum 3 actions per server per 10 minutes
  disallowedRiskLevels: ['low', 'medium'] // Risk below threshold
};

// Contract mapping: failureType -> recoveryAction
const FAILURE_ACTION_MAP = {
  cpu_overload: 'scale_up',
  memory_leak: 'restart_service',
  disk_full: 'cleanup_disk',
  network_congestion: 'throttle_traffic',
  service_crash: 'restart_service',
  none: 'none'
};

// In-memory tracking for safety rules & history
const serverLastActionTime = new Map();  // serverId -> timestamp (ms)
const serverActionWindows = new Map();   // serverId -> Array<timestamp (ms)>
const actionHistory = [];                // Last 50 actions (newest first)

function recordHistory(entry) {
  actionHistory.unshift(entry);
  if (actionHistory.length > 50) {
    actionHistory.pop();
  }
}

function getHistory() {
  return [...actionHistory];
}

/**
 * Execute or evaluate recovery action for a server.
 *
 * @param {Object} params
 * @param {string} params.serverId
 * @param {string} params.failureType
 * @param {string} params.riskLevel
 * @returns {Promise<Object>}
 */
async function recover({ serverId, failureType, riskLevel }) {
  const startTime = Date.now();
  const executedAt = new Date().toISOString();

  // 1. Unknown serverId -> 404
  const server = getServerById(serverId);
  if (!server) {
    return {
      notFound: true,
      error: 'unknown serverId'
    };
  }

  // 2. Safety rule: do nothing if riskLevel is low/medium
  const normalizedRisk = (riskLevel || '').toLowerCase();
  if (!riskLevel || RULES.disallowedRiskLevels.includes(normalizedRisk)) {
    const result = {
      serverId,
      action: 'none',
      success: false,
      message: 'risk below threshold',
      executedAt,
      durationMs: Date.now() - startTime
    };
    recordHistory(result);
    return result;
  }

  const now = Date.now();

  // 3. Safety rule: cooldown 60s per server
  const lastTime = serverLastActionTime.get(serverId);
  if (lastTime && now - lastTime < RULES.cooldownMs) {
    const result = {
      serverId,
      action: 'none',
      success: false,
      message: 'cooldown active',
      executedAt,
      durationMs: Date.now() - startTime
    };
    recordHistory(result);
    return result;
  }

  // 4. Safety rule: max 3 actions per server per 10 minutes
  const activeWindow = (serverActionWindows.get(serverId) || []).filter(
    (t) => now - t < RULES.rateLimitWindowMs
  );
  serverActionWindows.set(serverId, activeWindow);

  if (activeWindow.length >= RULES.maxActionsPerWindow) {
    const result = {
      serverId,
      action: 'none',
      success: false,
      message: 'cooldown active', // Or rate limit reached, keeps action none & success false
      executedAt,
      durationMs: Date.now() - startTime
    };
    recordHistory(result);
    return result;
  }

  // 5. Pick action using failureType -> recoveryAction map
  const targetAction = FAILURE_ACTION_MAP[failureType] || 'none';
  if (targetAction === 'none') {
    const result = {
      serverId,
      action: 'none',
      success: false,
      message: 'no recovery action mapped',
      executedAt,
      durationMs: Date.now() - startTime
    };
    recordHistory(result);
    return result;
  }

  // Record action attempt for cooldown and rate limit window
  serverLastActionTime.set(serverId, Date.now());
  activeWindow.push(Date.now());
  serverActionWindows.set(serverId, activeWindow);

  let currentAction = targetAction;
  let simResult;

  try {
    simResult = await simulatorClient.executeRecovery(server, currentAction);

    // For service_crash, if restart_service fails retry once with "failover"
    if (failureType === 'service_crash' && (!simResult || !simResult.success)) {
      currentAction = 'failover';
      simResult = await simulatorClient.executeRecovery(server, currentAction);
    }
  } catch (err) {
    // Simulator client never throws, but double-guarantee catch
    simResult = {
      success: false,
      message: `Simulator unreachable: ${err.message}`
    };
  }

  const durationMs = Date.now() - startTime;
  const finalResponse = {
    serverId,
    action: currentAction,
    success: Boolean(simResult && simResult.success),
    message:
      simResult?.message ||
      (simResult?.success ? 'Recovery action accepted' : 'Recovery action failed'),
    executedAt,
    durationMs
  };

  recordHistory(finalResponse);
  return finalResponse;
}

module.exports = {
  RULES,
  FAILURE_ACTION_MAP,
  recover,
  getHistory
};

