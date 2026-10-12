# CloudGuardian AI - Frontend Service

Autonomous Cloud Infrastructure Self-Healing & Anomaly Monitoring Dashboard built with **Vite**, **React**, and **Tailwind CSS 3.4**.

---

## Tech Stack & Architecture

- **Build Tool:** Vite 6
- **UI Library:** React 18 (JavaScript)
- **Styling:** Tailwind CSS 3.4 (with PostCSS and Autoprefixer)
- **Routing:** React Router DOM v6
- **Charts:** Recharts (Line charts for CPU, Memory, Disk, Response Time metrics)
- **Icons:** Lucide React
- **HTTP Client:** Axios (automatic backend response envelope unwrapping to `response.data.data`)

---

## Features

1. **Dashboard (`/`):**
   - 5 KPI Summary Cards: Total Servers, Healthy, Open Alerts, Recoveries Today, Uptime %.
   - Server Node Grid: Live status badge, risk badge, failure probability progress bar, and real-time CPU / Memory / Disk usage. Click opens node detail.

2. **Server Detail (`/servers/:serverId`):**
   - 4 Time-series LineCharts for `cpuUsage`, `memoryUsage`, `diskUsage`, and `responseTimeMs` over the last 50 telemetry points.
   - Instance header with health status, risk level, failure probability, and last update timestamp.
   - Dedicated alerts log for the selected server with one-click resolution.

3. **Alerts (`/alerts`):**
   - Real-time incident table: Timestamp, Server ID, Failure Type, Risk Level, Probability %, Status, Root-cause explanation, and Recommended actions.
   - Status filters (`All`, `Open`, `Resolved`).
   - Manual `Resolve` button for open alerts.
   - Clean empty state (`No alerts - system healthy`).

4. **Recoveries (`/recoveries`):**
   - Audit trail of autonomous self-healing actions: Timestamp, Server, Action executed, Success / failure status indicator, System message, and Duration in milliseconds.

5. **Fault Injection Simulator (`/simulate`):**
   - Interactive control panel to test AI anomaly detection and self-healing pipelines in real-time.
   - Select server and choose from 5 failure modes: `cpu_overload`, `memory_leak`, `disk_full`, `network_congestion`, or `service_crash`.
   - **Inject Fault** and **Reset Server** triggers with live execution response payload display.

6. **Live Connectivity TopBar:**
   - Real-time backend polling status indicator (pulsing green **Live** dot when polling succeeds, red **Backend unreachable** when connection fails).
   - Polling interval set to 5000 ms.

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL for Backend API service |
| `VITE_USE_MOCK` | `false` | When `true`, serves mock dataset in exact contract shape |

---

## Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server (port 5173):
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

3. Build for production:
   ```bash
   npm run build
   ```

---

## Docker Deployment

Build and run using multi-stage Docker build with Nginx:

```bash
docker build -t cloudguardian-frontend .
docker run -p 5173:80 cloudguardian-frontend
```

