# CloudGuardian Recovery Service

The Recovery Service automates incident remediation and provides AI-powered explainability for CloudGuardian AI. It maps detected failure types to appropriate remediation actions, enforces safety rules (cooldowns, rate limits, risk thresholds), executes recovery against simulator servers, and produces plain-English incident explanations.

---

## Features
- **Contract-Compliant Remediation**: Maps each `failureType` to the exact `recoveryAction` specified in `shared/CONTRACT.md`:
  - `cpu_overload` -> `scale_up`
  - `memory_leak` -> `restart_service`
  - `disk_full` -> `cleanup_disk`
  - `network_congestion` -> `throttle_traffic`
  - `service_crash` -> `restart_service` (with automatic retry using `failover` if `restart_service` fails)
- **Safety Rules**:
  - Rejects execution if `riskLevel` is `low` or `medium` (`message: "risk below threshold"`).
  - 60-second cooldown per server (`message: "cooldown active"`).
  - Maximum 3 actions per server within any 10-minute window.
- **Fault-Tolerant Execution**: Outgoing calls to simulator servers enforce a 5-second timeout and never throw; if a simulator is unreachable, returns `success: false` without crashing.
- **Audit History**: In-memory ring buffer tracking the last 50 recovery action executions via `GET /history`.
- **Explainability**:
  - Automatically synthesizes plain-English explanations identifying deviating metrics against healthy baselines (prioritizing `topFeatures`), model predictions, and recovery outcomes.
  - Generates 2-3 actionable human follow-up recommendations per incident.
  - Optional Claude API integration (`ANTHROPIC_API_KEY`) to polish the summary with silent fallback to the deterministic template.

---

## Configuration & Environment Variables

| Variable | Default (Local) | Docker Default | Description |
|---|---|---|---|
| `PORT` | `5002` | `5002` | HTTP port for the service |
| `SIM_HOST` | `localhost` | `simulator` | Hostname for virtual cloud servers |
| `SERVERS_FILE` | `../shared/servers.json` | `/app/shared/servers.json` | Path to server registry JSON |
| `ANTHROPIC_API_KEY` | *(empty)* | *(empty)* | Optional API key for Claude explanation rewrite |

---

## API Endpoints

### 1. `GET /health`
Returns health check status.
```json
{
  "status": "ok",
  "service": "recovery-service"
}
```

### 2. `POST /recover`
Executes remediation action according to failure type and risk level.

**Request:**
```json
{
  "serverId": "srv-web-01",
  "failureType": "memory_leak",
  "riskLevel": "critical"
}
```

**Response:**
```json
{
  "serverId": "srv-web-01",
  "action": "restart_service",
  "success": true,
  "message": "Recovery action restart_service accepted; returning server to healthy state over 5s.",
  "executedAt": "2026-10-11T12:00:00.000Z",
  "durationMs": 42
}
```

### 3. `POST /explain`
Synthesizes a plain-English explanation and recommended actions.

**Request:**
```json
{
  "serverId": "srv-web-01",
  "metrics": {
    "cpuUsage": 32.5,
    "memoryUsage": 96.0,
    "responseTimeMs": 900
  },
  "prediction": {
    "failureProbability": 0.91,
    "predictedFailureType": "memory_leak",
    "riskLevel": "critical",
    "topFeatures": [{ "feature": "memoryUsage", "contribution": 0.46 }]
  },
  "recovery": {
    "action": "restart_service",
    "success": true
  }
}
```

**Response:**
```json
{
  "explanation": "Server srv-web-01 shows memory at 96% (normal 30-55%) and response time of 900 ms. The AI model predicts memory_leak with 91% probability (risk: critical). Action taken: restart_service - success.",
  "severity": "critical",
  "recommendedActions": [
    "Inspect heap dumps and memory profiles for uncollected object references.",
    "Monitor garbage collection pauses and memory consumption trends.",
    "Check recent code releases for caching or event listener leaks."
  ],
  "generatedBy": "template"
}
```

### 4. `GET /history`
Returns the last 50 executed actions (most recent first).
```json
[
  {
    "serverId": "srv-web-01",
    "action": "restart_service",
    "success": true,
    "message": "Recovery action accepted",
    "executedAt": "2026-10-11T12:00:00.000Z",
    "durationMs": 42
  }
]
```

---

## Installation & Running

### Local Development
```bash
cd recovery-service
npm install
npm start
```

### Docker
```bash
docker build -t cloudguardian-recovery-service .
docker run -p 5002:5002 cloudguardian-recovery-service
```
