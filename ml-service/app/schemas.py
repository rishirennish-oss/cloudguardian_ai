from typing import List, Optional
from pydantic import BaseModel, Field


class MetricsInput(BaseModel):
    cpuUsage: float
    memoryUsage: float
    diskUsage: float
    networkIn: float
    networkOut: float
    responseTimeMs: float
    errorRate: float
    requestsPerSec: float


class PredictRequest(BaseModel):
    serverId: str
    metrics: MetricsInput


class TopFeature(BaseModel):
    feature: str
    contribution: float


class PredictResponse(BaseModel):
    serverId: str
    isAnomaly: bool
    anomalyScore: float
    failureProbability: float
    predictedFailureType: str
    riskLevel: str
    topFeatures: List[TopFeature]
    modelVersion: str


class TrainResponse(BaseModel):
    status: str
    modelVersion: str
    accuracy: float


class HealthResponse(BaseModel):
    status: str
    service: str

