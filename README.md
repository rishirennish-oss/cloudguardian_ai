# CloudGuardian AI

> **An AI-Based Self-Healing Cloud Infrastructure for Predictive Failure Detection and Automated Service Recovery**

CloudGuardian AI provides continuous real-time cloud server monitoring, predictive anomaly and failure detection via machine learning, automated self-healing remediation, and explainable AI insights.

---

## 👥 Team & Roles

| Member | Student ID | Designated Folders / Modules | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Rishi Rennish** | 25BIT0182 | `simulator/`, `agent/`, `infra/`, `shared/` | Infrastructure, Cloud Server Simulator, Metrics Agent, Shared Contracts, Compose & K8s |
| **Sohani Mohapatra** | 25BIT0194 | `ml-service/` | Predictive ML models, Anomaly scoring, Failure classification |
| **Vedansh Mahto** | 25BIT0190 | `backend/` | Express/MongoDB Backend, Metrics ingestion, Pipeline orchestration |
| **Krishna Shroff** | 25BIT0239 | `frontend/` | React dashboard, Real-time telemetry, Alert management UI |
| **Rishav Raj** | 25BIT0061 | `recovery-service/`, `tests/`, `docs/` | Automated recovery handlers, GenAI explanation engine, Testing & Docs |

---

## 🏗️ Architecture & Data Flow

```
[Fake Cloud Servers (Simulator)]
   │ (Ports 6001-6004)
   ▼ GET /metrics (every 5s)
[Metrics Agent]
   │
   ▼ POST /api/metrics
[Backend (Port 5000)] ──── MongoDB (Port 27017)
   │
   ├─► POST /predict ─────► [ML Service (Port 8000)]
   │                            │ (Anomaly & Failure Prediction)
   ▼ (if High/Critical Risk)
[Recovery Service (Port 5002)]
   │
   ├─► POST /control/recover ──► [Simulator] (Executes remediation)
   └─► POST /explain ──────────► [Backend Alert Record]
   ▲
   │ Polls /api/alerts & /api/servers (every 5s)
[Frontend Dashboard (Port 5173)]
```

---

## 📁 Repository Structure

- `shared/` - Shared contracts (`CONTRACT.md`) and server topologies (`servers.json`).
- `simulator/` - 4 independent virtual cloud servers (Web, API, DB, Cache) generating realistic telemetry and fault injection endpoints.
- `agent/` - Lightweight metric collector polling servers and relaying to backend.
- `backend/` - Node.js/Express API service with MongoDB persistence and orchestration logic.
- `ml-service/` - FastAPI Python service for failure probability and anomaly prediction.
- `recovery-service/` - Automated self-healing execution and AI-based explanation service.
- `frontend/` - Vite + React + Tailwind CSS dashboard.
- `infra/` - Docker Compose configurations, Kubernetes manifests (`infra/k8s/`), and cloud deployment architecture notes (`infra/aws-notes.md`).
- `tests/` - Integration and end-to-end test suites.
- `docs/` - Project documentation and design reports.

---

## 🚀 How to Run

### 1. Prerequisites
- Node.js 20+ LTS
- Python 3.11+
- Docker & Docker Compose (optional for local standalone execution)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Running Services Locally

#### Running the Simulator (Turn 1):
```bash
cd simulator
npm install
npm start
```
Starts:
- `Web Server 01`: http://localhost:6001
- `API Server 01`: http://localhost:6002
- `Database Server 01`: http://localhost:6003
- `Cache Server 01`: http://localhost:6004

#### Running the Metrics Agent (Turn 1):
```bash
cd agent
npm install
npm start
```

#### Running via Docker Compose:
```bash
docker compose -f infra/docker-compose.yml up -d --build mongo simulator agent
```

---

## 📜 Contract & Standards
All communication contracts, port mappings, data schemas, and API definitions are strictly governed by [CONTRACT.md](file:///c:/cloudguardian-ai/shared/CONTRACT.md).
