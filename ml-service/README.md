# CloudGuardian AI — Machine Learning Service (`ml-service`)

**Owner:** Sohani Mohapatra  
**Component:** Failure Prediction & Anomaly Detection Service  
**Runtime:** Python 3.11+ / FastAPI / Uvicorn  
**Port:** `8000`

---

## 1. Overview

The `ml-service` is the intelligence core of **CloudGuardian AI**. It receives real-time server telemetry streams and predicts infrastructure failures before catastrophic downtime occurs. 

It implements a dual-model machine learning architecture:
1. **Unsupervised Anomaly Detection (Isolation Forest)** to detect abnormal operational drifts.
2. **Supervised Multi-Class Predictive Failure Classification (Random Forest)** to diagnose specific fault types, estimate failure probabilities, assign risk levels, and determine top contributing root-cause metrics.

---

## 2. Plain-English Model Explanations (Report & Patent Reference)

### A. Model 1: Isolation Forest (Unsupervised Anomaly Detection)
* **How it works:**  
  Isolation Forest builds an ensemble of random isolation trees that recursively partition feature space by selecting random features and split values. In healthy infrastructure telemetry, data points cluster densely together and require deep trees (many splits) to isolate. Anomalous states (sudden memory accumulation, abnormal request latency, packet drops) sit sparsely at the fringes and are quickly isolated with very short path lengths.
* **Training & Normalization:**  
  The model is trained solely on baseline healthy telemetry (`failureType == 'none'`) with a contamination factor of 0.05. Raw isolation scores are min-max normalized to produce an intuitive `anomalyScore` between `0.0` (optimal health) and `1.0` (extreme anomaly).
* **Role in Self-Healing:**  
  Provides early warning against zero-day anomalies, unseen hardware degradation, and non-linear metric drifts before specific signatures become apparent.

### B. Model 2: Random Forest Classifier with Standard Scaling (Supervised Failure Prediction)
* **How it works:**  
  An ensemble of 150 diverse decision trees trained on multi-dimensional telemetry features (`cpuUsage`, `memoryUsage`, `diskUsage`, `networkIn`, `networkOut`, `responseTimeMs`, `errorRate`, `requestsPerSec`). Inputs are preprocessed through a `StandardScaler` to ensure metrics with different units (e.g. milliseconds vs percentages vs Mbps) contribute proportionally without scale bias.
* **Predictive Horizon (Early-Stage Detection):**  
  Synthetic training data interpolates operational telemetry between healthy baselines and fault targets ($\alpha \in [0.20, 1.0]$). This trains the forest to recognize early warning signs (e.g., memory rising from 40% to 75% alongside moderate latency increases) rather than waiting for server crashes.
* **Risk Scoring & Attribution:**
  - **Failure Probability:** Computed as $1 - P(\text{"none"})$.
  - **Predicted Failure Type:** The non-healthy class with the highest probability when failure probability $\ge 0.30$; otherwise `"none"`.
  - **Risk Level:** Categorized per the shared contract thresholds:
    - $< 0.30$: `low`
    - $0.30 - 0.59$: `medium`
    - $0.60 - 0.84$: `high`
    - $\ge 0.85$: `critical`
  - **Root-Cause Attribution (`topFeatures`):** Calculated by multiplying the tree ensemble's Gini feature importances by the normalized deviation from healthy baseline means ($|x_i - \mu_i| / \sigma_i$), then normalizing the top 3 contributors to sum to 1.00.

---

## 3. API Contract

The service implements plain JSON endpoints without wrapping envelopes:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns `{"status":"ok","service":"ml-service"}` |
| `POST` | `/predict` | Ingests server telemetry and outputs risk level, fault type, probabilities, and top features |
| `POST` | `/train` | Re-trains both models on synthetic dataset and returns accuracy and model version |

### Telemetry Features (Exact Order)
1. `cpuUsage` (0–100%)
2. `memoryUsage` (0–100%)
3. `diskUsage` (0–100%)
4. `networkIn` (0–1000 Mbps)
5. `networkOut` (0–1000 Mbps)
6. `responseTimeMs` (20–5000 ms)
7. `errorRate` (0–100%)
8. `requestsPerSec` (0–2000 rps)

---

## 4. Local Setup and Execution

### Prerequisites
- Python 3.10 – 3.14 (Python 3.11 recommended)

### Setup Virtual Environment
```bash
cd ml-service
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Train Models
```bash
python -m app.train
```

### Start the Service
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 5. Verification & Testing

### Run Pytest Suite
```bash
pytest tests/test_predict.py -v
```

### Test Endpoints via `curl.exe` (Windows)
```bash
# Health check
curl.exe http://localhost:8000/health

# Healthy sample
curl.exe -X POST http://localhost:8000/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"serverId\":\"srv-web-01\",\"metrics\":{\"cpuUsage\":32.5,\"memoryUsage\":42.5,\"diskUsage\":50.0,\"networkIn\":250.0,\"networkOut\":215.0,\"responseTimeMs\":100.0,\"errorRate\":0.5,\"requestsPerSec\":250.0}}"

# Memory leak failure sample
curl.exe -X POST http://localhost:8000/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"serverId\":\"srv-web-01\",\"metrics\":{\"cpuUsage\":35.0,\"memoryUsage\":96.0,\"diskUsage\":50.0,\"networkIn\":250.0,\"networkOut\":200.0,\"responseTimeMs\":900.0,\"errorRate\":0.5,\"requestsPerSec\":250.0}}"
```

---

## 6. Docker Containerization

### Build Image
```bash
docker build -t ml-service ml-service
```

### Run Container
```bash
docker run -p 8000:8000 ml-service
```

### Multi-Service Docker Compose
```bash
docker compose -f infra/docker-compose.yml up -d --build ml-service
```

