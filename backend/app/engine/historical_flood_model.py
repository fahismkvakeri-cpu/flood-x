"""Random Forest P(flood) trained on the historical India flood observation CSV.

Implements blueprint sections 9 and 19.9: train RF/XGBoost-class model on labelled
events, compare with the weighted baseline, and expose feature importance.
"""
from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

INDIA_DATASET_PATH = Path(__file__).resolve().parents[3] / "flood_risk_dataset_india.csv"
MODEL_DIR = Path(__file__).resolve().parents[1] / "ml"
MODEL_PATH = MODEL_DIR / "flood_rf.joblib"

FEATURE_COLUMNS = [
    "rainfall_mm",
    "temperature_c",
    "humidity_pct",
    "river_discharge",
    "water_level_m",
    "elevation_m",
    "population_density",
    "historical_floods",
    "infrastructure",
    "land_cover_code",
    "soil_code",
]

LAND_COVER_CODES = {
    "water body": 0,
    "forest": 1,
    "agricultural": 2,
    "urban": 3,
    "desert": 4,
    "grassland": 5,
    "barren": 6,
}
SOIL_CODES = {
    "clay": 0,
    "peat": 1,
    "loam": 2,
    "sandy": 3,
    "silt": 4,
    "alluvial": 5,
}


def _code(mapping: Dict[str, int], value: Any, default: int) -> int:
    return mapping.get(str(value or "").strip().lower(), default)


def _baseline_probability(row: Dict[str, float]) -> float:
    """Reproduce the PDF section-8 weighted score on historical samples."""
    rainfall = min(1.0, row["rainfall_mm"] / 300.0)
    elevation = min(1.0, max(0.0, 1.0 - row["elevation_m"] / 9000.0))
    slope_proxy = min(1.0, row["water_level_m"] / 12.0)
    flow = min(1.0, row["river_discharge"] / 5000.0)
    drainage = min(1.0, 0.35 + 0.45 * row["historical_floods"] + 0.2 * (1.0 if row["rainfall_mm"] > 150 else 0.0))
    score = 0.30 * rainfall + 0.20 * elevation + 0.15 * slope_proxy + 0.15 * flow + 0.20 * drainage
    z = (score - 0.45) * 8.0
    return 1.0 / (1.0 + math.exp(-max(-6.0, min(6.0, z))))


