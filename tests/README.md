# CloudGuardian AI - Test Suite

This directory contains the contract verification and end-to-end (E2E) integration test suites for CloudGuardian AI.

---

## Overview

1. **`contract.test.js`**: Validates that all individual microservices adhere to `shared/CONTRACT.md`:
   - Health endpoints across all services: Simulator (ports 6001–6004), ML Service (8000), Recovery Service (5002), and Backend (5000).
   - Key schemas and enum constraints for ML `/predict` (`riskLevel`, `predictedFailureType`, `topFeatures`).
   - Request/response shapes and enum integrity for Recovery `/recover` and `/explain`.
   - Envelope format (`{ success: true, data: ... }`) across all Backend REST endpoints (`/api/servers`, `/api/alerts`, `/api/recoveries`, `/api/stats/summary`).
2. **`e2e.js`**: Executes sequential automated fault injection and remediation tests against `srv-web-01` across all 5 contract failure modes:
   - `cpu_overload` -> `scale_up`
   - `memory_leak` -> `restart_service`
   - `disk_full` -> `cleanup_disk`
   - `network_congestion` -> `throttle_traffic`
   - `service_crash` -> `restart_service` / `failover`
   - Measures and outputs detection latency, remediation latency, total recovery duration, and final server operational health.

---

## Prerequisites

- Node.js 20 LTS installed.
- All CloudGuardian AI services running (via Docker Compose or local processes):
  - Simulator (`localhost:6001-6004`)
  - ML Service (`localhost:8000`)
  - Recovery Service (`localhost:5002`)
  - Backend (`localhost:5000`)
  - Agent (collecting metrics)

---

## Installation

```bash
cd tests
npm install
```

---

## Running the Tests

### 1. Contract Test Suite
Executes all health checks, schema validations, and enum verifications:
```bash
node contract.test.js
# Or using npm
npm test
```

### 2. End-to-End (E2E) Performance Benchmark
Executes the closed-loop fault injection, anomaly detection, automated remediation, and metric recovery verification:
```bash
node e2e.js
# Or using npm
npm run test:e2e
```

### Exit Codes
- Returns `0` if all assertions pass.
- Returns `1` if any assertion fails or an endpoint times out.
