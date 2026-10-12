// Fake data in exact contract shapes
// 4 servers with one degraded/high risk, 3 alerts, 5 recoveries, 50 metric points per server

const now = Date.now();

// Generate 50 historical metric points per server (oldest first, spaced 5 seconds apart)
function generateHistoricalMetrics(serverId, isDegraded = false) {
  const metrics = [];
  const count = 50;
  const intervalMs = 5000;
  const startTime = now - count * intervalMs;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime + i * intervalMs).toISOString();
    let cpuUsage, memoryUsage, diskUsage, responseTimeMs, errorRate, requestsPerSec, status;

    if (isDegraded) {
      // Memory leak simulation ramping up over time
      const progress = i / count;
      cpuUsage = Number((34 + Math.sin(i) * 5 + progress * 20).toFixed(1));
      memoryUsage = Number((50 + progress * 38 + (Math.random() * 2 - 1)).toFixed(1)); // climbs to ~88%
      diskUsage = Number((55 + progress * 5).toFixed(1));
      responseTimeMs = Math.round(85 + progress * 780); // climbs to ~865ms
      errorRate = Number((0.2 + progress * 4.8).toFixed(1));
      requestsPerSec = Math.round(280 - progress * 80);
      status = progress > 0.7 ? 'degraded' : 'healthy';
    } else if (serverId === 'srv-web-01') {
      cpuUsage = Number((32 + Math.sin(i * 0.5) * 6).toFixed(1));
      memoryUsage = Number((44 + Math.cos(i * 0.4) * 4).toFixed(1));
      diskUsage = Number((51.2 + (i * 0.02)).toFixed(1));
      responseTimeMs = Math.round(65 + Math.sin(i) * 15);
      errorRate = Number((0.2 + Math.random() * 0.3).toFixed(1));
      requestsPerSec = Math.round(310 + Math.sin(i * 0.8) * 30);
      status = 'healthy';
    } else if (serverId === 'srv-db-01') {
      cpuUsage = Number((28 + Math.cos(i * 0.3) * 5).toFixed(1));
      memoryUsage = Number((58 + Math.sin(i * 0.2) * 3).toFixed(1));
      diskUsage = Number((62.5 + (i * 0.01)).toFixed(1));
      responseTimeMs = Math.round(45 + Math.cos(i) * 10);
      errorRate = 0.0;
      requestsPerSec = Math.round(180 + Math.sin(i * 0.5) * 20);
      status = 'healthy';
    } else {
      // srv-cache-01
      cpuUsage = Number((18 + Math.sin(i * 0.4) * 4).toFixed(1));
      memoryUsage = Number((36 + Math.cos(i * 0.3) * 3).toFixed(1));
      diskUsage = Number((38.0 + (i * 0.01)).toFixed(1));
      responseTimeMs = Math.round(24 + Math.sin(i) * 6);
      errorRate = 0.0;
      requestsPerSec = Math.round(420 + Math.cos(i * 0.7) * 40);
      status = 'healthy';
    }

    metrics.push({
      serverId,
      timestamp,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkIn: Number((210 + Math.sin(i) * 40).toFixed(1)),
      networkOut: Number((180 + Math.cos(i) * 30).toFixed(1)),
      responseTimeMs,
      errorRate,
      requestsPerSec,
      status,
    });
  }

  return metrics;
}

export const mockMetrics = {
  'srv-web-01': generateHistoricalMetrics('srv-web-01', false),
  'srv-api-01': generateHistoricalMetrics('srv-api-01', true),
  'srv-db-01': generateHistoricalMetrics('srv-db-01', false),
  'srv-cache-01': generateHistoricalMetrics('srv-cache-01', false),
};

export let mockServers = [
  {
    serverId: 'srv-web-01',
    name: 'Web Server 01',
    type: 'web',
    status: 'healthy',
    riskLevel: 'low',
    failureProbability: 0.08,
    latestMetrics: mockMetrics['srv-web-01'][mockMetrics['srv-web-01'].length - 1],
    lastUpdated: new Date().toISOString(),
  },
  {
    serverId: 'srv-api-01',
    name: 'API Server 01',
    type: 'api',
    status: 'degraded',
    riskLevel: 'high',
    failureProbability: 0.78,
    latestMetrics: mockMetrics['srv-api-01'][mockMetrics['srv-api-01'].length - 1],
    lastUpdated: new Date().toISOString(),
  },
  {
    serverId: 'srv-db-01',
    name: 'Database Server 01',
    type: 'database',
    status: 'healthy',
    riskLevel: 'low',
    failureProbability: 0.12,
    latestMetrics: mockMetrics['srv-db-01'][mockMetrics['srv-db-01'].length - 1],
    lastUpdated: new Date().toISOString(),
  },
  {
    serverId: 'srv-cache-01',
    name: 'Cache Server 01',
    type: 'cache',
    status: 'healthy',
    riskLevel: 'low',
    failureProbability: 0.04,
    latestMetrics: mockMetrics['srv-cache-01'][mockMetrics['srv-cache-01'].length - 1],
    lastUpdated: new Date().toISOString(),
  },
];

