const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SERVER_ID = 'srv-web-01';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 180000; // 180 seconds

const FAULT_TYPES = [
  'cpu_overload',
  'memory_leak',
  'disk_full',
  'network_congestion',
  'service_crash'
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetAndEnsureHealthy(serverId) {
  console.log(`[E2E] Resetting ${serverId} to healthy state...`);
  try {
    await axios.post(
      `${BACKEND_URL}/api/simulate/reset`,
      { serverId },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.warn(`[E2E] Reset warning: ${err.message}`);
  }

  // Poll server state until healthy or 30s timeout
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/servers/${serverId}`, { timeout: 5000 });
      const s = res.data?.data;
      if (s && s.status === 'healthy') {
        console.log(`[E2E] ${serverId} verified healthy (status: healthy, risk: ${s.riskLevel}).`);
        // Additional 5s stabilization buffer
        await sleep(5000);
        return true;
      }
    } catch (_) {}
    await sleep(2000);
  }
  console.warn(`[E2E] Warning: ${serverId} did not report healthy within 30s; proceeding anyway.`);
  return false;
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('        CloudGuardian AI - End-to-End Fault Remediation         ');
  console.log('================================================================\n');

  const performanceResults = [];

  for (const faultType of FAULT_TYPES) {
    console.log(`\n>>> Testing Fault Scenario: ${faultType.toUpperCase()} on ${SERVER_ID}`);
    await resetAndEnsureHealthy(SERVER_ID);

    const faultStartTime = Date.now();
    console.log(`[E2E] Injecting fault ${faultType} at ${new Date(faultStartTime).toISOString()}...`);

    try {
      const faultRes = await axios.post(
        `${BACKEND_URL}/api/simulate/fault`,
        { serverId: SERVER_ID, faultType },
        { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
      );
      if (!faultRes.data?.success) {
        console.error(`[E2E] Failed to inject fault:`, faultRes.data);
      }
    } catch (err) {
      console.error(`[E2E] Error triggering fault simulation: ${err.message}`);
    }

    let detectionTimeSec = null;
    let recoveryTimeSec = null;
    let finalServerStatus = 'unknown';
    let alertCreatedAtMs = null;
    let alertResolvedAtMs = null;
    let actionTaken = 'none';
    let resolved = false;

    const pollStart = Date.now();

    while (Date.now() - pollStart < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const [alertsRes, serverRes, recoveriesRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/alerts`, { timeout: 5000 }),
          axios.get(`${BACKEND_URL}/api/servers/${SERVER_ID}`, { timeout: 5000 }),
          axios.get(`${BACKEND_URL}/api/recoveries?limit=10`, { timeout: 5000 })
        ]);

        const alerts = alertsRes.data?.data || [];
        const server = serverRes.data?.data;
        const recoveries = recoveriesRes.data?.data || [];

        // Find alert triggered for this fault after faultStartTime
        const matchingAlert = alerts.find((a) => {
          if (a.serverId !== SERVER_ID) return false;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return aTime >= faultStartTime - 3000 && a.failureType === faultType;
        });

        if (matchingAlert && detectionTimeSec === null) {
          alertCreatedAtMs = matchingAlert.createdAt
            ? new Date(matchingAlert.createdAt).getTime()
            : Date.now();
          detectionTimeSec = Math.max(1, ((alertCreatedAtMs - faultStartTime) / 1000).toFixed(1));
          console.log(
            `[E2E] [DETECTION] Alert created in ${detectionTimeSec}s (Risk: ${matchingAlert.riskLevel}, Status: ${matchingAlert.status})`
          );
        }

        if (matchingAlert && matchingAlert.status === 'resolved') {
          alertResolvedAtMs = matchingAlert.resolvedAt
            ? new Date(matchingAlert.resolvedAt).getTime()
            : Date.now();
          recoveryTimeSec = Math.max(
            1,
            ((alertResolvedAtMs - (alertCreatedAtMs || faultStartTime)) / 1000).toFixed(1)
          );
          finalServerStatus = server?.status || 'healthy';

          const matchingRecovery = recoveries.find(
            (r) => r.serverId === SERVER_ID && r.alertId === matchingAlert._id
          ) || recoveries.find((r) => r.serverId === SERVER_ID);

          if (matchingRecovery) {
            actionTaken = matchingRecovery.action;
          }

          console.log(
            `[E2E] [RECOVERY] Alert resolved in ${recoveryTimeSec}s. Action: ${actionTaken}. Final server status: ${finalServerStatus}`
          );
          resolved = true;
          break;
        }

        const elapsedSec = Math.round((Date.now() - pollStart) / 1000);
        process.stdout.write(`[E2E] Waiting for resolution... elapsed: ${elapsedSec}s\r`);
      } catch (pollErr) {
        console.warn(`[E2E] Polling error: ${pollErr.message}`);
      }
    }

    const totalTimeSec =
      detectionTimeSec !== null && recoveryTimeSec !== null
        ? (parseFloat(detectionTimeSec) + parseFloat(recoveryTimeSec)).toFixed(1)
        : 'N/A';

    performanceResults.push({
      faultType,
      detectionTimeSec: detectionTimeSec !== null ? `${detectionTimeSec}s` : 'TIMEOUT',
      recoveryTimeSec: recoveryTimeSec !== null ? `${recoveryTimeSec}s` : 'TIMEOUT',
      totalTimeSec: totalTimeSec !== 'N/A' ? `${totalTimeSec}s` : 'TIMEOUT',
      actionTaken,
      finalServerStatus,
      status: resolved ? 'PASS' : 'FAIL'
    });
  }

  // Print Results Table
  console.log('\n\n========================================================================================');
  console.log('                            E2E PERFORMANCE BENCHMARK RESULTS                           ');
  console.log('========================================================================================\n');

  console.table(performanceResults);

  console.log('\nMarkdown Results Table:\n');
  console.log('| Fault Type | Detection Time | Recovery Time | Total Time | Action Taken | Final Status | Result |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of performanceResults) {
    console.log(
      `| \`${r.faultType}\` | ${r.detectionTimeSec} | ${r.recoveryTimeSec} | ${r.totalTimeSec} | \`${r.actionTaken}\` | \`${r.finalServerStatus}\` | **${r.status}** |`
    );
  }

  const allPassed = performanceResults.every((r) => r.status === 'PASS');
  console.log(`\nOverall E2E Status: ${allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal E2E runner failure:', err);
  process.exit(1);
});