class HistoricalFloodModel:
    def __init__(self) -> None:
        self.ready = False
        self.backend = "unavailable"
        self.metrics: Dict[str, Any] = {}
        self.feature_importance: List[Dict[str, Any]] = []
        self._model = None
        self._load_or_train()

    def _load_rows(self) -> Tuple[List[List[float]], List[int], List[Dict[str, float]]]:
        features: List[List[float]] = []
        labels: List[int] = []
        raw_rows: List[Dict[str, float]] = []
        if not INDIA_DATASET_PATH.exists():
            return features, labels, raw_rows
        with INDIA_DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                try:
                    parsed = {
                        "rainfall_mm": float(row.get("Rainfall (mm)", 0)),
                        "temperature_c": float(row.get("Temperature (°C)", 28)),
                        "humidity_pct": float(row.get("Humidity (%)", 70)),
                        "river_discharge": float(row.get("River Discharge (m³/s)", 0)),
                        "water_level_m": float(row.get("Water Level (m)", 0)),
                        "elevation_m": float(row.get("Elevation (m)", 10)),
                        "population_density": float(row.get("Population Density", 0)),
                        "historical_floods": float(row.get("Historical Floods", 0)),
                        "infrastructure": float(row.get("Infrastructure", 0)),
                        "land_cover_code": float(_code(LAND_COVER_CODES, row.get("Land Cover"), 3)),
                        "soil_code": float(_code(SOIL_CODES, row.get("Soil Type"), 2)),
                    }
                    label = int(float(row.get("Flood Occurred", 0)))
                except (TypeError, ValueError):
                    continue
                features.append([parsed[name] for name in FEATURE_COLUMNS])
                labels.append(label)
                raw_rows.append(parsed)
        return features, labels, raw_rows

    def _load_or_train(self) -> None:
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import accuracy_score, roc_auc_score
            from sklearn.model_selection import train_test_split
            import joblib
        except ImportError:
            self.backend = "sklearn_missing"
            return

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        X, y, raw_rows = self._load_rows()
        if len(X) < 200:
            self.backend = "insufficient_samples"
            return

        if MODEL_PATH.exists():
            try:
                bundle = joblib.load(MODEL_PATH)
                self._model = bundle["model"]
                self.metrics = bundle.get("metrics", {})
                self.feature_importance = bundle.get("feature_importance", [])
                self.ready = True
                self.backend = "random_forest"
                return
            except Exception:
                pass

        X_train, X_test, y_train, y_test, raw_train, raw_test = train_test_split(
            X, y, raw_rows, test_size=0.25, random_state=42, stratify=y
        )
        model = RandomForestClassifier(
            n_estimators=80,
            max_depth=10,
            min_samples_leaf=8,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]
        preds = (proba >= 0.5).astype(int)
        baseline_proba = [_baseline_probability(row) for row in raw_test]
        baseline_preds = [1 if value >= 0.5 else 0 for value in baseline_proba]
        metrics = {
            "samples": len(X),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "positive_rate": round(sum(y) / len(y), 3),
            "ml_accuracy": round(float(accuracy_score(y_test, preds)), 3),
            "baseline_accuracy": round(float(accuracy_score(y_test, baseline_preds)), 3),
            "ml_auc": round(float(roc_auc_score(y_test, proba)), 3),
            "baseline_auc": round(float(roc_auc_score(y_test, baseline_proba)), 3),
        }
        importance = [
            {"feature": name, "importance_pct": round(float(value) * 100.0, 1)}
            for name, value in zip(FEATURE_COLUMNS, model.feature_importances_)
        ]
        importance.sort(key=lambda item: item["importance_pct"], reverse=True)
        self._model = model
        self.metrics = metrics
        self.feature_importance = importance
        self.ready = True
        self.backend = "random_forest"
        joblib.dump(
            {"model": model, "metrics": metrics, "feature_importance": importance},
            MODEL_PATH,
        )

    def predict_probability(self, features: Dict[str, float]) -> Optional[Dict[str, Any]]:
        if not self.ready or self._model is None:
            return None
        vector = [[float(features.get(name, 0.0)) for name in FEATURE_COLUMNS]]
        probability = float(self._model.predict_proba(vector)[0][1])
        return {
            "ml_flood_probability_pct": round(probability * 100.0, 1),
            "model_backend": self.backend,
            "top_ml_features": self.feature_importance[:5],
        }

    def features_from_road(
        self,
        road: Dict[str, Any],
        rainfall_mm: float,
        drain_water_level_cm: float,
        rain_3h: float = None,
    ) -> Dict[str, float]:
        rain = rain_3h if rain_3h is not None else rainfall_mm
        return {
            "rainfall_mm": rain,
            "temperature_c": 28.5,
            "humidity_pct": 88.0,
            "river_discharge": float(road.get("flow_accumulation", 0)) / 2.0,
            "water_level_m": max(0.0, drain_water_level_cm / 100.0),
            "elevation_m": float(road.get("baseline_elevation", 8.0)),
            "population_density": 22000.0,
            "historical_floods": float(road.get("historical_flood_freq", 0)),
            "infrastructure": 1.0,
            "land_cover_code": 3.0,
            "soil_code": 2.0,
        }

    def status(self) -> Dict[str, Any]:
        return {
            "ready": self.ready,
            "backend": self.backend,
            "dataset": INDIA_DATASET_PATH.name,
            "model_path": str(MODEL_PATH.name),
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
        }


historical_flood_model = HistoricalFloodModel()
