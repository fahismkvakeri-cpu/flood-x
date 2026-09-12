"""Hybrid Physics-Informed ML Flood Prediction & Explainability Engine for FLOOD-X.
Implements the Section 8 Standardized Baseline Flood-Risk Model and feature weightings.
"""
import math
from typing import Dict, List, Any
from ..config import BASELINE_WEIGHTS, RISK_LEVELS_NORM, RISK_LEVELS
from ..data.pilot_dataset import ROADS
from .rainfall_nowcast import nowcast_engine
from .drainage_digital_twin import drainage_twin

class FloodMLModel:
    def __init__(self):
        self.weights = BASELINE_WEIGHTS

    def predict_for_road(
        self,
        road: Dict[str, Any],
        t_minutes: int,
        rainfall_scenario_mm: float,
        blockage_pct: float,
        drain_sim_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculates street-level flood depth, Section 8 baseline risk score, and XAI feature contributions."""
        # 1. Local rainfall nowcast at road coordinate
        mid_coords = road["coords"][len(road["coords"]) // 2]
        rain_intensity = nowcast_engine.get_intensity_at_location(
            mid_coords[0], mid_coords[1], t_minutes, rainfall_scenario_mm
        )
        accumulated_rain = round(rainfall_scenario_mm * min(1.0, (t_minutes + 15) / 100.0), 1)

        # 2. Associated drainage hydraulic state
        associated_pipe_id = road.get("drain_id", "PIPE-102")
        pipe_data = next((p for p in drain_sim_result["pipes"] if p["pipe_id"] == associated_pipe_id), None)
        drain_utilization = pipe_data["utilization_pct"] if pipe_data else 100.0
        is_surcharged = pipe_data["status"] == "SURCHARGED" if pipe_data else False
        drain_overflow = pipe_data["overflow_m3s"] if pipe_data else 0.0
        drain_node = drain_sim_result["nodes"].get(pipe_data["source"]) if pipe_data else None
        estimated_water_level = drain_node["estimated_water_level_cm"] if drain_node else 0.0
        retained_volume = drain_node["retained_volume_m3"] if drain_node else 0.0
        drainage_effectiveness = drain_node["drainage_effectiveness_pct"] if drain_node else 0.0

        # 3. Terrain & Surface characteristics (Copernicus DEM & OSM)
        elevation = road["baseline_elevation"]  # meters AMSL
        slope = road["slope"]
        flow_acc = road["flow_accumulation"]
        imperviousness = road["imperviousness"]
        hist_freq = road["historical_flood_freq"]

        # =========================================================================
        # SECTION 8: STANDARDIZED BASELINE FLOOD-RISK MODEL
        # Normalize each feature to [0, 1]
        # =========================================================================
        # Rainfall: 0 - 150 mm/h
        norm_rain = min(1.0, max(0.0, (rain_intensity / 100.0) * 0.6 + (accumulated_rain / 120.0) * 0.4))
        
        # Elevation: lower elevation = higher flood risk (inverted: 2.0m -> 1.0, 12.0m -> 0.0)
        norm_elev_inv = min(1.0, max(0.0, (12.0 - elevation) / 10.0))
        
        # Slope: lower slope = water ponding (inverted: 0.001 -> 1.0, 0.02 -> 0.0)
        norm_slope_inv = min(1.0, max(0.0, 1.0 - (slope / 0.02)))
        
        # Flow Accumulation: higher upstream catchment = higher risk (0 - 10,000 cells)
        norm_flow_acc = min(1.0, max(0.0, flow_acc / 9500.0))
        
        # Drainage Condition/Utilization: 0% -> 0.0, 100% -> 0.8, 150%+ -> 1.0
        norm_drain_util = min(1.0, max(0.0, drain_utilization / 140.0))

        # Weighted Composite Risk Formula (Section 8 Blueprint)
        # Weights: Rainfall 0.30, Elevation 0.20, Slope 0.15, Flow Acc 0.15, Drainage 0.20
        norm_risk = (
            self.weights["rainfall"] * norm_rain +
            self.weights["elevation"] * norm_elev_inv +
            self.weights["slope"] * norm_slope_inv +
            self.weights["flow_accumulation"] * norm_flow_acc +
            self.weights["drainage"] * norm_drain_util
        )
        norm_risk = round(min(1.0, max(0.0, norm_risk)), 3)

        # Risk Classification (Section 8 Thresholds)
        # 0.0-0.3 Low, 0.3-0.6 Medium, 0.6-0.8 High, 0.8-1.0 Critical
        if norm_risk < 0.30:
            risk_level = "Low"
            risk_category = "SAFE"
            color = "#10b981"
        elif norm_risk < 0.60:
            risk_level = "Medium"
            risk_category = "WATCH"
            color = "#f59e0b"
        elif norm_risk < 0.80:
            risk_level = "High"
            risk_category = "MODERATE"
            color = "#f97316"
        else:
            risk_level = "Critical"
            risk_category = "CRITICAL"
            color = "#ef4444"

        # Scaled integer risk score (0-100)
        risk_score = int(round(norm_risk * 100))

        # =========================================================================
        # PHYSICAL WATER DEPTH CALCULATION (cm)
        # =========================================================================
        surface_depth_cm = (accumulated_rain * imperviousness * 0.12) * (1.0 - min(0.5, slope * 25.0))
        elevation_factor = max(0.0, (6.8 - elevation) * 5.2)
        surcharge_cm = (
            (max(0.0, drain_utilization - 90.0) * 0.26)
            + (drain_overflow * 14.0)
            + (estimated_water_level * 0.35)
        )
        flow_acc_factor = (flow_acc / 9200.0) * 8.5
        
        raw_depth = surface_depth_cm + elevation_factor + surcharge_cm + flow_acc_factor
        time_progression = min(1.0, 0.25 + (t_minutes / 90.0) * 0.85)
        predicted_depth_cm = round(max(0.0, raw_depth * time_progression), 1)

        # Flood Probability (Sigmoid-calibrated)
        z = (norm_risk - 0.45) * 8.0
        flood_prob_pct = round(100.0 / (1.0 + math.exp(-max(-6.0, min(6.0, z)))), 1)

        # Time to Flood (minutes)
        if predicted_depth_cm >= 15.0:
            time_to_flood_min = max(5, int(45 - (norm_risk * 35.0)))
            flood_duration_hrs = round(1.0 + (predicted_depth_cm / 25.0), 1)
        else:
            time_to_flood_min = None
            flood_duration_hrs = 0.0

        # =========================================================================
        # SECTION 6: EXPLAINABILITY (Contributing Features & Plain-Language Reasons)
        # =========================================================================
        raw_feature_contributions = {
            "Rainfall Intensity & Accumulation": self.weights["rainfall"] * norm_rain,
            "Low Elevation & Depression Basin": self.weights["elevation"] * norm_elev_inv,
            "Drainage Conduit Surcharge & Blockage": self.weights["drainage"] * norm_drain_util,
            "Upstream Flow Accumulation": self.weights["flow_accumulation"] * norm_flow_acc,
            "Flat Terrain Slope Ponding": self.weights["slope"] * norm_slope_inv
        }
        total_contr = sum(raw_feature_contributions.values()) or 1.0
        feature_percentages = {
            k: round((v / total_contr) * 100.0, 1) for k, v in raw_feature_contributions.items()
        }

        # Plain language explanation synthesis
        top_factor = max(feature_percentages.items(), key=lambda x: x[1])[0]
        reasons = []
        if is_surcharged:
            reasons.append(f"Storm drain conduit {associated_pipe_id} is surcharged ({drain_utilization}% capacity).")
        if elevation < 4.0:
            reasons.append(f"Low elevation depression ({elevation}m AMSL) prone to rapid stormwater runoff ponding.")
        if rain_intensity > 40.0:
            reasons.append(f"Heavy convective precipitation ({rain_intensity} mm/h) exceeding infiltration rate.")
        if flow_acc > 7000:
            reasons.append("High upstream surface flow accumulation draining into this road segment.")
        plain_reason = " ".join(reasons) if reasons else "Normal hydrological equilibrium with passable road conditions."

        confidence = max(60.0, round(96.0 - (t_minutes * 0.18), 1))

        return {
            "road_id": road["id"],
            "name": road["name"],
            "coords": road["coords"],
            "road_type": road["road_type"],
            "length_m": road["length_m"],
            "elevation_m": road["baseline_elevation"],
            "forecast_horizon_min": t_minutes,
            "predicted_depth_cm": predicted_depth_cm,
            "flood_probability_pct": flood_prob_pct,
            "risk_score_norm": norm_risk,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_category": risk_category,
            "color": color,
            "time_to_flood_min": time_to_flood_min,
            "flood_duration_hrs": flood_duration_hrs,
            "drain_utilization_pct": drain_utilization,
            "drain_status": pipe_data["status"] if pipe_data else "NORMAL",
            "drainage_area_id": drain_node["id"] if drain_node else None,
            "drainage_area_name": drain_node["name"] if drain_node else "Unknown drainage area",
            "drainage_water_level_cm": estimated_water_level,
            "drainage_retained_volume_m3": retained_volume,
            "drainage_effectiveness_pct": drainage_effectiveness,
            "drainage_level_status": drain_node["level_status"] if drain_node else "UNKNOWN",
            "confidence_pct": confidence,
            "is_closed": predicted_depth_cm >= 25.0 or norm_risk >= 0.80,
            "explainability": feature_percentages,
            "top_factor": top_factor,
            "plain_reason": plain_reason
        }

    def predict_all(
        self,
        t_minutes: int,
        rainfall_scenario_mm: float = 85.0,
        blockage_pct: float = 0.0
    ) -> Dict[str, Any]:
        """Runs Section 8 baseline predictions across all mapped streets in the pilot area."""
        nowcast = nowcast_engine.get_nowcast(t_minutes, rainfall_scenario_mm)
        drain_sim = drainage_twin.simulate(nowcast["avg_intensity_mm_hr"], blockage_pct)

        road_predictions: List[Dict[str, Any]] = []
        for r in ROADS:
            pred = self.predict_for_road(
                r, t_minutes, rainfall_scenario_mm, blockage_pct, drain_sim
            )
            road_predictions.append(pred)

        # Dashboard KPIs computation
        active_flood_zones = sum(1 for p in road_predictions if p["predicted_depth_cm"] >= 15.0)
        critical_roads = sum(1 for p in road_predictions if p["risk_level"] in ["High", "Critical"])
        max_depth = max((p["predicted_depth_cm"] for p in road_predictions), default=0.0)

        # Timeline depth projections for each road
        timeline_projections = {}
        for r in ROADS:
            projections = []
            for t_step in [0, 30, 60, 90, 120, 180]:
                step_nowcast = nowcast_engine.get_nowcast(t_step, rainfall_scenario_mm)
                step_drain = drainage_twin.simulate(step_nowcast["avg_intensity_mm_hr"], blockage_pct)
                step_pred = self.predict_for_road(r, t_step, rainfall_scenario_mm, blockage_pct, step_drain)
                projections.append({
                    "horizon_min": t_step,
                    "depth_cm": step_pred["predicted_depth_cm"],
                    "risk_score_norm": step_pred["risk_score_norm"],
                    "risk_score": step_pred["risk_score"],
                    "risk_level": step_pred["risk_level"],
                    "risk_category": step_pred["risk_category"]
                })
            timeline_projections[r["id"]] = projections

        return {
            "forecast_horizon_min": t_minutes,
            "rainfall_scenario_mm": rainfall_scenario_mm,
            "blockage_pct": blockage_pct,
            "nowcast": nowcast,
            "drainage": drain_sim,
            "kpis": {
                "active_flood_zones": active_flood_zones,
                "critical_roads": critical_roads,
                "surcharged_drains": drain_sim["surcharged_count"],
                "max_water_depth_cm": max_depth,
                "total_monitored_roads": len(ROADS)
            },
            "roads": road_predictions,
            "timeline_projections": timeline_projections
        }

flood_ml_model = FloodMLModel()
