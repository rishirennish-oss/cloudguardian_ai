import os
from pathlib import Path
from typing import Dict, Any, List, Tuple
import joblib
import numpy as np
import pandas as pd

from app.data_gen import (
    FEATURE_NAMES,
    VALID_RANGES,
    HEALTHY_MEANS,
    HEALTHY_STDS,
)
from app.schemas import TopFeature, PredictResponse
from app.train import train_models, MODELS_DIR, MODEL_VERSION


class ModelManager:
    def __init__(self, models_dir: Path = None):
        self.models_dir = models_dir or MODELS_DIR
        self.anomaly_path = self.models_dir / "anomaly.joblib"
        self.classifier_path = self.models_dir / "classifier.joblib"
        self.anomaly_data = None
        self.classifier_data = None
        self.ensure_models_loaded()

    def ensure_models_loaded(self):
        """Load model files, or train automatically if missing."""
        if not self.anomaly_path.exists() or not self.classifier_path.exists():
            print("Model files missing. Training models automatically...")
            train_models(self.models_dir)

        self.anomaly_data = joblib.load(self.anomaly_path)
        self.classifier_data = joblib.load(self.classifier_path)
        print("Models successfully loaded into memory.")

    def reload(self):
        """Reload models from disk after retraining."""
        self.anomaly_data = joblib.load(self.anomaly_path)
        self.classifier_data = joblib.load(self.classifier_path)

    def clip_metrics(self, raw_metrics: Dict[str, Any]) -> Tuple[Dict[str, float], pd.DataFrame]:
        """Clip metric inputs to valid contract ranges."""
        clipped = {}
        for feat in FEATURE_NAMES:
            val = float(raw_metrics.get(feat, HEALTHY_MEANS[feat]))
            min_v, max_v = VALID_RANGES[feat]
            clipped[feat] = float(np.clip(val, min_v, max_v))
        df = pd.DataFrame([clipped])[FEATURE_NAMES]
        return clipped, df

    def compute_risk_level(self, failure_probability: float) -> str:
        """
        Risk level from failureProbability:
        < 0.30 -> low
        0.30 - 0.59 -> medium
        0.60 - 0.84 -> high
        >= 0.85 -> critical
        """
        if failure_probability < 0.30:
            return "low"
        elif failure_probability < 0.60:
            return "medium"
        elif failure_probability < 0.85:
            return "high"
        else:
            return "critical"

    def compute_top_features(self, clipped: Dict[str, float]) -> List[TopFeature]:
        """
        topFeatures = top 3 by (feature importance * normalized deviation from healthy mean),
        contributions normalized to sum 1, rounded to 2 decimals.
        """
        pipeline = self.classifier_data["pipeline"]
        rf_model = pipeline.named_steps["rf"]
        importances = rf_model.feature_importances_

        scores = []
        for idx, feat in enumerate(FEATURE_NAMES):
            imp = float(importances[idx])
            val = clipped[feat]
            mean_val = HEALTHY_MEANS[feat]
            std_val = HEALTHY_STDS[feat]
            dev = abs(val - mean_val) / std_val
            score = imp * dev
            scores.append((feat, score))

        # Sort descending by score
        scores.sort(key=lambda x: x[1], reverse=True)
        top3 = scores[:3]

        total_score = sum(s[1] for s in top3)
        if total_score > 1e-6:
            raw_weights = [s[1] / total_score for s in top3]
        else:
            raw_weights = [1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0]

        c1 = round(raw_weights[0], 2)
        c2 = round(raw_weights[1], 2)
        c3 = round(max(0.0, 1.0 - c1 - c2), 2)

        return [
            TopFeature(feature=top3[0][0], contribution=c1),
            TopFeature(feature=top3[1][0], contribution=c2),
            TopFeature(feature=top3[2][0], contribution=c3),
        ]

    def predict(self, server_id: str, raw_metrics: Dict[str, Any]) -> PredictResponse:
        """
        Inference logic per contract:
        - failureProbability = 1 - P("none")
        - predictedFailureType = most likely non-"none" class if failureProbability >= 0.30 else "none"
        - riskLevel via contract thresholds
        - isAnomaly = anomalyScore > 0.6 or IsolationForest predicts -1
        - topFeatures: top 3
        """
        clipped, X_df = self.clip_metrics(raw_metrics)

        # 1. IsolationForest score and anomaly detection
        iso_model = self.anomaly_data["model"]
        score_min = self.anomaly_data["score_min"]
        score_max = self.anomaly_data["score_max"]

        raw_score = float(iso_model.score_samples(X_df)[0])
        iso_pred = int(iso_model.predict(X_df)[0])  # -1 outlier, 1 inlier

        # Min-max normalization: higher score = more abnormal
        if score_max > score_min:
            norm_anomaly = (score_max - raw_score) / (score_max - score_min)
        else:
            norm_anomaly = 0.5
        anomaly_score = float(np.clip(norm_anomaly, 0.0, 1.0))
        anomaly_score = round(anomaly_score, 2)

        is_anomaly = bool(anomaly_score > 0.60 or iso_pred == -1)

        # 2. Classifier: RandomForest probabilities
        pipeline = self.classifier_data["pipeline"]
        probs = pipeline.predict_proba(X_df)[0]
        classes = pipeline.classes_
        prob_dict = {cls: float(p) for cls, p in zip(classes, probs)}

        p_none = prob_dict.get("none", 0.0)
        failure_prob = round(float(np.clip(1.0 - p_none, 0.0, 1.0)), 2)

        # 3. Predicted failure type
        fault_candidates = {cls: prob for cls, prob in prob_dict.items() if cls != "none"}
        if fault_candidates:
            best_fault_class = max(fault_candidates.items(), key=lambda item: item[1])[0]
        else:
            best_fault_class = "none"

        if failure_prob >= 0.30:
            predicted_failure_type = best_fault_class
        else:
            predicted_failure_type = "none"

        # 4. Risk level
        risk_level = self.compute_risk_level(failure_prob)

        # 5. Top features
        top_features = self.compute_top_features(clipped)

        return PredictResponse(
            serverId=server_id,
            isAnomaly=is_anomaly,
            anomalyScore=anomaly_score,
            failureProbability=failure_prob,
            predictedFailureType=predicted_failure_type,
            riskLevel=risk_level,
            topFeatures=top_features,
            modelVersion=MODEL_VERSION,
        )


# Global instance
model_manager = ModelManager()

