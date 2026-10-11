const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const SIM_HOST = process.env.SIM_HOST || 'localhost';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const COLLECT_INTERVAL_MS = parseInt(process.env.COLLECT_INTERVAL_MS || '5000', 10);
const SERVERS_FILE = process.env.SERVERS_FILE || '../shared/servers.json';
const AGENT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 6010;

const serversFilePath = path.resolve(process.cwd(), SERVERS_FILE);

function loadServers() {
  try {
    if (!fs.existsSync(serversFilePath)) {
      console.warn(`[AGENT] Warning: Servers file not found at ${serversFilePath}`);
      return [];
    }
    const data = fs.readFileSync(serversFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(`[AGENT] Warning: Error reading servers file: ${err.message}`);
    return [];
  }
}

async function collectMetricsForServer(server) {
  const simUrl = `http://${SIM_HOST}:${server.port}/metrics`;
  try {
    const getRes = await axios.get(simUrl, { timeout: 5000 });
    const metricData = getRes.data;

    try {
      const postRes = await axios.post(`${BACKEND_URL}/api/metrics`, metricData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log(
        `[AGENT] Relayed metrics for ${server.serverId} (: ${server.port}) -> Backend status ${postRes.status}`
      );
    } catch (postErr) {
      console.warn(
        `[AGENT] Warning: Failed to POST metrics for ${server.serverId} to backend (${BACKEND_URL}/api/metrics): ${postErr.message}`
      );
    }
  } catch (getErr) {
    console.warn(
      `[AGENT] Warning: Failed to GET metrics from ${server.serverId} (${simUrl}): ${getErr.message}`
    );
  }
}

async function runCollectionCycle() {
  const servers = loadServers();
  if (servers.length === 0) {
    console.warn('[AGENT] No servers found to monitor. Retrying next cycle...');
    return;
  }

  for (const server of servers) {
    await collectMetricsForServer(server);
  }
}

console.log(`[AGENT] Starting CloudGuardian Agent...`);
console.log(`[AGENT] SIM_HOST: ${SIM_HOST}`);
console.log(`[AGENT] BACKEND_URL: ${BACKEND_URL}`);
console.log(`[AGENT] Poll interval: ${COLLECT_INTERVAL_MS}ms`);

// Initial immediate run, then recurring timer
runCollectionCycle();
const intervalHandle = setInterval(runCollectionCycle, COLLECT_INTERVAL_MS);

// GET /health endpoint for contract conformance
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'agent' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(AGENT_PORT, () => {
  console.log(`[AGENT] Health endpoint listening on http://localhost:${AGENT_PORT}/health`);
});

process.on('SIGTERM', () => {
  clearInterval(intervalHandle);
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(intervalHandle);
  server.close();
  process.exit(0);
});
