from __future__ import annotations

from pathlib import Path
from typing import Any
import joblib

MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "seasonal_model.joblib"

_model: Any = None
_model_loaded = False


def _load_model():
    global _model, _model_loaded
    if _model_loaded:
        return _model
    _model_loaded = True
    if MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
    return _model


def seasonal_predict(features: dict) -> tuple[str | None, float | None]:
    model = _load_model()
    if model is None:
        return None, None

    x = {
        "lat": [features["lat"]],
        "lon": [features["lon"]],
        "season_code": [features["season_code"]],
        "anomaly_pct": [features["anomaly_pct"]],
        "current_mean_daily_mm": [features["current_mean_daily_mm"]],
        "historical_mean_daily_mm": [features["historical_mean_daily_mm"]],
    }

    pred = model.predict(x)[0]
    prob = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(x)[0]
        classes = list(model.classes_)
        idx = classes.index(pred)
        prob = float(proba[idx])

    return str(pred), prob
