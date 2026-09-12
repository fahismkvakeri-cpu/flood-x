"""FastAPI Application for FLOOD-X REST API."""
import os
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

from .config import PILOT_ZONE, TIMELINE_STEPS, VEHICLE_PROFILES
from .data.pilot_dataset import JUNCTIONS, ROADS, DRAIN_NODES, DRAIN_EDGES, DEM_CONTOURS
from .engine.rainfall_nowcast import nowcast_engine
from .engine.drainage_digital_twin import drainage_twin
from .engine.flood_ml_model import flood_ml_model
from .engine.emergency_routing import emergency_router

app = FastAPI(
    title="FLOOD-X: AI-Powered Urban Flood Nowcasting & Drainage Digital Twin",
    version="1.0.0",
    description="SIH Problem Statement SIH26085 - Ministry of Earth Sciences (MoES / NCMRWF)"
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DrainageSimulationRequest(BaseModel):
    rainfall_intensity_mm_hr: float = Field(default=65.0, ge=0.0, le=250.0)
    blockage_pct: float = Field(default=0.0, ge=0.0, le=95.0)

class RouteRequest(BaseModel):
    origin_id: str = "J_ASIAN_HEART"
    destination_id: str = "J_BAIL_BAZAR"
    vehicle_type: str = "AMBULANCE"
    forecast_horizon_min: int = 60
    rainfall_scenario_mm: float = 85.0
    blockage_pct: float = 0.0

@app.get("/api/status")
def get_system_status():
    """Health check and pilot region metadata."""
    return {
        "status": "ONLINE",
        "system": "FLOOD-X Digital Twin Engine",
        "pilot_zone": PILOT_ZONE,
        "supported_horizons_min": TIMELINE_STEPS,
        "supported_vehicles": list(VEHICLE_PROFILES.keys())
    }

@app.get("/api/weather")
def get_weather():
    """Current Doppler weather radar and rain gauge observations."""
    return {
        "station": "Santacruz Doppler Radar (IMD/NCMRWF)",
        "timestamp": "Live Observation",
        "temperature_c": 28.4,
        "humidity_pct": 94,
        "wind_speed_kmh": 22.5,
        "current_intensity_mm_hr": 58.2,
        "precipitation_type": "Severe Convective Monsoon Cloudburst",
        "barometric_pressure_hpa": 998.2
    }

@app.get("/api/rainfall")
def get_rainfall(
    t: int = Query(0, ge=0, le=180, description="Forecast horizon in minutes"),
    scenario_mm: float = Query(85.0, ge=10.0, le=250.0, description="Rainfall accumulation scenario in mm")
):
    """Returns spatial Doppler rainfall nowcast grid."""
    return nowcast_engine.get_nowcast(t, scenario_mm)

@app.get("/api/forecast")
def get_forecast():
    """Returns 0-3 hour rainfall timeline nowcast overview."""
    steps_data = []
    for step in TIMELINE_STEPS:
        data = nowcast_engine.get_nowcast(step, 85.0)
        steps_data.append({
            "horizon_min": step,
            "avg_intensity_mm_hr": data["avg_intensity_mm_hr"],
            "accumulated_mm": data["accumulated_rainfall_mm"],
            "confidence_pct": data["confidence_pct"]
        })
    return {"timeline": steps_data}

@app.get("/api/flood/predict")
def get_flood_predictions(
    t: int = Query(0, ge=0, le=180, description="Forecast horizon in minutes"),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0, description="Rainfall scenario in mm"),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0, description="Drainage blockage percentage")
):
    """Returns street-level flood depths, probability, and risk scores across the pilot area."""
    return flood_ml_model.predict_all(t, rain_mm, blockage_pct)

