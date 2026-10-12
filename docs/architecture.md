# CloudGuardian AI - System Architecture

CloudGuardian AI is an autonomous, AI-driven cloud reliability and self-healing infrastructure. The system executes a closed-loop autonomic feedback loop: collecting real-time telemetry, detecting multi-variate operational anomalies using machine learning, executing automated self-healing remediation, and generating transparent natural language explanations.

---

## 1. Architectural Flow Diagram

The end-to-end data and control flow strictly implements the autonomic control loop defined in `shared/CONTRACT.md`:

```mermaid
sequenceDiagram
    autonumber
    participant Sim as Simulator (Ports 6001-6004)
    participant Agent as Edge Agent (Port 6010)
    participant Backend as Core Backend (Port 5000)
    participant Mongo as MongoDB (Port 27017)
    participant ML as ML Service (Port 8000)
    participant Rec as Recovery Service (Port 5002)
    participant UI as Frontend Dashboard (Port 5173)

    loop Every 5 Seconds Telemetry Cycle
        Agent->>Sim: GET /metrics (HTTP 5s timeout)
        Sim-->>Agent: Telemetry Object (8 features + status)
        Agent->>Backend: POST /api/metrics (Relay telemetry)
        Backend->>Mongo: Save Metric Document
        Backend->>ML: POST /predict { serverId, metrics }
        ML-->>Backend: Anomaly Score, Failure Prob, Failure Type, Risk Level
        Backend->>Mongo: Update Server State (status, riskLevel, latestMetrics)

        alt Risk Level is "high" or "critical" & No Active Alert Cooldown
            Backend->>Mongo: Create Alert Document (status: "recovering")
            Backend->>Rec: POST /recover { serverId, failureType, riskLevel }
            Rec->>Sim: POST /control/recover { action }
            Sim-->>Rec: Execution Result (status 200, success true/false)
            Rec-->>Backend: Recovery Response { action, success, durationMs }
            Backend->>Mongo: Save RecoveryAction Document
            Backend->>Rec: POST /explain { serverId, metrics, prediction, recovery }
            Rec-->>Backend: Explanation Diagnostics + Recommended Actions
            Backend->>Mongo: Update Alert (explanation, recommendations, resolved/open)
        else Normal Operational State (healthy & low risk)
            Backend->>Mongo: Auto-resolve any remaining active alerts
        end
    end

    loop Every 5 Seconds Dashboard Refresh
        UI->>Backend: GET /api/servers & /api/stats/summary & /api/alerts
        Backend-->>UI: Real-time System Status & Alert Telemetry
    end
```

---

## 2. High-Level Component Topology

```mermaid
flowchart TD
    subgraph DataPlane ["Virtual Infrastructure (Data Plane)"]
        S1["srv-web-01 (Port 6001)"]
        S2["srv-api-01 (Port 6002)"]
        S3["srv-db-01 (Port 6003)"]
        S4["srv-cache-01 (Port 6004)"]
    end

    subgraph Observability ["Telemetry Collection"]
        AG["Edge Collector Agent (Port 6010)"]
    end

    subgraph CoreServices ["Control Plane & Intelligence"]
        BE["Backend API & Orchestrator (Port 5000)"]
        DB[("MongoDB (Port 27017)")]
        ML["ML Anomaly & Classifier Service (Port 8000)"]
        REC["Automated Recovery Engine (Port 5002)"]
    end

    subgraph UserInterface ["Presentation Layer"]
        FE["React / Tailwind Dashboard (Port 5173)"]
    end

    S1 & S2 & S3 & S4 -->|GET /metrics| AG
    AG -->|POST /api/metrics| BE
    BE <-->|Mongoose ODM| DB
    BE -->|POST /predict| ML
    BE -->|POST /recover & /explain| REC
    REC -->|POST /control/recover| S1 & S2 & S3 & S4
    FE -->|Poll REST API| BE
```

---

## 3. Technology Stack Reference

| Service / Layer | Container Name | Runtime & Framework | Host Port | Internal Port | Key Responsibilities |
|---|---|---|---|---|---|
| **Simulator** | `cloudguardian-simulator` | Node.js 20 LTS, Express, CommonJS | 6001–6004 | 6001–6004 | Simulates 4 virtual cloud servers with realistic drift, fault injection (`/control/fault`), dynamic recovery, and reset. |
| **Agent** | `cloudguardian-agent` | Node.js 20 LTS, Axios, CommonJS | 6010 | 6010 | Autonomous metric collector polling simulator instances every 5s and relaying to backend. |
| **Backend** | `cloudguardian-backend` | Node.js 20 LTS, Express, Mongoose | 5000 | 5000 | Central orchestrator, REST API, MongoDB persistence, alert lifecycle management, recovery coordination. |
| **Database** | `cloudguardian-mongo` | MongoDB 7.0 | 27017 | 27017 | Persistence for servers, historical metrics (TTL 24h), alerts, and recovery action logs. |
| **ML Service** | `cloudguardian-ml-service` | Python 3.11/3.13, FastAPI, Uvicorn | 8000 | 8000 | IsolationForest unsupervised anomaly scoring and RandomForestClassifier multi-class failure prediction. |
| **Recovery Service** | `cloudguardian-recovery-service` | Node.js 20 LTS, Express, Axios | 5002 | 5002 | Policy-based recovery engine enforcing cooldowns, rate limits, fault-to-action routing, and explanation synthesis. |
| **Frontend** | `cloudguardian-frontend` | React 18, Vite, Tailwind CSS 3.4 | 5173 | 80 (nginx) | Real-time operations dashboard, topology views, historical charts (Recharts), and simulation controls. |

---

## 4. Contract Enums & Mappings

### Failure Modes & Remediation Matrix

| Failure Type | Target Action | Fallback Strategy | Primary Symptoms |
|---|---|---|---|
| `cpu_overload` | `scale_up` | Alert human operator | CPU > 85%, responseTimeMs > 1000ms |
| `memory_leak` | `restart_service` | `failover` | Memory > 85%, gradual latency increase |
| `disk_full` | `cleanup_disk` | Storage expansion request | Disk > 90%, errorRate > 5% |
| `network_congestion` | `throttle_traffic` | Rate limit ingress | NetworkIn/Out > 800 Mbps, latency spike |
| `service_crash` | `restart_service` | `failover` (automatic retry) | Server status `down`, CPU = 0, errorRate = 100% |
| `none` | `none` | N/A | Baseline healthy state |

### Autonomic Risk Level Thresholds
- **Low Risk (`< 0.30`)**: Normal operation; alerts auto-resolved.
- **Medium Risk (`0.30 – 0.59`)**: Warning stage; no intrusive automated actions taken (safety policy).
- **High Risk (`0.60 – 0.84`)**: Critical degradation imminent; automated remediation triggered.
- **Critical Risk (`>= 0.85`)**: Severe failure imminent or active; immediate automated remediation executed.

