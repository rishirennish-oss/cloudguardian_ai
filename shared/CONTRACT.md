# CloudGuardian AI - SHARED CONTRACT (never rename anything)

FLOW: simulator servers -> agent GET /metrics every 5s -> agent POST backend /api/metrics -> backend saves to MongoDB -> backend POST ml-service /predict -> if riskLevel "high"/"critical" backend creates Alert -> backend POST recovery-service /recover -> recovery-service POST simulator /control/recover -> backend POST recovery-service /explain -> frontend polls backend every 5s.

OWNERS (each edits only own folders): Rishi: simulator/ agent/ infra/ shared/ | Sohani: ml-service/ | Rishav: recovery-service/ tests/ docs/ | Vedansh: backend/ | Krishna: frontend/

TECH: Node 20 LTS, npm, CommonJS ONLY (require/module.exports) for simulator, agent, backend, recovery-service. Entry file src/index.js, start with `npm start` from the service's own folder. Python 3.11 + FastAPI + uvicorn for ml-service (`uvicorn app.main:app --host 0.0.0.0 --port 8000`). Frontend: Vite + React JavaScript (no TypeScript) + Tailwind CSS 3.4 + axios + react-router-dom + recharts + lucide-react. DB: MongoDB + mongoose (backend only). All JSON keys camelCase. Timestamps ISO 8601 UTC strings. Percent values numbers 0-100.
RULES: every service has GET /health -> {"status":"ok","service":"<name>"}; CORS enabled for all origins; env vars read with defaults below (dotenv); every outgoing HTTP call has 5s timeout and try/catch; a service must NEVER crash because another service is down; relative paths in env are resolved with path.resolve(process.cwd(), value); every service folder has a Dockerfile (build context = its folder) and README.md; git: main branch only, one person at a time, commit only own folders.

PORTS / DOCKER HOSTNAMES: frontend 5173 (host "frontend", container nginx port 80) | backend 5000 ("backend") | recovery-service 5002 ("recovery-service") | ml-service 8000 ("ml-service") | simulator servers 6001-6004 ("simulator") | mongo 27017 ("mongo")
ENV (name=local default | docker value): PORT=<own port> ; MONGO_URI=mongodb://localhost:27017/cloudguardian | mongodb://mongo:27017/cloudguardian ; ML_SERVICE_URL=http://localhost:8000 | http://ml-service:8000 ; RECOVERY_SERVICE_URL=http://localhost:5002 | http://recovery-service:5002 ; BACKEND_URL=http://localhost:5000 | http://backend:5000 ; SIM_HOST=localhost | simulator ; SERVERS_FILE=../shared/servers.json | /app/shared/servers.json ; COLLECT_INTERVAL_MS=5000 ; VITE_API_BASE_URL=http://localhost:5000/api ; VITE_USE_MOCK=false ; ANTHROPIC_API_KEY= (optional, recovery-service only)
Server base URL = "http://" + SIM_HOST + ":" + port (port from servers.json).

shared/servers.json:
[{"serverId":"srv-web-01","name":"Web Server 01","type":"web","port":6001},{"serverId":"srv-api-01","name":"API Server 01","type":"api","port":6002},{"serverId":"srv-db-01","name":"Database Server 01","type":"database","port":6003},{"serverId":"srv-cache-01","name":"Cache Server 01","type":"cache","port":6004}]

ENUMS: serverStatus: healthy|degraded|down ; riskLevel: low|medium|high|critical ; failureType: none|cpu_overload|memory_leak|disk_full|network_congestion|service_crash ; recoveryAction: none|restart_service|scale_up|cleanup_disk|throttle_traffic|failover ; alertStatus: open|recovering|resolved
riskLevel from failureProbability: <0.30 low | 0.30-0.59 medium | 0.60-0.84 high | >=0.85 critical
failureType->recoveryAction: cpu_overload->scale_up, memory_leak->restart_service, disk_full->cleanup_disk, network_congestion->throttle_traffic, service_crash->restart_service (if it fails retry with failover), none->none

