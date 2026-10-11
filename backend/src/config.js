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
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/cloudguardian',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  recoveryServiceUrl: process.env.RECOVERY_SERVICE_URL || 'http://localhost:5002',
  simHost: process.env.SIM_HOST || 'localhost',
  serversFilePath: resolveServersFilePath()
};

function loadServers() {
  if (!fs.existsSync(config.serversFilePath)) {
    config.serversFilePath = resolveServersFilePath();
  }
  if (!fs.existsSync(config.serversFilePath)) {
    console.error(`[BACKEND] Servers config file not found at: ${config.serversFilePath}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(config.serversFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[BACKEND] Failed reading servers config: ${err.message}`);
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

