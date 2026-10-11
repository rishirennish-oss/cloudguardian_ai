const axios = require('axios');
const { config } = require('../config');

// Baseline ranges from shared/CONTRACT.md
const HEALTHY_RANGES = {
  cpuUsage: { min: 20, max: 45, unit: '%' },
  memoryUsage: { min: 30, max: 55, unit: '%' },
  diskUsage: { min: 40, max: 60, unit: '%' },
  networkIn: { min: 100, max: 400, unit: ' Mbps' },
  networkOut: { min: 80, max: 350, unit: ' Mbps' },
  responseTimeMs: { min: 40, max: 200, unit: ' ms' },
  errorRate: { min: 0, max: 2, unit: '%' },
  requestsPerSec: { min: 50, max: 500, unit: ' req/s' }
};

// 2-3 short human follow-ups per failureType
const RECOMMENDED_ACTIONS = {
  cpu_overload: [
    'Inspect recent code deployments and worker threads for unoptimized CPU loops.',
    'Verify auto-scaling thresholds and container CPU resource allocations.',
    'Monitor active database queries and worker thread pool saturation.'
  ],
  memory_leak: [
    'Inspect heap dumps and memory profiles for uncollected object references.',
    'Monitor garbage collection pauses and memory consumption trends.',
    'Check recent code releases for caching or event listener leaks.'
  ],
  disk_full: [
    'Rotate or truncate old system and application logs.',
    'Purge temporary directories and unused docker containers or caches.',
    'Verify volume expansion policies and automated cleanup cron jobs.'
  ],
  network_congestion: [
    'Inspect network traffic patterns and investigate high-bandwidth consumers.',
    'Enable rate limiting, traffic throttling, or CDN caching.',
    'Check for DDoS patterns or runaway client retry loops.'
  ],
  service_crash: [
    'Examine core dumps and crash logs for unhandled exceptions or segfaults.',
    'Review process supervisor restart policies and health check thresholds.',
    'Verify upstream dependency availability and database connection pools.'
  ],
  none: [
    'Continue routine monitoring of server health and telemetry baselines.',
    'Ensure periodic backup schedules and monitoring alarms are active.'
  ]
};

function formatDeviation(key, val, range) {
  const rounded = typeof val === 'number' ? (Number.isInteger(val) ? val : Math.round(val * 10) / 10) : val;
  switch (key) {
    case 'memoryUsage':
      return `memory at ${rounded}% (normal ${range.min}-${range.max}%)`;
    case 'cpuUsage':
      return `CPU at ${rounded}% (normal ${range.min}-${range.max}%)`;
    case 'diskUsage':
      return `disk at ${rounded}% (normal ${range.min}-${range.max}%)`;
    case 'responseTimeMs':
      return `response time of ${rounded} ms`;
    case 'errorRate':
      return `error rate at ${rounded}% (normal ${range.min}-${range.max}%)`;
    case 'networkIn':
      return `network inbound traffic at ${rounded} Mbps (normal ${range.min}-${range.max} Mbps)`;
    case 'networkOut':
      return `network outbound traffic at ${rounded} Mbps (normal ${range.min}-${range.max} Mbps)`;
    case 'requestsPerSec':
      return `requests at ${rounded} req/s (normal ${range.min}-${range.max} req/s)`;
    default:
      return `${key} at ${rounded}`;
  }
}

/**
 * Build template explanation and optionally refine with Claude API if ANTHROPIC_API_KEY is present.
 *
 * @param {Object} params
 * @param {string} params.serverId
 * @param {Object} params.metrics
 * @param {Object} params.prediction
 * @param {Object|null} params.recovery
 * @returns {Promise<{ explanation: string, severity: string, recommendedActions: string[], generatedBy: "template"|"llm" }>}
 */
async function explain({ serverId, metrics = {}, prediction = {}, recovery = null }) {
  const targetServerId = serverId || metrics.serverId || prediction.serverId || 'unknown-server';

  // 1. Identify deviating metrics
  const deviations = [];
  const processedKeys = new Set();

  // If topFeatures present, prioritize them
  if (Array.isArray(prediction?.topFeatures) && prediction.topFeatures.length > 0) {
    for (const item of prediction.topFeatures) {
      const featKey = typeof item === 'string' ? item : (item.feature || item.name);
      if (featKey && HEALTHY_RANGES[featKey] && metrics[featKey] !== undefined) {
        const val = metrics[featKey];
        const range = HEALTHY_RANGES[featKey];
        if (val < range.min || val > range.max) {
          deviations.push(formatDeviation(featKey, val, range));
          processedKeys.add(featKey);
        }
      }
    }
  }

  // Scan remaining metrics for deviations
  for (const [key, range] of Object.entries(HEALTHY_RANGES)) {
    if (!processedKeys.has(key) && metrics[key] !== undefined) {
      const val = metrics[key];
      if (val < range.min || val > range.max) {
        deviations.push(formatDeviation(key, val, range));
        processedKeys.add(key);
      }
    }
  }

  let devSentencePart = 'metrics within normal operational baselines';
  if (deviations.length === 1) {
    devSentencePart = deviations[0];
  } else if (deviations.length === 2) {
    devSentencePart = `${deviations[0]} and ${deviations[1]}`;
  } else if (deviations.length > 2) {
    devSentencePart = `${deviations.slice(0, -1).join(', ')}, and ${deviations[deviations.length - 1]}`;
  }

  const sentence1 = `Server ${targetServerId} shows ${devSentencePart}.`;

  // 2. Prediction summary
  const failureType = prediction.predictedFailureType || prediction.failureType || 'none';
  const rawProb = prediction.failureProbability != null ? prediction.failureProbability : 0;
  const probPercent = rawProb <= 1 ? Math.round(rawProb * 100) : Math.round(rawProb);
  const riskLevel = prediction.riskLevel || 'low';
  const sentence2 = `The AI model predicts ${failureType} with ${probPercent}% probability (risk: ${riskLevel}).`;

  // 3. Action taken & result (if recovery present)
  let sentence3 = '';
  if (recovery && recovery.action) {
    const statusText = recovery.success ? 'success' : 'failed';
    sentence3 = `Action taken: ${recovery.action} - ${statusText}.`;
  }

  const sentences = [sentence1, sentence2];
  if (sentence3) {
    sentences.push(sentence3);
  }
  const templateExplanation = sentences.join(' ');

  const severity = prediction.riskLevel || 'low';
  const recommendedActions = RECOMMENDED_ACTIONS[failureType] || RECOMMENDED_ACTIONS.none;

  let finalExplanation = templateExplanation;
  let generatedBy = 'template';

  // Optional: Claude API rewrite
  const apiKey = (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '').trim();
  if (apiKey) {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `Rewrite the following incident explanation in plain, concise English for an operations dashboard (maximum 120 words):\n\n${templateExplanation}`
            }
          ]
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 8000
        }
      );

      const llmText = response.data?.content?.[0]?.text?.trim();
      if (llmText) {
        finalExplanation = llmText;
        generatedBy = 'llm';
      }
    } catch (err) {
      // Fallback silently to template
      generatedBy = 'template';
    }
  }

  return {
    explanation: finalExplanation,
    severity,
    recommendedActions,
    generatedBy
  };
}

module.exports = {
  HEALTHY_RANGES,
  RECOMMENDED_ACTIONS,
  explain
};
