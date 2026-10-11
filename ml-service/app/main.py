from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    PredictRequest,
    PredictResponse,
    TrainResponse,
    HealthResponse,
)
from app.model import model_manager
from app.train import train_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure models are loaded / trained at startup
    model_manager.ensure_models_loaded()
    yield


app = FastAPI(
    title="CloudGuardian AI - ML Service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS enabled for all origins per shared contract
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    """Health check endpoint per shared contract."""
    return HealthResponse(status="ok", service="ml-service")


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    """
    Predict anomaly score, failure probability, failure type,
    risk level, and top contributing features.
    """
    try:
        metrics_dict = payload.metrics.model_dump()
        response = model_manager.predict(payload.serverId, metrics_dict)
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(exc)}")


@app.post("/train", response_model=TrainResponse)
def train():
    """
    Retrain the anomaly detector and classifier models.
    """
    try:
        train_result = train_models()
        model_manager.reload()
        return TrainResponse(
            status="trained",
            modelVersion=train_result["modelVersion"],
            accuracy=train_result["accuracy"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Training error: {str(exc)}")

