# CloudGuardian Simulator

The Simulator module runs simulated cloud servers defined in `shared/servers.json`. In a single Node.js process, it runs independent Express web servers across 4 ports:
- Port 6001: Web Server 01 (`srv-web-01`)
- Port 6002: API Server 01 (`srv-api-01`)
- Port 6003: Database Server 01 (`srv-db-01`)
- Port 6004: Cache Server 01 (`srv-cache-01`)

---

## Features
- **Realistic Telemetry**: Every 1 second, telemetry drifts with natural noise within healthy ranges. `diskUsage` rises by `0.01` per second and resets to 40% when exceeding 60%.
- **Gradual Fault Injection**: Faults like `memory_leak`, `cpu_overload`, `disk_full`, and `network_congestion` escalate linearly over ~60 seconds to allow the ML model to predict impending failures. `service_crash` occurs instantly.
- **Dynamic Recovery**: Executing matching recovery actions (`restart_service`, `scale_up`, `cleanup_disk`, `throttle_traffic`, `failover`) restores server metrics to healthy baselines over 5 seconds.
- **Logging**: Logs each HTTP request in a standard single-line format.

---

## API Endpoints (per server port)

### 1. `GET /health`
Returns service status.
```json
{
  "status": "ok",
  "service": "simulator",
  "serverId": "srv-web-01"
}
```

### 2. `GET /metrics`
Returns current server telemetry.
```json
{
  "serverId": "srv-web-01",
  "timestamp": "2026-10-11T10:55:00.000Z",
  "cpuUsage": 32.5,
  "memoryUsage": 42.1,
  "diskUsage": 48.05,
  "networkIn": 221.0,
  "networkOut": 179.8,
  "responseTimeMs": 85,
  "errorRate": 0.4,
  "requestsPerSec": 240,
  "status": "healthy"
}
```

### 3. `POST /control/fault`
Injects an operational failure.
```json
{
  "faultType": "memory_leak"
}
```
Supported fault types:
- `cpu_overload` (cpu -> 95%, responseTimeMs -> 1500ms, requestsPerSec drops)
- `memory_leak` (memory -> 97%, responseTimeMs -> 900ms)
- `disk_full` (disk -> 98%, errorRate -> 10%)
- `network_congestion` (networkIn/networkOut -> 900 Mbps, responseTimeMs -> 1800ms, errorRate -> 12%)
- `service_crash` (instant: status "down", cpu 0%, requestsPerSec 0, errorRate 100%, responseTimeMs 5000ms)

### 4. `POST /control/recover`
Triggers remediation action.
```json
{
  "action": "restart_service"
}
```
Matching actions:
- `restart_service` & `failover`: Clear any fault.
- `scale_up`: Resolves `cpu_overload`.
- `cleanup_disk`: Resolves `disk_full`.
- `throttle_traffic`: Resolves `network_congestion`.

### 5. `POST /control/reset`
Instantly resets the server back to healthy baseline.

---

## Installation & Running

```bash
cd simulator
npm install
npm start
```
