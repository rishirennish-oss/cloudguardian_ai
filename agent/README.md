# CloudGuardian Metrics Agent

The Metrics Agent is a lightweight collection daemon that periodically polls telemetry from all simulated cloud servers (defined in `shared/servers.json`) and forwards the metrics to the backend ingestion endpoint.

---

## Behavior
- Every `COLLECT_INTERVAL_MS` (default `5000ms`):
  1. Iterates over each server in `shared/servers.json`.
  2. Queries `GET http://${SIM_HOST}:${port}/metrics`.
  3. Relays the metric JSON payload to `POST ${BACKEND_URL}/api/metrics`.
- **Fault-Tolerant**: Network errors, timeouts, or downtime of individual servers or the backend are caught and logged as warnings; the agent process will never crash.
- **Contract Conformance**: Exposes `GET /health` responding with `{"status":"ok","service":"agent"}`.

---

## Environment Variables
- `SIM_HOST`: Hostname of the simulator servers (default: `localhost`, docker: `simulator`).
- `BACKEND_URL`: URL of the backend service (default: `http://localhost:5000`, docker: `http://backend:5000`).
- `COLLECT_INTERVAL_MS`: Polling interval in milliseconds (default: `5000`).
- `SERVERS_FILE`: Path to servers definition (default: `../shared/servers.json`, docker: `/app/shared/servers.json`).
- `PORT`: Optional health check listener port (default: `6010`).

---

## Running Locally

```bash
cd agent
npm install
npm start
```

### Testing with Fake Backend
To test the agent independently without a full backend deployment:
```bash
# In terminal 1 (Fake Backend)
node test/fake-backend.js

# In terminal 2 (Simulator)
cd ../simulator && npm start

# In terminal 3 (Agent)
npm start
```