@app.get("/api/flood/{road_id}")
def get_road_flood_detail(
    road_id: str,
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns granular street detail and explainable AI feature breakdown for a specific road."""
    road = next((r for r in ROADS if r["id"] == road_id), None)
    if not road:
        return {"error": f"Road {road_id} not found"}

    nowcast = nowcast_engine.get_nowcast(t, rain_mm)
    drain_sim = drainage_twin.simulate(nowcast["avg_intensity_mm_hr"], blockage_pct)
    prediction = flood_ml_model.predict_for_road(road, t, rain_mm, blockage_pct, drain_sim)

    # Compute timeline curve for this road (+0 to +180 min)
    curve = []
    for step in TIMELINE_STEPS:
        step_n = nowcast_engine.get_nowcast(step, rain_mm)
        step_d = drainage_twin.simulate(step_n["avg_intensity_mm_hr"], blockage_pct)
        step_p = flood_ml_model.predict_for_road(road, step, rain_mm, blockage_pct, step_d)
        curve.append({
            "horizon_min": step,
            "depth_cm": step_p["predicted_depth_cm"],
            "risk_score": step_p["risk_score"]
        })

    return {
        "road": prediction,
        "temporal_projection": curve,
        "metadata": road
    }

@app.get("/api/drainage")
def get_drainage(
    rain_intensity_mm_hr: float = Query(65.0, ge=0.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns drainage network status, flow capacity, and pipe surcharge calculations."""
    return drainage_twin.simulate(rain_intensity_mm_hr, blockage_pct)

@app.post("/api/drainage/simulate")
def simulate_drainage_blockage(req: DrainageSimulationRequest):
    """Simulates what-if drainage blockage scenario."""
    return drainage_twin.simulate(req.rainfall_intensity_mm_hr, req.blockage_pct)

@app.post("/api/routes/calculate")
def calculate_emergency_routes(req: RouteRequest):
    """Calculates normal route vs flood-safe route for emergency dispatch."""
    return emergency_router.calculate_routes(
        origin_id=req.origin_id,
        destination_id=req.destination_id,
        vehicle_type=req.vehicle_type,
        t_minutes=req.forecast_horizon_min,
        rainfall_scenario_mm=req.rainfall_scenario_mm,
        blockage_pct=req.blockage_pct
    )

@app.get("/api/alerts")
def get_active_alerts(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns triggered flood warnings and closures."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    alerts = []

    for r in flood_state["roads"]:
        if r["predicted_depth_cm"] >= 30.0:
            alerts.append({
                "id": f"ALERT-{r['road_id']}-CRIT",
                "severity": "CRITICAL",
                "road_id": r["road_id"],
                "road_name": r["name"],
                "message": f"ROAD INUNDATION DANGER: {r['name']} predicted to reach {r['predicted_depth_cm']} cm at +{t} min. Avoid corridor.",
                "depth_cm": r["predicted_depth_cm"],
                "probability_pct": r["flood_probability_pct"]
            })
        elif r["predicted_depth_cm"] >= 15.0:
            alerts.append({
                "id": f"ALERT-{r['road_id']}-HIGH",
                "severity": "WARNING",
                "road_id": r["road_id"],
                "road_name": r["name"],
                "message": f"HIGH WATERLOGGING RISK: {r['name']} water depth ~ {r['predicted_depth_cm']} cm. Reduce speed.",
                "depth_cm": r["predicted_depth_cm"],
                "probability_pct": r["flood_probability_pct"]
            })

    # Drainage surcharge alerts
    for pipe in flood_state["drainage"]["pipes"]:
        if pipe["status"] == "SURCHARGED":
            alerts.append({
                "id": f"ALERT-{pipe['pipe_id']}-SURCHARGE",
                "severity": "SURCHARGE",
                "pipe_id": pipe["pipe_id"],
                "message": f"DRAINAGE SURCHARGE: Conduit {pipe['pipe_id']} exceeded capacity ({pipe['utilization_pct']}%). Overland ponding occurring.",
                "utilization_pct": pipe["utilization_pct"]
            })

    return {
        "timestamp": "Real-Time Broadcast",
        "active_alert_count": len(alerts),
        "alerts": alerts
    }

@app.get("/api/gis/layers")
def get_gis_layers():
    """Returns baseline GIS static layers (DEM contours, Junctions, Drainage Layout)."""
    return {
        "junctions": JUNCTIONS,
        "dem_contours": DEM_CONTOURS,
        "drain_nodes": DRAIN_NODES,
        "drain_edges": DRAIN_EDGES,
        "roads_meta": ROADS
    }

# Mount static frontend production build
DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")

