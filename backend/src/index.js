const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { config, loadServers } = require('./config');
const Server = require('./models/Server');

// Import routes
const healthRoute = require('./routes/health');
const serversRoute = require('./routes/servers');
const metricsRoute = require('./routes/metrics');
const alertsRoute = require('./routes/alerts');
const recoveriesRoute = require('./routes/recoveries');
const statsRoute = require('./routes/stats');
const simulateRoute = require('./routes/simulate');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[BACKEND:${config.port}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Root health endpoint (CONTRACT line 8: GET /health -> {"status":"ok","service":"<name>"})
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend'
  });
});

// Mount /api routes
app.use('/api', healthRoute);
app.use('/api/servers', serversRoute);
app.use('/api/metrics', metricsRoute);
app.use('/api/alerts', alertsRoute);
app.use('/api/recoveries', recoveriesRoute);
app.use('/api/stats', statsRoute);
app.use('/api/simulate', simulateRoute);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Server seeding function
async function seedServers() {
  const servers = loadServers();
  if (!servers || servers.length === 0) {
    console.warn('[BACKEND] Warning: No servers found to seed.');
    return;
  }

  for (const s of servers) {
    await Server.findOneAndUpdate(
      { serverId: s.serverId },
      {
        $set: {
          name: s.name,
          type: s.type
        },
        $setOnInsert: {
          status: 'healthy',
          riskLevel: 'low',
          failureProbability: 0,
          latestMetrics: null,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log(`[BACKEND] Seeded ${servers.length} servers from config into MongoDB.`);
}

let serverInstance = null;

async function startServer() {
  // Connect to MongoDB
  try {
    console.log(`[BACKEND] Connecting to MongoDB at ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri);
    console.log(`[BACKEND] Successfully connected to MongoDB.`);
  } catch (err) {
    console.error(`[BACKEND] Fatal: Failed to connect to MongoDB at ${config.mongoUri}: ${err.message}`);
    process.exit(1);
  }

  // Seed servers
  try {
    await seedServers();
  } catch (err) {
    console.error(`[BACKEND] Warning: Failed to seed servers: ${err.message}`);
  }

  // Start HTTP listener
  serverInstance = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[BACKEND] Listening on http://0.0.0.0:${config.port}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[BACKEND] SIGINT received, shutting down gracefully...');
  if (serverInstance) serverInstance.close();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[BACKEND] SIGTERM received, shutting down gracefully...');
  if (serverInstance) serverInstance.close();
  await mongoose.disconnect();
  process.exit(0);
});

startServer();

module.exports = { app, startServer };

