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

const config = {
  port: parseInt(process.env.PORT, 10) || 5002,
  simHost: process.env.SIM_HOST || 'localhost',
  serversFilePath: resolveServersFilePath(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
};

function loadServers() {
  if (!fs.existsSync(config.serversFilePath)) {
    config.serversFilePath = resolveServersFilePath();
  }
  if (!fs.existsSync(config.serversFilePath)) {
    console.error(`[recovery-service] Servers config file not found at: ${config.serversFilePath}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(config.serversFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[recovery-service] Failed reading servers config: ${err.message}`);
    return [];
  }
}

function getServerById(serverId) {
  const servers = loadServers();
  return servers.find((s) => s.serverId === serverId) || null;
}

module.exports = {
  config,
  loadServers,
  getServerById
};

