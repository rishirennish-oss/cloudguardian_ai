import apiClient from './client';
import {
  mockServers,
  mockMetrics,
  mockAlerts,
  mockRecoveries,
  getMockSummary,
} from './mock';

const isMock = () => String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true';

export async function getServers() {
  if (isMock()) {
    return JSON.parse(JSON.stringify(mockServers));
  }
  const response = await apiClient.get('/servers');
  return response.data.data;
}

export async function getServer(serverId) {
  if (isMock()) {
    const server = mockServers.find((s) => s.serverId === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);
    return JSON.parse(JSON.stringify(server));
  }
  const response = await apiClient.get(`/servers/${serverId}`);
  return response.data.data;
}

export async function getServerMetrics(serverId, limit = 50) {
  if (isMock()) {
    const list = mockMetrics[serverId] || [];
    return JSON.parse(JSON.stringify(list.slice(-limit)));
  }
  const response = await apiClient.get(`/servers/${serverId}/metrics`, {
    params: { limit },
  });
  return response.data.data;
}

export async function getAlerts(status) {
  if (isMock()) {
    let list = mockAlerts;
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return JSON.parse(JSON.stringify(list));
  }
  const response = await apiClient.get('/alerts', {
    params: status ? { status } : {},
  });
  return response.data.data;
}

export async function resolveAlert(id) {
  if (isMock()) {
    const alert = mockAlerts.find((a) => a._id === id);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
    }
    return JSON.parse(JSON.stringify(alert));
  }
  const response = await apiClient.patch(`/alerts/${id}/resolve`);
  return response.data.data;
}

export async function getRecoveries(limit = 50) {
  if (isMock()) {
    return JSON.parse(JSON.stringify(mockRecoveries.slice(0, limit)));
  }
  const response = await apiClient.get('/recoveries', {
    params: { limit },
  });
  return response.data.data;
}

export async function getSummary() {
  if (isMock()) {
    return getMockSummary();
  }
  const response = await apiClient.get('/stats/summary');
  return response.data.data;
}

export async function simulateFault(serverId, faultType) {
  if (isMock()) {
    const server = mockServers.find((s) => s.serverId === serverId);
    if (server) {
      server.status = faultType === 'service_crash' ? 'down' : 'degraded';
      server.riskLevel = faultType === 'service_crash' ? 'critical' : 'high';
      server.failureProbability = 0.91;
      server.lastUpdated = new Date().toISOString();
      if (server.latestMetrics) {
        if (faultType === 'memory_leak') server.latestMetrics.memoryUsage = 96.5;
        if (faultType === 'cpu_overload') server.latestMetrics.cpuUsage = 95.0;
        if (faultType === 'disk_full') server.latestMetrics.diskUsage = 98.0;
        server.latestMetrics.status = server.status;
      }
    }
    // Add open alert to mock list
    mockAlerts.unshift({
      _id: 'mock-alert-' + Date.now(),
      serverId,
      riskLevel: faultType === 'service_crash' ? 'critical' : 'high',
      failureType,
      failureProbability: 0.91,
      anomalyScore: 0.88,
      explanation: `Simulated fault injected: ${faultType} on ${serverId}. High risk threshold exceeded.`,
      recommendedActions: [
        `Execute automated recovery for ${faultType}`,
        'Verify host telemetry'
      ],
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    });

    return { serverId, faultType, started: true };
  }
  const response = await apiClient.post('/simulate/fault', {
    serverId,
    faultType,
  });
  return response.data.data;
}

export async function simulateReset(serverId) {
  if (isMock()) {
    const server = mockServers.find((s) => s.serverId === serverId);
    if (server) {
      server.status = 'healthy';
      server.riskLevel = 'low';
      server.failureProbability = 0.05;
      server.lastUpdated = new Date().toISOString();
      if (server.latestMetrics) {
        server.latestMetrics.memoryUsage = 45.0;
        server.latestMetrics.cpuUsage = 28.0;
        server.latestMetrics.diskUsage = 52.0;
        server.latestMetrics.status = 'healthy';
      }
    }
    return { serverId, reset: true };
  }
  const response = await apiClient.post('/simulate/reset', { serverId });
  return response.data.data;
}

