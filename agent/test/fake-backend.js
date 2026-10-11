const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[FAKE-BACKEND] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.post('/api/metrics', (req, res) => {
  const metric = req.body;
  console.log(
    `[FAKE-BACKEND] Received metric for ${metric.serverId}: CPU=${metric.cpuUsage}%, MEM=${metric.memoryUsage}%, DISK=${metric.diskUsage}%, STATUS=${metric.status}`
  );
  res.status(200).json({
    success: true,
    data: {
      metric,
      prediction: null
    }
  });
});

app.listen(PORT, () => {
  console.log(`[FAKE-BACKEND] Listening on http://localhost:${PORT}`);
});
