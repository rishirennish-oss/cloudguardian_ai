import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ml-service"


def test_healthy_metrics_low_risk():
    """Healthy metrics must yield low riskLevel."""
    payload = {
        "serverId": "srv-web-01",
        "metrics": {
            "cpuUsage": 32.5,
            "memoryUsage": 42.5,
            "diskUsage": 50.0,
            "networkIn": 250.0,
            "networkOut": 215.0,
            "responseTimeMs": 100.0,
            "errorRate": 0.5,
            "requestsPerSec": 250.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["serverId"] == "srv-web-01"
    assert data["riskLevel"] == "low"
    assert data["predictedFailureType"] == "none"
    assert data["failureProbability"] < 0.30
    assert len(data["topFeatures"]) == 3
    # Check topFeatures contributions sum to ~1.0
    total_contrib = sum(f["contribution"] for f in data["topFeatures"])
    assert abs(total_contrib - 1.0) <= 0.02


def test_memory_leak_high_or_critical():
    """memory 96 / response 900 -> memory_leak + high/critical."""
    payload = {
        "serverId": "srv-web-01",
        "metrics": {
            "cpuUsage": 35.0,
            "memoryUsage": 96.0,
            "diskUsage": 50.0,
            "networkIn": 250.0,
            "networkOut": 200.0,
            "responseTimeMs": 900.0,
            "errorRate": 0.5,
            "requestsPerSec": 250.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predictedFailureType"] == "memory_leak"
    assert data["riskLevel"] in ["high", "critical"]
    assert data["failureProbability"] >= 0.60
    # memoryUsage should be in top features
    feat_names = [f["feature"] for f in data["topFeatures"]]
    assert "memoryUsage" in feat_names


def test_cpu_overload():
    """cpu 95 / response 1500 -> cpu_overload."""
    payload = {
        "serverId": "srv-api-01",
        "metrics": {
            "cpuUsage": 95.0,
            "memoryUsage": 40.0,
            "diskUsage": 50.0,
            "networkIn": 250.0,
            "networkOut": 200.0,
            "responseTimeMs": 1500.0,
            "errorRate": 0.5,
            "requestsPerSec": 30.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predictedFailureType"] == "cpu_overload"
    assert data["riskLevel"] in ["high", "critical"]
    feat_names = [f["feature"] for f in data["topFeatures"]]
    assert "cpuUsage" in feat_names


def test_disk_full():
    """disk 98 / error 10 -> disk_full."""
    payload = {
        "serverId": "srv-db-01",
        "metrics": {
            "cpuUsage": 35.0,
            "memoryUsage": 45.0,
            "diskUsage": 98.0,
            "networkIn": 200.0,
            "networkOut": 180.0,
            "responseTimeMs": 120.0,
            "errorRate": 10.0,
            "requestsPerSec": 200.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predictedFailureType"] == "disk_full"
    assert data["riskLevel"] in ["high", "critical"]
    feat_names = [f["feature"] for f in data["topFeatures"]]
    assert "diskUsage" in feat_names


def test_network_congestion():
    """network 900 / response 1800 / error 12 -> network_congestion."""
    payload = {
        "serverId": "srv-cache-01",
        "metrics": {
            "cpuUsage": 35.0,
            "memoryUsage": 45.0,
            "diskUsage": 50.0,
            "networkIn": 900.0,
            "networkOut": 900.0,
            "responseTimeMs": 1800.0,
            "errorRate": 12.0,
            "requestsPerSec": 200.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predictedFailureType"] == "network_congestion"
    assert data["riskLevel"] in ["high", "critical"]


def test_service_crash():
    """cpu 0, requests 0, error 100, response 5000 -> service_crash."""
    payload = {
        "serverId": "srv-web-01",
        "metrics": {
            "cpuUsage": 0.0,
            "memoryUsage": 20.0,
            "diskUsage": 50.0,
            "networkIn": 0.0,
            "networkOut": 0.0,
            "responseTimeMs": 5000.0,
            "errorRate": 100.0,
            "requestsPerSec": 0.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predictedFailureType"] == "service_crash"
    assert data["riskLevel"] == "critical"
    assert data["failureProbability"] >= 0.85
    assert data["isAnomaly"] is True


def test_early_stage_fault_medium_or_higher():
    """EARLY sample (memory 75, response 500) -> riskLevel at least medium."""
    payload = {
        "serverId": "srv-web-01",
        "metrics": {
            "cpuUsage": 35.0,
            "memoryUsage": 75.0,
            "diskUsage": 50.0,
            "networkIn": 250.0,
            "networkOut": 200.0,
            "responseTimeMs": 500.0,
            "errorRate": 0.5,
            "requestsPerSec": 250.0,
        },
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["riskLevel"] in ["medium", "high", "critical"]
    assert data["failureProbability"] >= 0.30

