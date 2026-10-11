const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const recoveryEngine = require('./services/recoveryEngine');
const explainer = require('./services/explainer');

const app = express();

app.use(cors());
app.use(express.json());

// One line logging per request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[recovery-service:${config.port}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'recovery-service'
  });
});

// POST /recover
app.post('/recover', async (req, res) => {
  try {
    const { serverId, failureType, riskLevel } = req.body || {};
    const result = await recoveryEngine.recover({ serverId, failureType, riskLevel });
    if (result && result.notFound) {
      return res.status(404).json({ error: result.error || 'unknown serverId' });
    }
    return res.json(result);
  } catch (err) {
    console.error(`[recovery-service] Error handling /recover: ${err.message}`);
    return res.json({
      serverId: req.body?.serverId || 'unknown',
      action: 'none',
      success: false,
      message: `Recovery error: ${err.message}`,
      executedAt: new Date().toISOString(),
      durationMs: 0
    });
  }
});

// POST /explain
app.post('/explain', async (req, res) => {
  try {
    const { serverId, metrics, prediction, recovery } = req.body || {};
    const result = await explainer.explain({ serverId, metrics, prediction, recovery });
    return res.json(result);
  } catch (err) {
    console.error(`[recovery-service] Error handling /explain: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /history (last 50 actions in memory)
app.get('/history', (req, res) => {
  res.json(recoveryEngine.getHistory());
});

const server = app.listen(config.port, () => {
  console.log(`[recovery-service] Listening on port ${config.port}`);
});

module.exports = { app, server };
