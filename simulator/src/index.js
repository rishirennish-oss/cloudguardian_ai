const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function resolveServersFilePath() {
  const envVal = process.env.SERVERS_FILE || '../shared/servers.json';
  const resolved = path.resolve(process.cwd(), envVal);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  const fallbackCandidates = [
    path.resolve(process.cwd(), 'shared/servers.json'),
    path.resolve(__dirname, '../../shared/servers.json'),
    path.resolve(__dirname, '../shared/servers.json'),
    '/app/shared/servers.json'
  ];
  for (const candidate of fallbackCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return resolved;
}

const serversFilePath = resolveServersFilePath();

if (!fs.existsSync(serversFilePath)) {
  console.error(`FATAL: Servers config file not found at: ${serversFilePath}`);
  process.exit(1);
}

const serversConfig = JSON.parse(fs.readFileSync(serversFilePath, 'utf8'));

const HEALTHY_BASELINES = {
  cpuUsage: { min: 20, max: 45, default: 32.5, noise: 1.5 },
  memoryUsage: { min: 30, max: 55, default: 42.0, noise: 1.0 },
  diskUsage: { min: 40, max: 60, default: 48.0, drift: 0.01 },
  networkIn: { min: 100, max: 400, default: 220.0, noise: 10.0 },
  networkOut: { min: 80, max: 350, default: 180.0, noise: 8.0 },
  responseTimeMs: { min: 40, max: 200, default: 85, noise: 5 },
  errorRate: { min: 0.0, max: 2.0, default: 0.4, noise: 0.1 },
  requestsPerSec: { min: 50, max: 500, default: 240, noise: 15 }
};

const FAULT_TARGETS = {
  cpu_overload: {
    cpuUsage: 95.0,
    responseTimeMs: 1500,
    requestsPerSec: 30
  },
  memory_leak: {
    memoryUsage: 97.0,
    responseTimeMs: 900
  },
  disk_full: {
    diskUsage: 98.0,
    errorRate: 10.0
  },
  network_congestion: {
    networkIn: 900.0,
    networkOut: 900.0,
    responseTimeMs: 1800,
    errorRate: 12.0
  },
  service_crash: {
    cpuUsage: 0.0,
    requestsPerSec: 0,
    errorRate: 100.0,
    responseTimeMs: 5000
  }
};

const FAULT_ACTION_MAP = {
  cpu_overload: 'scale_up',
  memory_leak: 'restart_service',
  disk_full: 'cleanup_disk',
  network_congestion: 'throttle_traffic',
  service_crash: 'restart_service'
};

function createInitialState(serverConfig) {
  return {
    serverId: serverConfig.serverId,
    name: serverConfig.name,
    type: serverConfig.type,
    port: serverConfig.port,
    metrics: {
      cpuUsage: HEALTHY_BASELINES.cpuUsage.default,
      memoryUsage: HEALTHY_BASELINES.memoryUsage.default,
      diskUsage: HEALTHY_BASELINES.diskUsage.default,
      networkIn: HEALTHY_BASELINES.networkIn.default,
      networkOut: HEALTHY_BASELINES.networkOut.default,
      responseTimeMs: HEALTHY_BASELINES.responseTimeMs.default,
      errorRate: HEALTHY_BASELINES.errorRate.default,
      requestsPerSec: HEALTHY_BASELINES.requestsPerSec.default,
      status: 'healthy'
    },
    activeFault: null,
    faultTicks: 0,
    faultInitialMetrics: null,
    isRecovering: false,
    recoveryTicks: 0,
    recoveryInitialMetrics: null
  };
}

const serverStates = new Map();

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function roundTo(val, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function calculateStatus(state) {
  if (state.activeFault === 'service_crash') {
    return 'down';
  }
  const m = state.metrics;
  if (
    m.cpuUsage > 85 ||
    m.memoryUsage > 85 ||
    m.diskUsage > 90 ||
    m.errorRate > 5 ||
    m.responseTimeMs > 1000
  ) {
    return 'degraded';
  }
  return 'healthy';
}

function updateServerState(state) {
  const m = state.metrics;

  if (state.isRecovering) {
    state.recoveryTicks += 1;
    const progress = Math.min(1, state.recoveryTicks / 5.0);

    const init = state.recoveryInitialMetrics;
    const keys = [
      'cpuUsage',
      'memoryUsage',
      'diskUsage',
      'networkIn',
      'networkOut',
      'responseTimeMs',
      'errorRate',
      'requestsPerSec'
    ];

    keys.forEach((key) => {
      const targetVal = HEALTHY_BASELINES[key].default;
      const initialVal = init[key];
      m[key] = initialVal + (targetVal - initialVal) * progress;
    });

    if (progress >= 1.0) {
      state.isRecovering = false;
      state.recoveryTicks = 0;
      state.recoveryInitialMetrics = null;
      state.activeFault = null;
      state.faultTicks = 0;
      state.faultInitialMetrics = null;
    }
  } else if (state.activeFault === 'service_crash') {
    m.cpuUsage = 0;
    m.requestsPerSec = 0;
    m.errorRate = 100;
    m.responseTimeMs = 5000;
  } else if (state.activeFault && FAULT_TARGETS[state.activeFault]) {
    state.faultTicks += 1;
    const progress = Math.min(1, state.faultTicks / 60.0);
    const targets = FAULT_TARGETS[state.activeFault];
    const init = state.faultInitialMetrics;

    Object.keys(targets).forEach((key) => {
      const targetVal = targets[key];
      const initialVal = init[key];
      m[key] = initialVal + (targetVal - initialVal) * progress;
    });

    // Unaffected metrics drift gently within healthy bounds
    Object.keys(HEALTHY_BASELINES).forEach((key) => {
      if (!targets.hasOwnProperty(key)) {
        const cfg = HEALTHY_BASELINES[key];
        if (key === 'diskUsage') {
          m.diskUsage += cfg.drift;
          if (m.diskUsage > cfg.max) m.diskUsage = cfg.min;
        } else {
          const noise = (Math.random() - 0.5) * (cfg.noise || 1);
          m[key] = clamp(m[key] + noise, cfg.min, cfg.max);
        }
      }
    });
  } else {
    // Normal healthy drift
    Object.keys(HEALTHY_BASELINES).forEach((key) => {
      const cfg = HEALTHY_BASELINES[key];
      if (key === 'diskUsage') {
        m.diskUsage += cfg.drift;
        if (m.diskUsage > cfg.max) {
          m.diskUsage = cfg.min;
        }
      } else {
        const noise = (Math.random() - 0.5) * (cfg.noise || 1);
        m[key] = clamp(m[key] + noise, cfg.min, cfg.max);
      }
    });
  }

  m.status = calculateStatus(state);
}

// 1-second background tick loop for all servers
setInterval(() => {
  serverStates.forEach((state) => {
    updateServerState(state);
  });
}, 1000);

// Initialize and spin up Express servers for each server definition
const listeningServers = [];

serversConfig.forEach((serverCfg) => {
  const state = createInitialState(serverCfg);
  serverStates.set(serverCfg.serverId, state);

  const app = express();
  app.use(cors());
  app.use(express.json());

  // One line logging per request
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${serverCfg.serverId}:${serverCfg.port}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
      );
    });
    next();
  });

  // GET /health
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'simulator',
      serverId: serverCfg.serverId
    });
  });

  // GET /metrics
  app.get('/metrics', (req, res) => {
    const s = serverStates.get(serverCfg.serverId);
    const m = s.metrics;

    const metricResponse = {
      serverId: serverCfg.serverId,
      timestamp: new Date().toISOString(),
      cpuUsage: roundTo(m.cpuUsage, 1),
      memoryUsage: roundTo(m.memoryUsage, 1),
      diskUsage: roundTo(m.diskUsage, 2),
      networkIn: roundTo(m.networkIn, 1),
      networkOut: roundTo(m.networkOut, 1),
      responseTimeMs: Math.round(m.responseTimeMs),
      errorRate: roundTo(m.errorRate, 1),
      requestsPerSec: Math.round(m.requestsPerSec),
      status: m.status
    };

    res.json(metricResponse);
  });

  // POST /control/fault {"faultType":"memory_leak"}
  app.post('/control/fault', (req, res) => {
    const { faultType } = req.body || {};
    const validFaults = [
      'cpu_overload',
      'memory_leak',
      'disk_full',
      'network_congestion',
      'service_crash'
    ];

    if (!faultType || !validFaults.includes(faultType)) {
      return res.status(400).json({
        serverId: serverCfg.serverId,
        error: `Invalid faultType. Expected one of: ${validFaults.join(', ')}`
      });
    }

    const s = serverStates.get(serverCfg.serverId);
    s.activeFault = faultType;
    s.faultTicks = 0;
    s.faultInitialMetrics = { ...s.metrics };
    s.isRecovering = false;
    s.recoveryTicks = 0;

    if (faultType === 'service_crash') {
      s.metrics.cpuUsage = 0;
      s.metrics.requestsPerSec = 0;
      s.metrics.errorRate = 100;
      s.metrics.responseTimeMs = 5000;
      s.metrics.status = 'down';
    }

    res.json({
      serverId: serverCfg.serverId,
      faultType,
      started: true
    });
  });

  // POST /control/recover {"action":"restart_service"}
  app.post('/control/recover', (req, res) => {
    const { action } = req.body || {};
    const s = serverStates.get(serverCfg.serverId);

    const isUniversalAction = action === 'restart_service' || action === 'failover';
    const isMatchingAction =
      s.activeFault && FAULT_ACTION_MAP[s.activeFault] === action;

    if (!s.activeFault && !isUniversalAction) {
      return res.json({
        serverId: serverCfg.serverId,
        action,
        success: true,
        message: 'Server is already healthy. No action required.'
      });
    }

    if (isUniversalAction || isMatchingAction) {
      s.isRecovering = true;
      s.recoveryTicks = 0;
      s.recoveryInitialMetrics = { ...s.metrics };

      return res.json({
        serverId: serverCfg.serverId,
        action,
        success: true,
        message: `Recovery action ${action} accepted; returning server to healthy state over 5s.`
      });
    }

    return res.json({
      serverId: serverCfg.serverId,
      action,
      success: false,
      message: `Action ${action} does not resolve active fault ${s.activeFault || 'none'}. Expected ${FAULT_ACTION_MAP[s.activeFault] || 'restart_service'}.`
    });
  });

  // POST /control/reset
  app.post('/control/reset', (req, res) => {
    const s = serverStates.get(serverCfg.serverId);
    s.activeFault = null;
    s.faultTicks = 0;
    s.faultInitialMetrics = null;
    s.isRecovering = false;
    s.recoveryTicks = 0;
    s.recoveryInitialMetrics = null;

    s.metrics = {
      cpuUsage: HEALTHY_BASELINES.cpuUsage.default,
      memoryUsage: HEALTHY_BASELINES.memoryUsage.default,
      diskUsage: HEALTHY_BASELINES.diskUsage.default,
      networkIn: HEALTHY_BASELINES.networkIn.default,
      networkOut: HEALTHY_BASELINES.networkOut.default,
      responseTimeMs: HEALTHY_BASELINES.responseTimeMs.default,
      errorRate: HEALTHY_BASELINES.errorRate.default,
      requestsPerSec: HEALTHY_BASELINES.requestsPerSec.default,
      status: 'healthy'
    };

    res.json({
      serverId: serverCfg.serverId,
      reset: true
    });
  });

  const serverInstance = app.listen(serverCfg.port, () => {
    console.log(
      `[SIMULATOR] ${serverCfg.name} (${serverCfg.serverId}) listening on http://localhost:${serverCfg.port}`
    );
  });

  listeningServers.push(serverInstance);
});

process.on('SIGTERM', () => {
  listeningServers.forEach((srv) => srv.close());
  process.exit(0);
});

process.on('SIGINT', () => {
  listeningServers.forEach((srv) => srv.close());
  process.exit(0);
});