METRIC OBJECT: {"serverId":"srv-web-01","timestamp":"<ISO>","cpuUsage":35.2,"memoryUsage":48.1,"diskUsage":52.0,"networkIn":220.5,"networkOut":180.3,"responseTimeMs":85,"errorRate":0.4,"requestsPerSec":240,"status":"healthy"}
Ranges: cpu/memory/disk/errorRate 0-100, networkIn/Out 0-1000 Mbps, responseTimeMs 20-5000, requestsPerSec 0-2000.
ML FEATURES (exact order): cpuUsage, memoryUsage, diskUsage, networkIn, networkOut, responseTimeMs, errorRate, requestsPerSec
Healthy: cpu 20-45, memory 30-55, disk 40-60, networkIn 100-400, networkOut 80-350, responseTimeMs 40-200, errorRate 0-2, requestsPerSec 50-500.
Fault targets (reached gradually over ~60s so AI can predict before failure): cpu_overload: cpu->95, responseTimeMs->1500, requestsPerSec drops | memory_leak: memory->97, responseTimeMs->900 | disk_full: disk->98, errorRate->10 | network_congestion: networkIn/networkOut->900, responseTimeMs->1800, errorRate->12 | service_crash (instant): status down, cpu 0, requestsPerSec 0, errorRate 100, responseTimeMs 5000.
status rule: "down" if service_crash; "degraded" if cpu>85 or memory>85 or disk>90 or errorRate>5 or responseTimeMs>1000; else "healthy".

SIMULATOR API (each server on own port): GET /health ; GET /metrics -> METRIC OBJECT ; POST /control/fault {"faultType":"memory_leak"} -> {"serverId","faultType","started":true} ; POST /control/recover {"action":"restart_service"} -> {"serverId","action","success":true,"message":"..."} (restart_service and failover clear any fault; other actions clear only the matching fault, otherwise success:false) ; POST /control/reset -> {"serverId","reset":true}

ML API (plain JSON, no envelope): POST /predict {"serverId","metrics":{8 feature keys}} -> {"serverId","isAnomaly":true,"anomalyScore":0.82,"failureProbability":0.91,"predictedFailureType":"memory_leak","riskLevel":"critical","topFeatures":[{"feature":"memoryUsage","contribution":0.46}],"modelVersion":"1.0.0"} ; POST /train -> {"status":"trained","modelVersion":"1.0.0","accuracy":0.96} ; GET /health

RECOVERY API (plain JSON): POST /recover {"serverId","failureType","riskLevel"} -> {"serverId","action","success","message","executedAt","durationMs"} ; POST /explain {"serverId","metrics":METRIC,"prediction":ML response,"recovery":/recover response or null} -> {"explanation":"text","severity":"critical","recommendedActions":["..."],"generatedBy":"template"|"llm"} ; GET /health

BACKEND API (base /api, ALWAYS envelope {"success":true,"data":...} or {"success":false,"error":"msg"}):
POST /api/metrics (body METRIC) -> data {"metric":{},"prediction":{}|null}
GET /api/servers -> data [{"serverId","name","type","status","riskLevel","failureProbability","latestMetrics":METRIC,"lastUpdated"}]
GET /api/servers/:serverId -> data (one of the above)
GET /api/servers/:serverId/metrics?limit=50 -> data [METRIC...] oldest first
GET /api/alerts?status=open -> data [ALERT...] newest first (status optional)
PATCH /api/alerts/:id/resolve -> data ALERT
GET /api/recoveries?limit=50 -> data [RECOVERY...] newest first
GET /api/stats/summary -> data {"totalServers","healthyServers","degradedServers","downServers","openAlerts","recoveriesToday","successfulRecoveries","avgRecoveryTimeMs","uptimePercent"}
POST /api/simulate/fault {"serverId","faultType"} -> data {"serverId","faultType","started":true}
POST /api/simulate/reset {"serverId"} -> data {"serverId","reset":true}
GET /api/health
ALERT: {"_id","serverId","riskLevel","failureType","failureProbability","anomalyScore","explanation","recommendedActions":[],"status":"open","createdAt","resolvedAt":null}
RECOVERY: {"_id","alertId","serverId","action","success","message","executedAt","durationMs"}
MongoDB collections (mongoose): Server, Metric, Alert, RecoveryAction (fields = keys above).

BACKEND ORCHESTRATION on POST /api/metrics: validate -> save Metric -> update Server -> call ML /predict (if down: riskLevel low, isAnomaly false) -> if riskLevel high/critical AND no Alert for serverId with status open/recovering: create Alert, call /recover, save RecoveryAction, call /explain, store explanation + recommendedActions on Alert, set status resolved if recovery success else open. Auto-resolve open alerts when status healthy and riskLevel low.
