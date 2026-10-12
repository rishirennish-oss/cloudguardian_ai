const assert = require('assert');
const axios = require('axios');

// Default ports & base URLs per shared/CONTRACT.md
const URLS = {
  simWeb: 'http://localhost:6001',
  simApi: 'http://localhost:6002',
  simDb: 'http://localhost:6003',
  simCache: 'http://localhost:6004',
  ml: 'http://localhost:8000',
  recovery: 'http://localhost:5002',
  backend: 'http://localhost:5000'
};

const VALID_ENUMS = {
  serverStatus: ['healthy', 'degraded', 'down'],
  riskLevel: ['low', 'medium', 'high', 'critical'],
  failureType: [
    'none',
    'cpu_overload',
    'memory_leak',
    'disk_full',
    'network_congestion',
    'service_crash'
  ],
  recoveryAction: [
    'none',
    'restart_service',
    'scale_up',
    'cleanup_disk',
    'throttle_traffic',
    'failover'
  ],
  alertStatus: ['open', 'recovering', 'resolved']
};

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
    results.push({ name, status: 'PASS' });
  } catch (err) {
    console.error(`[FAIL] ${name} -> ${err.message}`);
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
  }
}

async function runContractTests() {
  console.log('====================================================');
  console.log('       CloudGuardian AI - Contract Test Suite       ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. Health Checks
  // ----------------------------------------------------
  console.log('--- 1. Health Checks ---');

  await test('Simulator srv-web-01 GET /health (6001)', async () => {
    const res = await axios.get(`${URLS.simWeb}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'simulator');
    assert.strictEqual(res.data.serverId, 'srv-web-01');
  });

  await test('Simulator srv-api-01 GET /health (6002)', async () => {
    const res = await axios.get(`${URLS.simApi}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'simulator');
    assert.strictEqual(res.data.serverId, 'srv-api-01');
  });

  await test('Simulator srv-db-01 GET /health (6003)', async () => {
    const res = await axios.get(`${URLS.simDb}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'simulator');
    assert.strictEqual(res.data.serverId, 'srv-db-01');
  });

  await test('Simulator srv-cache-01 GET /health (6004)', async () => {
    const res = await axios.get(`${URLS.simCache}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'simulator');
    assert.strictEqual(res.data.serverId, 'srv-cache-01');
  });

  await test('ML Service GET /health (8000)', async () => {
    const res = await axios.get(`${URLS.ml}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'ml-service');
  });

  await test('Recovery Service GET /health (5002)', async () => {
    const res = await axios.get(`${URLS.recovery}/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'recovery-service');
  });

  await test('Backend GET /api/health (5000)', async () => {
    const res = await axios.get(`${URLS.backend}/api/health`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'backend');
  });

  console.log();

  // ----------------------------------------------------
  // 2. ML Service /predict Contract & Enums
  // ----------------------------------------------------
  console.log('--- 2. ML Service /predict Contract ---');

  await test('ML Service POST /predict keys and enum validation', async () => {
    const payload = {
      serverId: 'srv-web-01',
      metrics: {
        cpuUsage: 35.2,
        memoryUsage: 48.1,
        diskUsage: 52.0,
        networkIn: 220.5,
        networkOut: 180.3,
        responseTimeMs: 85,
        errorRate: 0.4,
        requestsPerSec: 240
      }
    };
    const res = await axios.post(`${URLS.ml}/predict`, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);

    const d = res.data;
    assert.strictEqual(d.serverId, 'srv-web-01');
    assert.strictEqual(typeof d.isAnomaly, 'boolean');
    assert.strictEqual(typeof d.anomalyScore, 'number');
    assert.strictEqual(typeof d.failureProbability, 'number');
    assert.strictEqual(typeof d.predictedFailureType, 'string');
    assert.strictEqual(typeof d.riskLevel, 'string');
    assert.ok(Array.isArray(d.topFeatures), 'topFeatures must be an array');
    assert.strictEqual(typeof d.modelVersion, 'string');

    // Enum validation
    assert.ok(
      VALID_ENUMS.riskLevel.includes(d.riskLevel),
      `riskLevel '${d.riskLevel}' not in ${JSON.stringify(VALID_ENUMS.riskLevel)}`
    );
    assert.ok(
      VALID_ENUMS.failureType.includes(d.predictedFailureType),
      `predictedFailureType '${d.predictedFailureType}' not in ${JSON.stringify(VALID_ENUMS.failureType)}`
    );

    if (d.topFeatures.length > 0) {
      assert.strictEqual(typeof d.topFeatures[0].feature, 'string');
      assert.strictEqual(typeof d.topFeatures[0].contribution, 'number');
    }
  });

  console.log();

  // ----------------------------------------------------
  // 3. Recovery Service Contract & Enums
  // ----------------------------------------------------
  console.log('--- 3. Recovery Service Contract ---');

  await test('Recovery Service POST /recover keys and enum validation', async () => {
    const payload = {
      serverId: 'srv-web-01',
      failureType: 'memory_leak',
      riskLevel: 'critical'
    };
    const res = await axios.post(`${URLS.recovery}/recover`, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);

    const d = res.data;
    assert.strictEqual(d.serverId, 'srv-web-01');
    assert.strictEqual(typeof d.action, 'string');
    assert.strictEqual(typeof d.success, 'boolean');
    assert.strictEqual(typeof d.message, 'string');
    assert.strictEqual(typeof d.executedAt, 'string');
    assert.strictEqual(typeof d.durationMs, 'number');

    assert.ok(
      VALID_ENUMS.recoveryAction.includes(d.action),
      `action '${d.action}' not in ${JSON.stringify(VALID_ENUMS.recoveryAction)}`
    );
    // executedAt should be a valid ISO 8601 string
    assert.ok(!isNaN(Date.parse(d.executedAt)), 'executedAt must be valid ISO timestamp');
  });

  await test('Recovery Service POST /explain keys validation', async () => {
    const payload = {
      serverId: 'srv-web-01',
      metrics: {
        serverId: 'srv-web-01',
        timestamp: new Date().toISOString(),
        cpuUsage: 35.2,
        memoryUsage: 96.0,
        diskUsage: 52.0,
        networkIn: 220.5,
        networkOut: 180.3,
        responseTimeMs: 900,
        errorRate: 0.4,
        requestsPerSec: 240,
        status: 'degraded'
      },
      prediction: {
        serverId: 'srv-web-01',
        isAnomaly: true,
        anomalyScore: 0.82,
        failureProbability: 0.91,
        predictedFailureType: 'memory_leak',
        riskLevel: 'critical',
        topFeatures: [{ feature: 'memoryUsage', contribution: 0.46 }],
        modelVersion: '1.0.0'
      },
      recovery: {
        serverId: 'srv-web-01',
        action: 'restart_service',
        success: true,
        message: 'Recovery action accepted',
        executedAt: new Date().toISOString(),
        durationMs: 45
      }
    };
    const res = await axios.post(`${URLS.recovery}/explain`, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);

    const d = res.data;
    assert.strictEqual(typeof d.explanation, 'string');
    assert.strictEqual(typeof d.severity, 'string');
    assert.ok(Array.isArray(d.recommendedActions), 'recommendedActions must be an array');
    assert.ok(
      ['template', 'llm'].includes(d.generatedBy),
      `generatedBy '${d.generatedBy}' must be 'template' or 'llm'`
    );
    assert.ok(
      VALID_ENUMS.riskLevel.includes(d.severity),
      `severity '${d.severity}' not in ${JSON.stringify(VALID_ENUMS.riskLevel)}`
    );
  });

  console.log();

  // ----------------------------------------------------
  // 4. Backend Endpoints Contract ({success:true, data})
  // ----------------------------------------------------
  console.log('--- 4. Backend API Endpoints ({success:true, data}) ---');

  await test('Backend GET /api/servers shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/servers`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'data must be an array of servers');
    assert.ok(res.data.data.length > 0, 'servers array must not be empty');

    const s = res.data.data[0];
    assert.strictEqual(typeof s.serverId, 'string');
    assert.strictEqual(typeof s.name, 'string');
    assert.strictEqual(typeof s.type, 'string');
    assert.ok(
      VALID_ENUMS.serverStatus.includes(s.status),
      `server status '${s.status}' not in enum`
    );
    assert.ok(
      VALID_ENUMS.riskLevel.includes(s.riskLevel),
      `server riskLevel '${s.riskLevel}' not in enum`
    );
    assert.strictEqual(typeof s.failureProbability, 'number');
    assert.ok(s.lastUpdated !== undefined, 'lastUpdated must be present');
  });

  await test('Backend GET /api/servers/:serverId shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/servers/srv-web-01`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const s = res.data.data;
    assert.strictEqual(s.serverId, 'srv-web-01');
    assert.strictEqual(typeof s.name, 'string');
    assert.strictEqual(typeof s.type, 'string');
    assert.ok(VALID_ENUMS.serverStatus.includes(s.status));
    assert.ok(VALID_ENUMS.riskLevel.includes(s.riskLevel));
  });

  await test('Backend GET /api/servers/:serverId/metrics?limit=50 shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/servers/srv-web-01/metrics?limit=50`, {
      timeout: 5000
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'metrics data must be an array');
  });

  await test('Backend GET /api/alerts shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/alerts`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'alerts data must be an array');
    if (res.data.data.length > 0) {
      const a = res.data.data[0];
      assert.strictEqual(typeof a.serverId, 'string');
      assert.ok(VALID_ENUMS.riskLevel.includes(a.riskLevel));
      assert.ok(VALID_ENUMS.alertStatus.includes(a.status));
    }
  });

  await test('Backend GET /api/recoveries?limit=50 shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/recoveries?limit=50`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'recoveries data must be an array');
    if (res.data.data.length > 0) {
      const r = res.data.data[0];
      assert.strictEqual(typeof r.serverId, 'string');
      assert.ok(VALID_ENUMS.recoveryAction.includes(r.action));
      assert.strictEqual(typeof r.success, 'boolean');
    }
  });

  await test('Backend GET /api/stats/summary shape validation', async () => {
    const res = await axios.get(`${URLS.backend}/api/stats/summary`, { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const d = res.data.data;
    assert.strictEqual(typeof d.totalServers, 'number');
    assert.strictEqual(typeof d.healthyServers, 'number');
    assert.strictEqual(typeof d.degradedServers, 'number');
    assert.strictEqual(typeof d.downServers, 'number');
    assert.strictEqual(typeof d.openAlerts, 'number');
    assert.strictEqual(typeof d.recoveriesToday, 'number');
    assert.strictEqual(typeof d.successfulRecoveries, 'number');
    assert.strictEqual(typeof d.avgRecoveryTimeMs, 'number');
    assert.strictEqual(typeof d.uptimePercent, 'number');
  });

  console.log('\n====================================================');
  console.log(`Summary: Total ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runContractTests().catch((err) => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});