export let mockAlerts = [
  {
    _id: '670a1a111111111111111101',
    serverId: 'srv-api-01',
    riskLevel: 'high',
    failureType: 'memory_leak',
    failureProbability: 0.78,
    anomalyScore: 0.82,
    explanation: 'Sustained memory growth observed (88.4%) with high heap allocation gradient. Service approaching memory threshold.',
    recommendedActions: [
      'Restart service to purge dangling memory pools',
      'Inspect garbage collection traces and allocation profiler',
      'Throttle incoming requests to prevent OOM crash'
    ],
    status: 'open',
    createdAt: new Date(now - 45000).toISOString(),
    resolvedAt: null,
  },
  {
    _id: '670a1a111111111111111102',
    serverId: 'srv-web-01',
    riskLevel: 'medium',
    failureType: 'cpu_overload',
    failureProbability: 0.48,
    anomalyScore: 0.54,
    explanation: 'Transient CPU utilization spike above 82% caused by sudden burst of client connection handshakes.',
    recommendedActions: [
      'Scale up worker threads to distribute load',
      'Verify upstream CDN edge caching hit rates'
    ],
    status: 'resolved',
    createdAt: new Date(now - 3600000).toISOString(),
    resolvedAt: new Date(now - 3300000).toISOString(),
  },
  {
    _id: '670a1a111111111111111103',
    serverId: 'srv-db-01',
    riskLevel: 'high',
    failureType: 'disk_full',
    failureProbability: 0.81,
    anomalyScore: 0.86,
    explanation: 'Database write-ahead logs reached 91% partition capacity. Potential read-only lock imminent.',
    recommendedActions: [
      'Execute cleanup_disk procedure for archived logs',
      'Enable automated WAL segment rotation'
    ],
    status: 'resolved',
    createdAt: new Date(now - 7200000).toISOString(),
    resolvedAt: new Date(now - 7140000).toISOString(),
  },
];

export let mockRecoveries = [
  {
    _id: '670a2b222222222222222201',
    alertId: '670a1a111111111111111103',
    serverId: 'srv-db-01',
    action: 'cleanup_disk',
    success: true,
    message: 'Purged 18.4 GB of archived logs. Disk usage normalized to 52%.',
    executedAt: new Date(now - 7140000).toISOString(),
    durationMs: 2420,
  },
  {
    _id: '670a2b222222222222222202',
    alertId: '670a1a111111111111111102',
    serverId: 'srv-web-01',
    action: 'scale_up',
    success: true,
    message: 'Spawned 2 additional web worker instances. CPU stabilized at 34%.',
    executedAt: new Date(now - 3300000).toISOString(),
    durationMs: 4120,
  },
  {
    _id: '670a2b222222222222222203',
    alertId: null,
    serverId: 'srv-cache-01',
    action: 'restart_service',
    success: true,
    message: 'Restarted Redis cache daemon; memory buffer cleared.',
    executedAt: new Date(now - 14400000).toISOString(),
    durationMs: 1850,
  },
  {
    _id: '670a2b222222222222222204',
    alertId: null,
    serverId: 'srv-api-01',
    action: 'throttle_traffic',
    success: true,
    message: 'Throttled incoming traffic by 25% during downstream latency spike.',
    executedAt: new Date(now - 28800000).toISOString(),
    durationMs: 620,
  },
  {
    _id: '670a2b222222222222222205',
    alertId: null,
    serverId: 'srv-web-01',
    action: 'failover',
    success: true,
    message: 'Primary DNS route switched to backup edge node during routing failure.',
    executedAt: new Date(now - 43200000).toISOString(),
    durationMs: 5310,
  },
];

export function getMockSummary() {
  const totalServers = mockServers.length;
  const healthyServers = mockServers.filter(s => s.status === 'healthy').length;
  const degradedServers = mockServers.filter(s => s.status === 'degraded').length;
  const downServers = mockServers.filter(s => s.status === 'down').length;
  const openAlerts = mockAlerts.filter(a => a.status === 'open').length;
  const recoveriesToday = mockRecoveries.length;
  const successfulRecoveries = mockRecoveries.filter(r => r.success).length;
  const avgRecoveryTimeMs = Math.round(
    mockRecoveries.reduce((sum, r) => sum + r.durationMs, 0) / (mockRecoveries.length || 1)
  );
  const uptimePercent = totalServers > 0
    ? Number(((healthyServers / totalServers) * 100).toFixed(1))
    : 100;

  return {
    totalServers,
    healthyServers,
    degradedServers,
    downServers,
    openAlerts,
    recoveriesToday,
    successfulRecoveries,
    avgRecoveryTimeMs,
    uptimePercent,
  };
}

