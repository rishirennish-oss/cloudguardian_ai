# CloudGuardian AI - Backend Service

The Core Backend API and Orchestration engine for CloudGuardian AI.

## Overview

The Backend Service is responsible for:
1. Ingesting server telemetry metrics from the Agent (`POST /api/metrics`).
2. Storing metrics in MongoDB with TTL auto-expiration (24 hours).
3. Invoking the ML service (`POST /predict`) for real-time anomaly detection and risk scoring.
4. Orchestrating remediation workflows via the Recovery service (`POST /recover`) when risk levels become high or critical.
5. Managing alert lifecycles (`/api/alerts`) including prevention of duplicate alerts and cooldown periods (30s after resolution).
6. Requesting AI-generated diagnostic explanations and recommended actions (`POST /explain`).
7. Exposing stats, server states, metrics history, and simulation controls for the dashboard frontend.

---

## Tech Stack & Architecture

- **Runtime**: Node.js 20 LTS (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **HTTP Client**: Axios (with 5-second timeout and robust fallbacks)
- **Envelope Response Format**:
  - Success: `{"success": true, "data": ...}`
  - Failure: `{"success": false, "error": "message"}`

---

## Directory Structure

```
backend/
├── Dockerfile
├── .dockerignore
├── package.json
├── postman_collection.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    ├── models/
    │   ├── Alert.js
    │   ├── Metric.js
    │   ├── RecoveryAction.js
    │   └── Server.js
    ├── routes/
    │   ├── alerts.js
    │   ├── health.js
    │   ├── metrics.js
    │   ├── recoveries.js
    │   ├── servers.js
    │   ├── simulate.js
    │   └── stats.js
    ├── services/
    │   ├── mlClient.js
    │   ├── orchestrator.js
    │   └── recoveryClient.js
    └── utils/
        └── response.js
```

---

## Environment Variables

| Variable | Local Default | Docker Value | Description |
|---|---|---|---|
| `PORT` | `5000` | `5000` | Port on which Backend listens |
| `MONGO_URI` | `mongodb://localhost:27017/cloudguardian` | `mongodb://mongo:27017/cloudguardian` | MongoDB connection URI |
| `ML_SERVICE_URL` | `http://localhost:8000` | `http://ml-service:8000` | Base URL for ML Prediction Service |
| `RECOVERY_SERVICE_URL` | `http://localhost:5002` | `http://recovery-service:5002` | Base URL for Recovery Service |
| `SIM_HOST` | `localhost` | `simulator` | Hostname where simulator servers run |
| `SERVERS_FILE` | `../shared/servers.json` | `/app/shared/servers.json` | Path to server definitions JSON |

---

## API Endpoints

### Health Checks
- `GET /health` -> `{"status":"ok","service":"backend"}`
- `GET /api/health` -> `{"status":"ok","service":"backend","success":true,"data":{"status":"ok","service":"backend"}}`

### Servers
- `GET /api/servers` -> `{"success":true,"data":[{ "serverId", "name", "type", "status", "riskLevel", "failureProbability", "latestMetrics", "lastUpdated" }]}`
- `GET /api/servers/:serverId` -> Server details (or 404 if unknown)
- `GET /api/servers/:serverId/metrics?limit=50` -> Historical metrics array (oldest first)

### Telemetry Ingestion & Orchestration
- `POST /api/metrics`
  - Validates `serverId` and numeric metric fields.
  - Saves metric into MongoDB.
  - Queries ML prediction service (fallback if down).
  - Updates Server state and latest metrics.
  - Creates Alert, triggers Recovery, and attaches Explain diagnostics if risk level is `high` or `critical`.
  - Auto-resolves open alerts when server is healthy with low risk.

### Alerts
- `GET /api/alerts?status=open` -> Filtered alerts array (newest first).
- `PATCH /api/alerts/:id/resolve` -> Manually resolves an alert.

### Recoveries
- `GET /api/recoveries?limit=50` -> History of automated recovery actions.

### Statistics
- `GET /api/stats/summary` -> System summary stats:
  - `totalServers`, `healthyServers`, `degradedServers`, `downServers`
  - `openAlerts`, `recoveriesToday`, `successfulRecoveries`, `avgRecoveryTimeMs`, `uptimePercent`

### Fault Injection Simulation
- `POST /api/simulate/fault` -> Body: `{"serverId":"srv-web-01","faultType":"memory_leak"}`
- `POST /api/simulate/reset` -> Body: `{"serverId":"srv-web-01"}`

---

## Running the Backend

### Prerequisites
- Node.js 20+
- MongoDB running on `localhost:27017`

### Local Development
```bash
cd backend
npm install
npm start
```

### Docker
```bash
docker build -t cloudguardian-backend .
docker run -p 5000:5000 cloudguardian-backend
```

