import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.data_gen import (
    FEATURE_NAMES,
    generate_synthetic_data,
)

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
MODEL_VERSION = "1.0.0"


def train_models(models_dir: Path = None, n_samples: int = 20000, random_state: int = 42) -> dict:
    """
    Train IsolationForest on healthy ('none') rows and
    RandomForestClassifier with StandardScaler Pipeline on all data.
    Saves models to anomaly.joblib and classifier.joblib.
    """
    if models_dir is None:
        models_dir = MODELS_DIR
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating {n_samples} synthetic metric samples...")
    df = generate_synthetic_data(n_samples=n_samples, random_state=random_state)

    X = df[FEATURE_NAMES]
    y = df["failureType"]

    # 1. IsolationForest: trained ONLY on 'none' rows
    print("Training IsolationForest on 'none' rows...")
    df_none = df[df["failureType"] == "none"]
    X_none = df_none[FEATURE_NAMES]

    iso_forest = IsolationForest(
        contamination=0.05,
        random_state=random_state,
        n_estimators=150,
    )
    iso_forest.fit(X_none)

    # Compute raw score_samples on training 'none' rows to obtain min-max bounds
    raw_scores = iso_forest.score_samples(X_none)
    score_min = float(np.min(raw_scores))
    score_max = float(np.max(raw_scores))
    print(f"IsolationForest fitted. Score range on healthy training data: [{score_min:.4f}, {score_max:.4f}]")

    anomaly_payload = {
        "model": iso_forest,
        "score_min": score_min,
        "score_max": score_max,
        "feature_names": FEATURE_NAMES,
        "modelVersion": MODEL_VERSION,
    }
    anomaly_path = models_dir / "anomaly.joblib"
    joblib.dump(anomaly_payload, anomaly_path)
    print(f"Saved anomaly detector to {anomaly_path}")

    # 2. RandomForestClassifier inside Pipeline with StandardScaler (80/20 train/test split)
    print("Training RandomForestClassifier pipeline (80/20 split)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    rf_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestClassifier(n_estimators=150, random_state=random_state, n_jobs=-1)),
    ])
    rf_pipeline.fit(X_train, y_train)

    y_pred = rf_pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred)
    print(f"\nRandomForest Accuracy: {accuracy:.4f}")
    print("\nClassification Report:\n", report)

    classifier_payload = {
        "pipeline": rf_pipeline,
        "feature_names": FEATURE_NAMES,
        "classes": list(rf_pipeline.classes_),
        "modelVersion": MODEL_VERSION,
        "accuracy": accuracy,
    }
    classifier_path = models_dir / "classifier.joblib"
    joblib.dump(classifier_payload, classifier_path)
    print(f"Saved classifier to {classifier_path}")

    return {
        "status": "trained",
        "modelVersion": MODEL_VERSION,
        "accuracy": round(accuracy, 4),
    }


if __name__ == "__main__":
    result = train_models()
    print("Training completed successfully:", result)

