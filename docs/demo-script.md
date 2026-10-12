# CloudGuardian AI - 2-Minute Live Demo Script

**Objective**: Demonstrate the complete autonomic closed-loop reliability cycle—from normal operations to fault injection, real-time AI anomaly detection, autonomous remediation, and natural language explainability—in exactly two minutes.

**Target Audience**: Technical leadership, Site Reliability Engineers, and Architecture Evaluators.  
**Total Duration**: 120 seconds (2:00 minutes).

---

## Prerequisites & Pre-Demo Setup (Before Timer Starts)
1. Ensure full stack is operational (`infra/docker-compose.yml up -d --build` or microservices running locally).
2. Open the web browser to the Frontend Dashboard: `http://localhost:5173`.
3. Verify that all 4 server nodes (`srv-web-01`, `srv-api-01`, `srv-db-01`, `srv-cache-01`) show green status (`healthy`) with low risk.
4. Have terminal or Postman ready for manual fault simulation trigger if not using UI buttons.

---

## Minute-by-Minute Demo Flow

### [00:00 – 00:25] Segment 1: Baseline Architecture & Healthy State
- **Visual**: Showcase the main CloudGuardian AI Dashboard (`http://localhost:5173`).
- **Speaker**:  
  > *"Welcome to CloudGuardian AI. What you see here is a real-time operations dashboard monitoring four critical cloud servers. Every five seconds, our edge collector streams eight-dimensional telemetry—including CPU, memory, disk, network, error rates, and response time—into our central orchestrator. Currently, all servers are running under normal baselines with low risk scores and zero open alerts."*
- **Action**: Hover over `srv-web-01` to display healthy telemetry baselines (CPU ~32%, Memory ~42%, Latency ~85ms).

---

### [00:25 – 00:50] Segment 2: Proactive Fault Injection (Simulating Degradation)
- **Visual**: Navigate to the Simulation Control panel or trigger fault via curl.
- **Speaker**:  
  > *"Now, let's simulate a silent enterprise disaster: a progressive memory leak on `srv-web-01`. Unlike a sudden crash, a memory leak escalates gradually over 60 seconds, which typically evades static threshold alarms until it's too late."*
- **Action**: Click **"Inject Memory Leak"** on `srv-web-01` (or run in terminal: `curl -X POST http://localhost:5000/api/simulate/fault -H "Content-Type: application/json" -d '{"serverId":"srv-web-01","faultType":"memory_leak"}'`).
- **Visual Feedback**: The telemetry charts show the blue memory usage line beginning its steady climb from 42% toward 97%.

---

### [00:50 – 01:20] Segment 3: Autonomous AI Prediction & Alert Generation
- **Visual**: The server card shifts from green to yellow, then orange/red as risk level escalates.
- **Speaker**:  
  > *"Notice what happens before the server ever crashes: our dual-stage machine learning engine kicks in. The unsupervised Isolation Forest detects multi-variate statistical divergence, while our Random Forest classifier recognizes the signature of a `memory_leak`. At approximately 37 seconds, failure probability crosses 85%, triggering a 'critical' risk alert. CloudGuardian doesn't just alert us—it initiates autonomous remediation immediately."*
- **Action**: Click into the **Active Alerts** panel. Highlight the newly generated alert showing `failureType: memory_leak`, `riskLevel: critical`, and status `recovering`.

---

### [01:20 – 01:45] Segment 4: Automated Self-Healing & Verification
- **Visual**: The Alert transitions to `resolved` and `srv-web-01` telemetry sharply drops back to baseline.
- **Speaker**:  
  > *"Watch `srv-web-01` recover in real-time. The Recovery Engine evaluated our safety invariants—confirming that cooldown timers and rate limits were clean—and dispatched a targeted `restart_service` command to the server instance. In just 5 seconds, the simulator restores memory from 97% back to a healthy 41%. The alert status automatically updates to 'resolved', and the node returns to green health."*
- **Action**: Show the Recovery History table showing the execution record: `Action: restart_service`, `Success: true`, `Duration: ~50ms`.

---

### [01:45 – 02:00] Segment 5: Explainable AI Diagnostics & Conclusion
- **Visual**: Click on the resolved Alert to open the **Explainability Modal**.
- **Speaker**:  
  > *"Finally, we eliminate the black-box dilemma. CloudGuardian AI synthesizes an instant plain-English causal report:  
  > 'Server srv-web-01 shows memory at 96% and response time of 900 ms. The AI model predicts memory_leak with 91% probability. Action taken: restart_service - success.'  
  > It also provides three actionable recommendations for engineering follow-up. That is true closed-loop autonomic reliability: predictive detection, autonomous remediation, and complete transparent explainability in under a minute."*
- **Action**: Conclude the demonstration.

---

## Fallback / Troubleshooting Tips
- **If alert takes longer than 40s**: Explain that the simulator escalates over 60s to mirror realistic gradual leaks, demonstrating early detection before node collapse.
- **To demonstrate safety rules**: Immediately click "Inject Fault" again; show the system return `"cooldown active"` to prove rate-limiting and anti-flapping protection.
