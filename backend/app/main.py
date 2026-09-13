"""FastAPI Application for FLOOD-X matching SIH Implementation Blueprint PRD."""
import os
import time
import json
import csv
import math
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen
from pathlib import Path
from fastapi import FastAPI, Query, Body, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

from .config import (
    PILOT_ZONE,
    TIMELINE_STEPS,
    VEHICLE_PROFILES,
    BASELINE_WEIGHTS,
    EXTERNAL_WEATHER_URL,
    EXTERNAL_WEATHER_TIMEOUT_SECONDS,
)
from .data.pilot_dataset import JUNCTIONS, ROADS, DRAIN_NODES, DRAIN_EDGES, DEM_CONTOURS
from .engine.rainfall_nowcast import nowcast_engine
from .engine.drainage_digital_twin import drainage_twin
from .engine.flood_ml_model import flood_ml_model
from .engine.emergency_routing import emergency_router
from .engine.exposure_engine import exposure_engine
from .engine.upload_service import upload_service
from .engine.gpm_imerg import gpm_imerg_engine
from .engine.historical_flood_model import historical_flood_model
from .engine.area_analysis import analyze_area
from .data.bhuvan_hazard import as_geojson as bhuvan_hazard_geojson
from .database import get_upload

INDIA_RISK_CITIES = [
    ("Mumbai", 19.0760, 72.8777, 0.88),
    ("Kolkata", 22.5726, 88.3639, 0.86),
    ("Chennai", 13.0827, 80.2707, 0.82),
    ("Guwahati", 26.1445, 91.7362, 0.80),
    ("Bengaluru", 12.9716, 77.5946, 0.58),
    ("Hyderabad", 17.3850, 78.4867, 0.52),
    ("Delhi", 28.6139, 77.2090, 0.48),
    ("Kochi", 9.9312, 76.2673, 0.78),
    ("Bhubaneswar", 20.2961, 85.8245, 0.76),
    ("Patna", 25.5941, 85.1376, 0.72),
    ("Ahmedabad", 23.0225, 72.5714, 0.55),
    ("Pune", 18.5204, 73.8567, 0.62),
]

INDIA_DATASET_PATH = Path(__file__).resolve().parents[2] / "flood_risk_dataset_india.csv"
_india_dataset_cache: Optional[Dict[str, Any]] = None
ALERT_WORKFLOW: Dict[str, Dict[str, Any]] = {}

SHELTER_CENTERS = [
    {
        "id": "SHELTER-BHABHA",
        "name": "Bhabha Emergency Camp",
        "coords": [19.0640, 72.8805],
        "capacity": 560,
        "occupancy": 190,
        "type": "Temporary Shelter",
        "status": "READY",
    },
    {
        "id": "SHELTER-KURLA",
        "name": "Kurla Transit Relief Center",
        "coords": [19.0685, 72.8745],
        "capacity": 420,
        "occupancy": 260,
        "type": "Community Shelter",
        "status": "READY",
    },
    {
        "id": "SHELTER-BKC",
        "name": "BKC Safe Haven",
        "coords": [19.0770, 72.8680],
        "capacity": 700,
        "occupancy": 210,
        "type": "Elevated Shelter",
        "status": "READY",
    },
    {
        "id": "SHELTER-MANKHURD",
        "name": "Mankhurd Recovery Point",
        "coords": [19.0720, 72.8860],
        "capacity": 390,
        "occupancy": 310,
        "type": "Relief Point",
        "status": "PARTIAL",
    },
]

MAINTENANCE_ASSETS = [
    {
        "id": "ASSET-DRAIN-04",
        "name": "Kurla Drain Line 04",
        "type": "Drain",
        "location": "Maharashtra Nagar",
        "priority": "CRITICAL",
        "status": "BLOCKED",
        "risk_score": 89,
        "last_inspected_hours": 78,
        "message": "High silt accumulation reduces conveyance and raises local ponding risk.",
    },
    {
        "id": "ASSET-PUMP-02",
        "name": "BKC Pump Station 02",
        "type": "Pump Station",
        "location": "BKC West",
        "priority": "HIGH",
        "status": "CHECK",
        "risk_score": 74,
        "last_inspected_hours": 44,
        "message": "Hydraulic backup check recommended before peak rainfall window.",
    },
    {
        "id": "ASSET-CULVERT-07",
        "name": "Bail Bazar Culvert 07",
        "type": "Culvert",
        "location": "Bail Bazar",
        "priority": "HIGH",
        "status": "MONITOR",
        "risk_score": 68,
        "last_inspected_hours": 36,
        "message": "Flow is elevated; debris screens should be checked during the next cycle.",
    },
    {
        "id": "ASSET-ROAD-11",
        "name": "LBS Marg Road Surface Segment",
        "type": "Road",
        "location": "Kurla West",
        "priority": "MEDIUM",
        "status": "MONITOR",
        "risk_score": 58,
        "last_inspected_hours": 52,
        "message": "Surface water accumulation persists, requiring inspection after the next rain pulse.",
    },
]

INDIA_MAINLAND_MASK = [
    (8.0, 77.5), (8.8, 76.2), (10.5, 75.0), (13.0, 74.2),
    (16.0, 73.4), (18.5, 72.7), (20.5, 70.8), (23.0, 68.8),
    (26.0, 68.2), (29.0, 70.0), (32.0, 73.0), (35.0, 76.0),
    (37.0, 77.5), (35.0, 80.0), (32.0, 82.5), (30.0, 85.0),
    (28.0, 88.0), (27.0, 91.5), (25.0, 94.0), (23.0, 93.0),
    (21.5, 90.0), (20.0, 87.0), (18.0, 84.5), (16.0, 82.5),
    (14.0, 81.5), (12.0, 80.5), (10.0, 79.0),
]

def is_india_land_point(latitude: float, longitude: float) -> bool:
    """Coarse India land mask for screening random/demo observations before mapping."""
    inside = False
    previous_index = len(INDIA_MAINLAND_MASK) - 1
    for current_index, (current_lat, current_lon) in enumerate(INDIA_MAINLAND_MASK):
        previous_lat, previous_lon = INDIA_MAINLAND_MASK[previous_index]
        crosses_latitude = (current_lat > latitude) != (previous_lat > latitude)
        if crosses_latitude:
            intersection_lon = (previous_lon - current_lon) * (latitude - current_lat) / (previous_lat - current_lat) + current_lon
            if longitude < intersection_lon:
                inside = not inside
        previous_index = current_index
    return inside


def build_india_operational_layers(rain_mm: float = 85.0, blockage_pct: float = 0.0) -> Dict[str, Any]:
    """Build India-wide operational overlays from the national CSV dataset for flood zones, safe corridors, and emergency assets."""
    dataset = load_india_dataset()
    records = sorted(dataset["records"], key=lambda record: record["risk_score_norm"], reverse=True)
    if not records:
        return {"city": "India", "status": "DATASET_EMPTY", "flood_zones": [], "safe_corridors": [], "emergency_assets": []}

    selected = [record for record in records if record["flood_occurred"] or record["risk_level"] in ["High", "Critical"]]
    if len(selected) < 3:
        selected = records[:8]

    flood_zones = []
    for index, record in enumerate(selected[:8]):
        lat, lon = record["coords"]
        lat_span = 0.20 + (record["predicted_depth_cm"] / 100.0) * 0.18
        lon_span = 0.22 + (record["predicted_depth_cm"] / 100.0) * 0.20
        flood_zones.append({
            "id": f"ZONE-IND-{index + 1}",
            "name": f"Dataset flood cluster {index + 1}",
            "risk_level": record["risk_level"],
            "depth_cm": round(max(20.0, record["predicted_depth_cm"] * (1.0 + rain_mm / 300.0 + blockage_pct / 300.0)), 1),
            "coordinates": [
                [lat - lat_span, lon - lon_span],
                [lat + lat_span, lon - lon_span],
                [lat + lat_span, lon + lon_span],
                [lat - lat_span, lon + lon_span],
                [lat - lat_span, lon - lon_span],
            ],
        })

    safe_points = sorted(
        records,
        key=lambda record: record["risk_score_norm"] * (1.0 + rain_mm / 300.0 + blockage_pct / 300.0),
    )
    safe_points = [
        record for record in safe_points
        if record["predicted_depth_cm"] * (1.0 + rain_mm / 300.0 + blockage_pct / 300.0) < 25.0
    ][:10]
    safe_corridors = []
    for index in range(0, min(4, len(safe_points) - 1), 2):
        start = safe_points[index]
        end = safe_points[index + 1]
        midpoint = [
            (start["coords"][0] + end["coords"][0]) / 2,
            (start["coords"][1] + end["coords"][1]) / 2,
        ]
        safe_corridors.append({
            "id": f"SAFE-IND-{index + 1}",
            "name": f"National safe corridor {index + 1}",
            "risk_level": "Low" if safe_points[index]["risk_score_norm"] < 0.3 else "Medium",
            "coordinates": [start["coords"], midpoint, end["coords"]],
        })

    emergency_assets = []
    for index, record in enumerate(records[:6]):
        emergency_assets.append({
            "id": f"ASSET-IND-{index + 1}",
            "name": f"Regional emergency post {index + 1}",
            "type": "Emergency response",
            "coords": record["coords"],
        })

    return {
        "city": "India",
        "status": "DATASET_DETAIL",
        "pilot_area": "National dataset-backed flood layer",
        "routing_mode": "dynamic rainfall and blockage weighted corridors",
        "flood_zones": flood_zones,
        "safe_corridors": safe_corridors,
        "emergency_assets": emergency_assets,
    }


def load_india_dataset() -> Dict[str, Any]:
    """Load and summarize the attached dataset once for the national map layer."""
    global _india_dataset_cache
    if _india_dataset_cache is not None:
        return _india_dataset_cache

    records: List[Dict[str, Any]] = []
    flooded_count = 0
    filtered_count = 0
    if INDIA_DATASET_PATH.exists():
        with INDIA_DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as dataset_file:
            for row_number, row in enumerate(csv.DictReader(dataset_file)):
                try:
                    lat = float(row["Latitude"])
                    lon = float(row["Longitude"])
                    if not (6.0 <= lat <= 37.0 and 68.0 <= lon <= 98.0) or not is_india_land_point(lat, lon):
                        filtered_count += 1
                        continue
                    if row.get("Land Cover", "").strip().lower() == "water body":
                        filtered_count += 1
                        continue
                    flooded = int(float(row.get("Flood Occurred", 0))) == 1
                    risk = min(0.99, max(
                        0.05,
                        (float(row.get("Rainfall (mm)", 0)) / 300.0) * 0.32
                        + (float(row.get("River Discharge (m³/s)", 0)) / 5000.0) * 0.18
                        + (1.0 - min(1.0, float(row.get("Elevation (m)", 0)) / 9000.0)) * 0.12
                        + min(1.0, float(row.get("Historical Floods", 0))) * 0.18
                        + (0.20 if flooded else 0.0),
                    ))
                    if flooded:
                        flooded_count += 1
                    records.append({
                        "id": f"INDIA-DATA-{row_number + 1}",
                        "name": f"Dataset observation {row_number + 1}",
                        "coords": [lat, lon],
                        "risk_score_norm": round(risk, 2),
                        "risk_level": "Critical" if risk >= 0.8 else "High" if risk >= 0.6 else "Medium" if risk >= 0.3 else "Low",
                        "predicted_depth_cm": round(risk * 55, 1),
                        "rainfall_mm": round(float(row.get("Rainfall (mm)", 0)), 1),
                        "elevation_m": round(float(row.get("Elevation (m)", 0)), 1),
                        "river_discharge_m3s": round(float(row.get("River Discharge (m³/s)", 0)), 1),
                        "soil_type": row.get("Soil Type", "Unknown"),
                        "population_density": round(float(row.get("Population Density", 0)), 1),
                        "water_level_m": round(float(row.get("Water Level (m)", 0)), 1),
                        "land_cover": row.get("Land Cover", "Unknown"),
                        "flood_occurred": flooded,
                    })
                except (TypeError, ValueError, KeyError):
                    continue

    _india_dataset_cache = {
        "records": records,
        "total_records": len(records),
        "flooded_records": flooded_count,
        "filtered_ocean_records": filtered_count,
        "source": INDIA_DATASET_PATH.name,
    }
    return _india_dataset_cache


def build_osrm_coordinate_route(
    origin_coords: List[float],
    destination_coords: List[float],
    origin_name: str,
    destination_name: str,
    vehicle_type: str,
    rain_mm: float,
    blockage_pct: float,
) -> Optional[Dict[str, Any]]:
    """Fetch real-road alternatives and choose the safest route for current flood conditions."""
    dataset = load_india_dataset()["records"]
    profile = VEHICLE_PROFILES.get(vehicle_type, VEHICLE_PROFILES["AMBULANCE"])
    wading_limit = profile["wading_depth_limit_cm"]
    route_url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{origin_coords[1]},{origin_coords[0]};{destination_coords[1]},{destination_coords[0]}"
        "?alternatives=true&overview=full&geometries=geojson"
    )

    def distance_km(first: List[float], second: List[float]) -> float:
        return math.hypot((second[0] - first[0]) * 111.0, (second[1] - first[1]) * 111.0)

    try:
        request = UrlRequest(route_url, headers={"User-Agent": "FLOOD-X/1.0"})
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
        candidates = payload.get("routes", [])
        if not candidates or not dataset:
            return None
    except Exception:
        return None

    evaluated = []
    for candidate in candidates:
        raw_coordinates = candidate.get("geometry", {}).get("coordinates", [])
        coordinates = [[point[1], point[0]] for point in raw_coordinates]
        if len(coordinates) < 2:
            continue
        sampled = coordinates[::max(1, len(coordinates) // 24)]
        max_depth_cm = 0.0
        risk_total = 0.0
        flooded_segments = 0
        segments = []
        for index, point in enumerate(sampled):
            nearby = min(dataset, key=lambda record: distance_km(point, record["coords"]))
            dynamic_factor = 1.0 + rain_mm / 300.0 + blockage_pct / 300.0
            depth_cm = nearby["predicted_depth_cm"] * dynamic_factor
            max_depth_cm = max(max_depth_cm, depth_cm)
            risk_total += nearby["risk_score_norm"]
            if depth_cm >= 15.0:
                flooded_segments += 1
            if index > 0:
                segment_length = distance_km(sampled[index - 1], point) * 1000.0
                segments.append({
                    "road_id": f"OSRM-{index:02d}",
                    "name": "Live road-network segment",
                    "length_m": round(segment_length, 1),
                    "depth_cm": round(depth_cm, 1),
                    "risk_score": round(nearby["risk_score_norm"] * 100.0, 1),
                    "risk_score_norm": nearby["risk_score_norm"],
                    "is_hazard": depth_cm >= wading_limit,
                })
        average_risk = risk_total / max(len(sampled), 1)
        safe = max_depth_cm < wading_limit
        score = candidate.get("distance", 0.0) * (1.0 + average_risk * profile["risk_penalty_factor"])
        evaluated.append((not safe, score, candidate, coordinates, segments, max_depth_cm, flooded_segments))

    if not evaluated:
        return None
    _, _, candidate, coordinates, segments, max_depth_cm, flooded_segments = min(evaluated, key=lambda item: (item[0], item[1]))
    safe = max_depth_cm < wading_limit
    route = {
        "path_nodes": ["OSRM_ORIGIN", "OSRM_DESTINATION"],
        "total_distance_km": round(candidate.get("distance", 0.0) / 1000.0, 2),
        "estimated_duration_min": round(candidate.get("duration", 0.0) / 60.0, 1),
        "max_depth_cm": round(max_depth_cm, 1),
        "flooded_segments_count": flooded_segments,
        "risk_status": "LOW RISK / SAFE" if safe else "CRITICAL / IMPASSABLE",
        "color": "#10b981" if safe else "#ef4444",
        "segments": segments,
        "coordinates": coordinates,
    }
    return {
        "origin": {"id": "OSRM_ORIGIN", "name": origin_name, "coords": origin_coords},
        "destination": {"id": "OSRM_DESTINATION", "name": destination_name, "coords": destination_coords},
        "vehicle_profile": profile,
        "forecast_horizon_min": 60,
        "routing_source": "OSRM live road network + FLOOD-X dynamic flood scoring",
        "normal_route": route,
        "recommended_route": route if safe else None,
        "summary": {
            "flooded_segments_avoided": flooded_segments if safe else 0,
            "is_normal_route_trapped": not safe,
            "recommendation": "Live road route selected from current flood conditions." if safe else "No live road alternative is safe under the current flood conditions.",
        },
    }


def build_national_coordinate_route(
    origin_coords: List[float],
    destination_coords: List[float],
    origin_name: str,
    destination_name: str,
    vehicle_type: str,
    rain_mm: float,
    blockage_pct: float,
) -> Dict[str, Any]:
    """Evaluate a direct national corridor against nearby CSV flood observations."""
    live_route = build_osrm_coordinate_route(
        origin_coords,
        destination_coords,
        origin_name,
        destination_name,
        vehicle_type,
        rain_mm,
        blockage_pct,
    )
    if live_route:
        return live_route

    dataset = load_india_dataset()["records"]
    profile = VEHICLE_PROFILES.get(vehicle_type, VEHICLE_PROFILES["AMBULANCE"])
    wading_limit = profile["wading_depth_limit_cm"]
    sample_count = 12
    coordinates = []
    segments = []
    total_distance_km = 0.0
    max_depth_cm = 0.0
    flooded_segments = 0

    def distance_km(first: List[float], second: List[float]) -> float:
        return math.hypot((second[0] - first[0]) * 111.0, (second[1] - first[1]) * 111.0)

    for index in range(sample_count + 1):
        fraction = index / sample_count
        point = [
            origin_coords[0] + (destination_coords[0] - origin_coords[0]) * fraction,
            origin_coords[1] + (destination_coords[1] - origin_coords[1]) * fraction,
        ]
        coordinates.append(point)

        if index == 0:
            continue
        nearby = min(dataset, key=lambda record: distance_km(point, record["coords"])) if dataset else None
        depth_cm = 0.0
        risk_norm = 0.0
        if nearby:
            risk_norm = nearby["risk_score_norm"]
            depth_cm = nearby["predicted_depth_cm"] * (1.0 + rain_mm / 300.0 + blockage_pct / 300.0)
        segment_distance_km = distance_km(coordinates[index - 1], point)
        total_distance_km += segment_distance_km
        max_depth_cm = max(max_depth_cm, depth_cm)
        if depth_cm >= 15.0:
            flooded_segments += 1
        segments.append({
            "road_id": f"NATIONAL-{index:02d}",
            "name": "Dataset-evaluated national corridor",
            "length_m": round(segment_distance_km * 1000.0, 1),
            "depth_cm": round(depth_cm, 1),
            "risk_score": round(risk_norm * 100.0, 1),
            "risk_score_norm": round(risk_norm, 2),
            "is_hazard": depth_cm >= wading_limit,
        })

    duration_min = total_distance_km / max(profile["speed_kmh"], 1.0) * 60.0
    safe = max_depth_cm < wading_limit
    route = {
        "path_nodes": ["NATIONAL_ORIGIN", "NATIONAL_DESTINATION"],
        "total_distance_km": round(total_distance_km, 2),
        "estimated_duration_min": round(duration_min, 1),
        "max_depth_cm": round(max_depth_cm, 1),
        "flooded_segments_count": flooded_segments,
        "risk_status": "LOW RISK / SAFE" if safe else "CRITICAL / IMPASSABLE",
        "color": "#10b981" if safe else "#ef4444",
        "segments": segments,
        "coordinates": coordinates,
    }
    return {
        "origin": {"id": "NATIONAL_ORIGIN", "name": origin_name, "coords": origin_coords},
        "destination": {"id": "NATIONAL_DESTINATION", "name": destination_name, "coords": destination_coords},
        "vehicle_profile": profile,
        "forecast_horizon_min": 60,
        "normal_route": route,
        "recommended_route": route if safe else None,
        "summary": {
            "flooded_segments_avoided": flooded_segments if safe else 0,
            "is_normal_route_trapped": not safe,
            "recommendation": "National dataset corridor is clear for the selected vehicle." if safe else "No safe corridor found between these coordinates under the current flood conditions.",
        },
    }

app = FastAPI(
    title="FLOOD-X: AI + Physics Based Urban Flood Intelligence",
    version="2.0.0",
    description="SIH Implementation Blueprint - Ministry of Earth Sciences (MoES) / NCMRWF"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Request Models ---
class SimulationRequest(BaseModel):
    rainfall_scenario_mm: float = Field(default=85.0, ge=10.0, le=250.0, description="Storm accumulation in mm")
    blockage_percent: float = Field(default=0.0, ge=0.0, le=95.0, description="Drainage blockage percentage")
    forecast_horizon_min: int = Field(default=60, ge=0, le=180, description="Horizon in minutes")

class AlertWorkflowRequest(BaseModel):
    alert_id: str
    action: str = Field(description="ACKNOWLEDGE or ESCALATE")

class InterventionRequest(SimulationRequest):
    intervention_type: str = Field(default="CLEAR_DRAIN", description="CLEAR_DRAIN, ACTIVATE_PUMP, or TRAFFIC_CONTROL")

class AreaAnalysisRequest(SimulationRequest):
    polygon: List[List[float]] = Field(description="Closed or open ring of [lat, lon] vertices")

class RouteRequest(BaseModel):
    origin_id: Optional[str] = "J_ASIAN_HEART"
    destination_id: Optional[str] = "J_BAIL_BAZAR"
    origin_name: Optional[str] = "Asian Heart Hospital (BKC)"
    destination_name: Optional[str] = "Bail Bazar Emergency Zone"
    origin_coords: Optional[List[float]] = None
    destination_coords: Optional[List[float]] = None
    vehicle_type: str = "AMBULANCE"
    forecast_horizon_min: int = 60
    rainfall_scenario_mm: float = 85.0
    blockage_pct: float = 0.0

class CitizenReportRequest(BaseModel):
    location: List[float] = [19.0720, 72.8760]
    location_name: str = "Observed Location"
    water_depth: str = "knee"  # "none" | "ankle" | "knee" | "waist" | numeric string
    road_status: str = "partially blocked"  # "open" | "partially blocked" | "closed"
    drain_status: str = "overflowing"  # "normal" | "overflowing" | "blocked" | "unknown"
    description: Optional[str] = "Citizen flood report"
    photo_url: Optional[str] = ""
    reporter_type: Optional[str] = "Citizen"

class CustomUploadPayload(BaseModel):
    dataset_name: str = "Local Drainage Survey"
    data_type: str = "drainage"  # "drainage" | "roads" | "rainfall" | "flood_reports"
    file_content: str
    source: str = "Municipal field survey"
    user_location: Optional[Dict[str, Any]] = None

# =========================================================================
# SECTION 11 & 21: STANDARDIZED BLUEPRINT REST APIS
# =========================================================================

@app.get("/api/health")
def get_health():
    """Service health and data-source status (Section 21)."""
    return {
        "status": "HEALTHY",
        "service": "FLOOD-X Decision Engine",
        "version": "2.0.0",
        "uptime": "Operational",
        "data_sources": {
            "rainfall": {"source": "IMD Doppler Radar / AWS", "status": "CONNECTED", "latency_ms": 42},
            "gpm_imerg": {"source": "NASA GPM IMERG-compatible historical accumulations", "status": "ONLINE"},
            "bhuvan": {"source": "ISRO Bhuvan flood-hazard context", "status": "LOADED", "zones": 7},
            "ml_model": historical_flood_model.status(),
            "terrain": {"source": "Copernicus DEM GLO-30", "status": "LOADED", "resolution": "30m"},
            "drainage": {"source": "Municipal Digital Twin Graph", "status": "ONLINE", "nodes": len(DRAIN_NODES)},
            "roads": {"source": "OpenStreetMap + Overpass API", "status": "LOADED", "edges": len(ROADS)},
            "population": {"source": "WorldPop 100m Raster", "status": "ONLINE"}
        }
    }

@app.get("/api/rainfall/current")
def get_rainfall_current():
    """Returns external weather data with a local demo fallback."""
    params = urlencode({
        "latitude": PILOT_ZONE["center"][0],
        "longitude": PILOT_ZONE["center"][1],
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "timezone": "Asia/Kolkata",
    })
    try:
        request = UrlRequest(f"{EXTERNAL_WEATHER_URL}?{params}", headers={"User-Agent": "FLOOD-X/1.0"})
        with urlopen(request, timeout=EXTERNAL_WEATHER_TIMEOUT_SECONDS) as response:
            current = json.loads(response.read().decode("utf-8")).get("current", {})
        precipitation = max(0.1, float(current.get("precipitation") or 0.0))
        return {
            "source": "Open-Meteo external weather API",
            "status": "LIVE",
            "station": "Santacruz Doppler Weather Radar / Open-Meteo",
            "timestamp": current.get("time"),
            "rainfall_mm": precipitation,
            "intensity_mm_hr": precipitation,
            "temperature_c": current.get("temperature_2m"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "monsoon_condition": "External observation",
        }
    except Exception:
        return {
            "source": "FLOOD-X pilot simulation fallback",
            "status": "FALLBACK",
            "station": "Santacruz Doppler Weather Radar (simulation fallback)",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "rainfall_mm": 18.5,
            "intensity_mm_hr": 58.2,
            "temperature_c": 28.4,
            "humidity_pct": 94,
            "wind_speed_kmh": 22.5,
            "monsoon_condition": "Simulated severe convective surge",
        }

@app.get("/api/external/weather")
def get_external_weather():
    """Explicit external-data status for the dashboard and integrations."""
    return get_rainfall_current()

@app.get("/api/india/risk-overview")
def get_india_risk_overview(
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns a nationwide demo overview until authoritative national layers are connected."""
    rainfall_factor = min(0.18, max(0.0, (rain_mm - 40.0) / 1200.0))
    blockage_factor = blockage_pct / 1000.0
    points = []
    for name, lat, lon, baseline_risk in INDIA_RISK_CITIES:
        risk = round(min(0.99, baseline_risk + rainfall_factor + blockage_factor), 2)
        level = "Critical" if risk >= 0.8 else "High" if risk >= 0.6 else "Medium"
        points.append({
            "id": f"INDIA-{name.upper().replace(' ', '-')}",
            "name": name,
            "coords": [lat, lon],
            "risk_score_norm": risk,
            "risk_level": level,
            "predicted_depth_cm": round(risk * 55, 1),
            "source": "FLOOD-X national overview demo layer",
        })
    dataset = load_india_dataset()
    dataset_points = dataset["records"]
    # Keep the national map responsive while retaining broad geographic coverage.
    plotted_records = dataset_points[::max(1, len(dataset_points) // 900)]
    return {
        "scope": "India",
        "status": "DATASET_BACKED_OVERVIEW",
        "points": points + plotted_records[:900],
        "city_points": points,
        "dataset": {
            "source": dataset["source"],
            "total_records": dataset["total_records"],
            "flooded_records": dataset["flooded_records"],
            "plotted_records": min(900, len(plotted_records)),
        },
    }

@app.get("/api/india/dataset")
def get_india_dataset(
    limit: int = Query(250, ge=1, le=1000),
    flooded_only: bool = Query(False),
):
    """Returns validated sample observations from the attached India dataset."""
    dataset = load_india_dataset()
    records = dataset["records"]
    if flooded_only:
        records = [record for record in records if record["flood_occurred"]]
    return {
        "scope": "India",
        "source": dataset["source"],
        "total_records": dataset["total_records"],
        "flooded_records": dataset["flooded_records"],
        "records": records[:limit],
    }

@app.get("/api/india/operational-layers")
def get_india_operational_layers(
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns dataset-backed flood zones, safe corridors, and emergency assets across India."""
    return build_india_operational_layers(rain_mm=rain_mm, blockage_pct=blockage_pct)


@app.get("/api/place/detail")
def get_place_detail(
    city: str = Query("Mumbai"),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns map-ready operational layers for a selected city, defaulting to a dataset-backed India-wide layer when the request is not a pilot-only zone."""
    if city.strip().lower() == "mumbai":
        severity = min(1.0, 0.45 + rain_mm / 300.0 + blockage_pct / 180.0)
        return {
            "city": "Mumbai",
            "status": "PILOT_DETAIL",
            "pilot_area": "Kurla/BKC Basin",
            "flood_zones": [
                {"id": "ZONE-MITHI", "name": "Mithi River lowland", "risk_level": "Critical", "depth_cm": round(42 * severity, 1), "coordinates": [[19.0675, 72.8680], [19.0715, 72.8700], [19.0725, 72.8750], [19.0680, 72.8770], [19.0650, 72.8730]]},
                {"id": "ZONE-KURLA", "name": "Kurla West drainage basin", "risk_level": "High", "depth_cm": round(34 * severity, 1), "coordinates": [[19.0660, 72.8750], [19.0735, 72.8755], [19.0760, 72.8810], [19.0700, 72.8840], [19.0660, 72.8800]]},
                {"id": "ZONE-BAIL", "name": "Bail Bazar low point", "risk_level": "High", "depth_cm": round(29 * severity, 1), "coordinates": [[19.0775, 72.8810], [19.0825, 72.8815], [19.0830, 72.8870], [19.0780, 72.8880]]},
            ],
            "safe_corridors": [
                {"id": "SAFE-SCLR", "name": "SCLR elevated emergency corridor", "risk_level": "Low", "coordinates": [[19.0775, 72.8730], [19.0790, 72.8785], [19.0810, 72.8845]]},
                {"id": "SAFE-BKC", "name": "BKC elevated approach", "risk_level": "Low", "coordinates": [[19.0645, 72.8560], [19.0665, 72.8655], [19.0700, 72.8695]]},
            ],
            "emergency_assets": [
                {"id": "ASSET-HOSPITAL", "name": "Bhabha Municipal Hospital", "type": "Hospital", "coords": [19.0640, 72.8805]},
                {"id": "ASSET-FIRE", "name": "Kurla Fire & Rescue Station", "type": "Fire Station", "coords": [19.0630, 72.8770]},
                {"id": "ASSET-SHELTER", "name": "Bhabha Emergency Camp", "type": "Shelter", "coords": [19.0640, 72.8805]},
            ],
        }

    return build_india_operational_layers(rain_mm=rain_mm, blockage_pct=blockage_pct)

@app.get("/api/rainfall/gpm-imerg")
def get_gpm_imerg(
    latitude: float = Query(None),
    longitude: float = Query(None),
):
    """Historical GPM IMERG-style accumulations (section 19.3)."""
    lat = latitude if latitude is not None else PILOT_ZONE["center"][0]
    lon = longitude if longitude is not None else PILOT_ZONE["center"][1]
    payload = gpm_imerg_engine.get_accumulations(lat, lon)
    dataset = load_india_dataset()["records"]

    def distance_km(first: List[float], second: List[float]) -> float:
        return math.hypot((first[0] - second[0]) * 111.0, (first[1] - second[1]) * 111.0)

    nearby = []
    for record in dataset:
        gap = distance_km([lat, lon], record["coords"])
        if gap <= 80.0:
            nearby.append({**record, "distance_km": round(gap, 2)})
    nearby.sort(key=lambda item: item["distance_km"])
    payload["joined_flood_observations"] = nearby[:8]
    payload["join_method"] = "spatial match within 80 km against historical flood CSV"
    return payload


@app.get("/api/gis/bhuvan-hazard")
def get_bhuvan_hazard():
    """ISRO Bhuvan flood-hazard context layer (section 19.6)."""
    return bhuvan_hazard_geojson()


@app.get("/api/ml/status")
def get_ml_status():
    """Trained Random Forest status versus the section-8 baseline."""
    return historical_flood_model.status()


@app.post("/api/analysis/area")
def analyze_drawn_area(req: AreaAnalysisRequest):
    """Runs FLOOD-X for a user-drawn area of interest (section 27.1)."""
    return analyze_area(
        polygon=req.polygon,
        t_minutes=req.forecast_horizon_min,
        rain_mm=req.rainfall_scenario_mm,
        blockage_pct=req.blockage_percent,
    )


@app.get("/api/brief/location")
def get_location_brief(
    latitude: float = Query(..., ge=6.0, le=37.0),
    longitude: float = Query(..., ge=68.0, le=98.0),
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Builds a concise flood brief for a user-selected coordinate."""
    def distance_km(first: List[float], second: List[float]) -> float:
        return math.hypot((first[0] - second[0]) * 111.0, (first[1] - second[1]) * 111.0)

    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    nearest = min(
        flood_state["roads"],
        key=lambda road: distance_km([latitude, longitude], road["coords"][len(road["coords"]) // 2]),
    )
    hazard = bhuvan_hazard_geojson()
    hazard_context = {"hazard_class": "Outside mapped hazard context", "zone_name": "User-selected location"}
    point_hazard = __import__("backend.app.data.bhuvan_hazard", fromlist=["classify_point"]).classify_point(latitude, longitude)
    hazard_context = {"hazard_class": point_hazard["hazard_class"], "zone_name": point_hazard["zone_name"]}
    rainfall = gpm_imerg_engine.get_accumulations(latitude, longitude)
    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "nearest_road": {
            "road_id": nearest["road_id"],
            "name": nearest["name"],
            "distance_km": round(distance_km([latitude, longitude], nearest["coords"][len(nearest["coords"]) // 2]), 2),
        },
        "risk_level": nearest["risk_level"],
        "risk_score": nearest["risk_score"],
        "predicted_depth_cm": nearest["predicted_depth_cm"],
        "depth_range_cm": [nearest["depth_lower_cm"], nearest["depth_upper_cm"]],
        "flood_probability_pct": nearest["flood_probability_pct"],
        "confidence_pct": nearest["confidence_pct"],
        "time_to_flood_min": nearest["time_to_flood_min"],
        "hazard": hazard_context,
        "rainfall": {"rain_3h": rainfall["rain_3h"], "rain_24h": rainfall["rain_24h"], "status": rainfall["status"]},
        "recommended_action": "Use FLOOD-X safe routing and dispatch field response." if nearest["is_closed"] else "Monitor this location and verify drainage conditions.",
        "source": "FLOOD-X nearest monitored road + hazard and rainfall context",
    }
def get_rainfall_forecast(
    t: int = Query(60, ge=0, le=180),
    scenario_mm: float = Query(85.0, ge=10.0, le=250.0)
):
    """Returns short-horizon 0-3 hour rainfall nowcast grid (Section 21)."""
    return nowcast_engine.get_nowcast(t, scenario_mm)

@app.get("/api/flood/risk-map")
def get_flood_risk_map(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns current/forecast flood-risk grid formatted as GeoJSON (Section 21)."""
    res = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    
    # Format as standard GeoJSON FeatureCollection
    features = []
    for r in res["roads"]:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[c[1], c[0]] for c in r["coords"]]  # GeoJSON is [lon, lat]
            },
            "properties": {
                "id": r["road_id"],
                "name": r["name"],
                "risk_score_norm": r["risk_score_norm"],
                "risk_score": r["risk_score"],
                "risk_level": r["risk_level"],
                "predicted_depth_cm": r["predicted_depth_cm"],
                "flood_probability_pct": r["flood_probability_pct"],
                "time_to_flood_min": r["time_to_flood_min"],
                "color": r["color"],
                "is_closed": r["is_closed"]
            }
        })

    return {
        "type": "FeatureCollection",
        "forecast_horizon_min": t,
        "rainfall_scenario_mm": rain_mm,
        "blockage_pct": blockage_pct,
        "kpis": res["kpis"],
        "nowcast": res["nowcast"],
        "drainage": res["drainage"],
        "roads": res["roads"],
        "timeline_projections": res["timeline_projections"],
        "features": features
    }

@app.get("/api/flood/prediction/{location_id}")
def get_flood_prediction_for_location(
    location_id: str,
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns risk, depth, and time-to-flood for a selected location (Section 21)."""
    road = next((r for r in ROADS if r["id"] == location_id or r["name"].lower() == location_id.lower()), None)
    if not road:
        # Fallback to first road if specific ID not matched
        road = ROADS[0]

    nowcast = nowcast_engine.get_nowcast(t, rain_mm)
    drain_sim = drainage_twin.simulate(nowcast["avg_intensity_mm_hr"], blockage_pct)
    prediction = flood_ml_model.predict_for_road(road, t, rain_mm, blockage_pct, drain_sim)

    # Timeline projection curve
    timeline = []
    for step in TIMELINE_STEPS:
        sn = nowcast_engine.get_nowcast(step, rain_mm)
        sd = drainage_twin.simulate(sn["avg_intensity_mm_hr"], blockage_pct)
        sp = flood_ml_model.predict_for_road(road, step, rain_mm, blockage_pct, sd)
        timeline.append({
            "horizon_min": step,
            "depth_cm": sp["predicted_depth_cm"],
            "risk_score_norm": sp["risk_score_norm"],
            "risk_score": sp["risk_score"],
            "risk_level": sp["risk_level"]
        })

    return {
        "location_id": road["id"],
        "name": road["name"],
        "prediction": prediction,
        "timeline": timeline
    }


@app.get("/api/flood/critical-locations")
def get_critical_locations(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
    limit: int = Query(5, ge=1, le=10),
):
    """Ranks monitored locations requiring the earliest flood response."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    ranked = sorted(
        flood_state["roads"],
        key=lambda road: (
            road["risk_score_norm"],
            road["predicted_depth_cm"],
            -(road["time_to_flood_min"] or 999),
        ),
        reverse=True,
    )
    locations = []
    for rank, road in enumerate(ranked[:limit], start=1):
        locations.append({
            "rank": rank,
            "road_id": road["road_id"],
            "name": road["name"],
            "coords": road["coords"][len(road["coords"]) // 2],
            "risk_level": road["risk_level"],
            "risk_score": road["risk_score"],
            "predicted_depth_cm": road["predicted_depth_cm"],
            "depth_lower_cm": road["depth_lower_cm"],
            "depth_upper_cm": road["depth_upper_cm"],
            "time_to_flood_min": road["time_to_flood_min"],
            "flood_probability_pct": road["flood_probability_pct"],
            "confidence_pct": road["confidence_pct"],
            "is_closed": road["is_closed"],
            "top_factor": road["top_factor"],
            "plain_reason": road["plain_reason"],
        })
    return {
        "forecast_horizon_min": t,
        "scenario": {"rainfall_mm": rain_mm, "blockage_pct": blockage_pct},
        "locations": locations,
    }

@app.get("/api/flood/explain/{location_id}")
def get_flood_explanation(
    location_id: str,
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns top contributing factors and plain-language explanation (Section 6 & 21)."""
    road = next((r for r in ROADS if r["id"] == location_id), ROADS[0])
    nowcast = nowcast_engine.get_nowcast(t, rain_mm)
    drain_sim = drainage_twin.simulate(nowcast["avg_intensity_mm_hr"], blockage_pct)
    pred = flood_ml_model.predict_for_road(road, t, rain_mm, blockage_pct, drain_sim)

    return {
        "location_id": road["id"],
        "name": road["name"],
        "risk_level": pred["risk_level"],
        "risk_score_norm": pred["risk_score_norm"],
        "predicted_depth_cm": pred["predicted_depth_cm"],
        "weights_used": BASELINE_WEIGHTS,
        "contributing_factors": pred["explainability"],
        "top_factor": pred["top_factor"],
        "plain_language_reason": pred["plain_reason"]
    }

@app.post("/api/simulation")
def run_simulation(req: SimulationRequest):
    """Runs rainfall and drainage what-if simulation (Section 7 & 21)."""
    return flood_ml_model.predict_all(
        t_minutes=req.forecast_horizon_min,
        rainfall_scenario_mm=req.rainfall_scenario_mm,
        blockage_pct=req.blockage_percent
    )


@app.post("/api/simulation/intervention")
def simulate_intervention(req: InterventionRequest):
    """Compares the current scenario with a transparent response intervention."""
    baseline = flood_ml_model.predict_all(req.forecast_horizon_min, req.rainfall_scenario_mm, req.blockage_percent)
    baseline_exposure = get_population_exposure(req.forecast_horizon_min, req.rainfall_scenario_mm, req.blockage_percent)
    intervention_effects = {
        "CLEAR_DRAIN": {"blockage_delta": -25.0, "label": "Clear priority drain"},
        "ACTIVATE_PUMP": {"blockage_delta": -18.0, "label": "Activate portable pump"},
        "TRAFFIC_CONTROL": {"blockage_delta": 0.0, "label": "Close and divert critical road"},
    }
    effect = intervention_effects.get(req.intervention_type.upper())
    if not effect:
        raise HTTPException(status_code=400, detail="Unknown intervention_type")

    adjusted_blockage = max(0.0, req.blockage_percent + effect["blockage_delta"])
    after = flood_ml_model.predict_all(req.forecast_horizon_min, req.rainfall_scenario_mm, adjusted_blockage)
    after_exposure = get_population_exposure(req.forecast_horizon_min, req.rainfall_scenario_mm, adjusted_blockage)
    return {
        "intervention_type": req.intervention_type.upper(),
        "intervention_label": effect["label"],
        "baseline": {
            "blockage_pct": req.blockage_percent,
            "retained_floodwater_m3": baseline["drainage"]["retained_floodwater_m3"],
            "max_water_level_cm": baseline["drainage"]["max_estimated_water_level_cm"],
            "drainage_effectiveness_pct": baseline["drainage"]["drainage_effectiveness_pct"],
            "exposed_population": baseline_exposure["total_exposed_population"],
            "critical_roads": baseline["kpis"]["critical_roads"],
        },
        "after": {
            "blockage_pct": adjusted_blockage,
            "retained_floodwater_m3": after["drainage"]["retained_floodwater_m3"],
            "max_water_level_cm": after["drainage"]["max_estimated_water_level_cm"],
            "drainage_effectiveness_pct": after["drainage"]["drainage_effectiveness_pct"],
            "exposed_population": after_exposure["total_exposed_population"],
            "critical_roads": after["kpis"]["critical_roads"],
        },
        "impact": {
            "retained_water_reduction_m3": round(max(0.0, baseline["drainage"]["retained_floodwater_m3"] - after["drainage"]["retained_floodwater_m3"]), 1),
            "water_level_reduction_cm": round(max(0.0, baseline["drainage"]["max_estimated_water_level_cm"] - after["drainage"]["max_estimated_water_level_cm"]), 1),
            "population_protected": max(0, baseline_exposure["total_exposed_population"] - after_exposure["total_exposed_population"]),
            "critical_roads_avoided": max(0, baseline["kpis"]["critical_roads"] - after["kpis"]["critical_roads"]),
        },
    }

@app.post("/api/route")
def calculate_flood_aware_route(req: RouteRequest):
    """Generates flood-aware emergency route comparing normal vs safe route (Section 8, 10, 21)."""
    origin_id = req.origin_id
    destination_id = req.destination_id

    if req.origin_coords and len(req.origin_coords) == 2:
        origin_id = emergency_router.find_nearest_node(
            req.origin_coords[0], req.origin_coords[1], prefer_highway=True, max_distance_km=12.0
        )
    if req.destination_coords and len(req.destination_coords) == 2:
        destination_id = emergency_router.find_nearest_node(
            req.destination_coords[0], req.destination_coords[1], prefer_highway=True, max_distance_km=12.0
        )

    if (origin_id is None or destination_id is None) and req.origin_coords and req.destination_coords:
        if all(len(coords) == 2 and 6.0 <= coords[0] <= 37.0 and 68.0 <= coords[1] <= 98.0 for coords in [req.origin_coords, req.destination_coords]):
            return build_national_coordinate_route(
                req.origin_coords,
                req.destination_coords,
                req.origin_name or "Selected origin",
                req.destination_name or "Selected destination",
                req.vehicle_type,
                req.rainfall_scenario_mm,
                req.blockage_pct,
            )

    if origin_id is None or destination_id is None:
        raise HTTPException(
            status_code=422,
            detail="This location is outside the active FLOOD-X road network coverage. Choose a point within the Mumbai pilot map or use a supported road landmark.",
        )

    route_result = emergency_router.calculate_routes(
        origin_id=origin_id,
        destination_id=destination_id,
        vehicle_type=req.vehicle_type,
        t_minutes=req.forecast_horizon_min,
        rainfall_scenario_mm=req.rainfall_scenario_mm,
        blockage_pct=req.blockage_pct
    )

    if req.origin_name:
        route_result["origin"]["name"] = req.origin_name
        route_result["origin"]["coords"] = req.origin_coords or route_result["origin"]["coords"]
    if req.destination_name:
        route_result["destination"]["name"] = req.destination_name
        route_result["destination"]["coords"] = req.destination_coords or route_result["destination"]["coords"]

    return route_result

@app.get("/api/exposure")
def get_population_exposure(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns WorldPop population exposure estimate (Section 19.7 & 21)."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    return exposure_engine.calculate_exposure(flood_state["roads"])


def get_evacuation_summary(
    t: int = 60,
    rain_mm: float = 85.0,
    blockage_pct: float = 0.0,
):
    """Builds evacuation planning guidance and shelter allocation for flood-affected communities."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    exposure = exposure_engine.calculate_exposure(flood_state["roads"])

    risk_multiplier = 1.0 + (rain_mm / 200.0) + (blockage_pct / 150.0)
    center = PILOT_ZONE["center"]

    shelter_records = []
    for shelter in SHELTER_CENTERS:
        shelter_lat, shelter_lon = shelter["coords"]
        distance_km = math.hypot((shelter_lat - center[0]) * 111.0, (shelter_lon - center[1]) * 111.0)
        available_capacity = max(0, shelter["capacity"] - shelter["occupancy"])
        risk_adjustment = max(0.0, min(1.0, (risk_multiplier - 1.0) * 0.85))
        predicted_demand = max(1200, int(exposure["total_exposed_population"] * 0.04 * (1.0 + risk_adjustment)))
        suitability = "HIGH" if available_capacity >= predicted_demand * 0.7 else ("MEDIUM" if available_capacity > 0 else "LOW")
        shelter_records.append({
            "id": shelter["id"],
            "name": shelter["name"],
            "type": shelter["type"],
            "coords": shelter["coords"],
            "capacity": shelter["capacity"],
            "occupancy": shelter["occupancy"],
            "available_space": available_capacity,
            "distance_km": round(distance_km, 2),
            "status": shelter["status"],
            "suitability": suitability,
            "estimated_demand": predicted_demand,
            "message": f"{available_capacity} spaces available for evacuees before peak inflow",
        })

    recommended_shelter = min(
        shelter_records,
        key=lambda item: (0 if item["suitability"] == "HIGH" else 1, item["distance_km"], -item["available_space"]),
    )

    return {
        "evacuation_priority": exposure["evacuation_priority"],
        "total_exposed_population": exposure["total_exposed_population"],
        "exposure_percentage": exposure["exposure_percentage"],
        "shelters": shelter_records,
        "recommended_shelter": recommended_shelter,
        "summary": f"{exposure['evacuation_priority']} priority evacuation response. Recommend {recommended_shelter['name']} for nearest high-capacity sheltering.",
    }


@app.get("/api/evacuation/summary")
def get_evacuation_summary_api(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns shelter availability and evacuation prioritization for flood response planning."""
    return get_evacuation_summary(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)


def get_operations_summary(
    t: int = 60,
    rain_mm: float = 85.0,
    blockage_pct: float = 0.0,
):
    """Generates city operations and maintenance priorities for field teams and civic response."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    active_alerts = get_active_alerts(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)
    critical_assets = []
    for asset in MAINTENANCE_ASSETS:
        adjusted_risk = asset["risk_score"] + min(25, int((rain_mm / 10.0) + (blockage_pct * 0.6)))
        if asset["priority"] in ["CRITICAL", "HIGH"] or adjusted_risk >= 70:
            critical_assets.append({
                **asset,
                "risk_score": min(99, adjusted_risk),
            })

    service_health_pct = max(30, 100 - sum(item["risk_score"] for item in critical_assets) // max(1, len(critical_assets)))
    return {
        "field_status": "ACTIVE RESPONSE",
        "operations_window_min": t,
        "total_assets": len(MAINTENANCE_ASSETS),
        "critical_assets": len(critical_assets),
        "open_work_orders": max(2, len(critical_assets) + 1),
        "service_health_pct": service_health_pct,
        "active_alerts": active_alerts["active_alert_count"],
        "assets": critical_assets,
        "priority_summary": {
            "critical": sum(1 for item in critical_assets if item["priority"] == "CRITICAL"),
            "high": sum(1 for item in critical_assets if item["priority"] == "HIGH"),
            "monitor": sum(1 for item in critical_assets if item["priority"] == "MEDIUM"),
        },
        "recommendation": "Dispatch quick-response crews to blocked drainage and pump checks before the next rainfall pulse.",
    }


@app.get("/api/operations/maintenance")
def get_operations_summary_api(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns field operations and maintenance priorities for civic maintenance teams."""
    return get_operations_summary(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)


def get_response_plan(
    t: int = 60,
    rain_mm: float = 85.0,
    blockage_pct: float = 0.0,
) -> Dict[str, Any]:
    """Ranks explainable response actions from the current flood and exposure state."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    exposure = get_population_exposure(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)
    operations = get_operations_summary(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)
    roads = sorted(flood_state["roads"], key=lambda road: (road["risk_score_norm"], road["predicted_depth_cm"]), reverse=True)
    actions: List[Dict[str, Any]] = []

    for asset in operations["assets"][:2]:
        asset_factor = asset["risk_score"] / 100.0
        depth_reduction = round(8.0 + (asset_factor * 14.0) + (blockage_pct * 0.08), 1)
        protected = int(round(exposure["total_exposed_population"] * (0.08 + asset_factor * 0.12)))
        actions.append({
            "id": f"ACTION-{asset['id']}",
            "type": "FIELD_INTERVENTION",
            "urgency": "IMMEDIATE" if asset["priority"] == "CRITICAL" else "NEXT 30 MIN",
            "title": f"Dispatch crew to {asset['name']}",
            "target": asset["location"],
            "reason": asset["message"],
            "expected_depth_reduction_cm": depth_reduction,
            "population_protected": protected,
            "evidence": f"Asset risk {asset['risk_score']}/100 · {flood_state['drainage']['drainage_effectiveness_pct']}% drainage effectiveness",
            "priority_score": round(asset["risk_score"] + protected / 1000.0, 1),
        })

    if roads:
        road = roads[0]
        protected = int(round(exposure["total_exposed_population"] * min(0.3, 0.08 + road["risk_score_norm"] * 0.2)))
        actions.append({
            "id": f"ACTION-CLOSE-{road['road_id']}",
            "type": "TRAFFIC_CONTROL",
            "urgency": "BEFORE FLOOD PEAK",
            "title": f"Prepare closure and diversion for {road['name']}",
            "target": road["name"],
            "reason": f"Forecast depth reaches {road['predicted_depth_cm']} cm with {road['flood_probability_pct']}% flood probability.",
            "expected_depth_reduction_cm": 0.0,
            "population_protected": protected,
            "evidence": f"Risk {road['risk_score']}/100 · flood onset {road['time_to_flood_min'] or 'under 45'} min",
            "priority_score": round(road["risk_score"] + protected / 1000.0, 1),
        })

    if flood_state["drainage"]["water_level_rising"]:
        actions.append({
            "id": "ACTION-PUMP-DEPLOYMENT",
            "type": "HYDRAULIC_RESPONSE",
            "urgency": "IMMEDIATE",
            "title": "Deploy portable pump to rising drainage areas",
            "target": ", ".join(flood_state["drainage"]["water_level_rising_nodes"][:2]),
            "reason": "Modeled retained water is increasing faster than the connected network can convey runoff.",
            "expected_depth_reduction_cm": round(min(25.0, flood_state["drainage"]["max_estimated_water_level_cm"] * 0.45), 1),
            "population_protected": int(round(exposure["total_exposed_population"] * 0.18)),
            "evidence": f"{flood_state['drainage']['retained_floodwater_m3']} m³ retained · max level {flood_state['drainage']['max_estimated_water_level_cm']} cm",
            "priority_score": 94.0,
        })

    actions.sort(key=lambda action: action["priority_score"], reverse=True)
    return {
        "forecast_horizon_min": t,
        "scenario": {"rainfall_mm": rain_mm, "blockage_pct": blockage_pct},
        "decision_summary": f"{len(actions)} actions ranked for {exposure['total_exposed_population']} exposed people and {flood_state['kpis']['critical_roads']} critical roads.",
        "total_population_protected": sum(action["population_protected"] for action in actions),
        "actions": actions[:5],
    }


@app.get("/api/operations/response-plan")
def get_response_plan_api(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns ranked, explainable actions for municipal flood response teams."""
    return get_response_plan(t=t, rain_mm=rain_mm, blockage_pct=blockage_pct)

# =========================================================================
# SECTION 27: USER LOCATION, CITIZEN FLOOD REPORT & UPLOAD APIS
# =========================================================================

@app.get("/api/location/current")
def get_current_location():
    """Returns pilot default location / centroid (Section 27.5)."""
    return {
        "latitude": PILOT_ZONE["center"][0],
        "longitude": PILOT_ZONE["center"][1],
        "city": PILOT_ZONE["city"],
        "pilot_name": PILOT_ZONE["name"]
    }

@app.get("/api/location/search")
def search_location(query: str = Query("", description="Location, landmark or PIN code")):
    """Searches pilot landmarks and addresses (Section 27.5)."""
    local_results = upload_service.search_locations(query)
    if query.strip() and local_results:
        return {"results": local_results, "source": "FLOOD-X pilot index"}

    if query.strip():
        try:
            params = urlencode({"q": query, "format": "jsonv2", "limit": 5, "countrycodes": "in"})
            request = UrlRequest(
                f"https://nominatim.openstreetmap.org/search?{params}",
                headers={"User-Agent": "FLOOD-X/1.0"},
            )
            with urlopen(request, timeout=EXTERNAL_WEATHER_TIMEOUT_SECONDS) as response:
                places = json.loads(response.read().decode("utf-8"))
            return {
                "source": "OpenStreetMap Nominatim",
                "results": [
                    {
                        "name": place.get("display_name", query).split(",")[0],
                        "address": place.get("display_name", ""),
                        "coords": [float(place["lat"]), float(place["lon"])],
                        "pin": "India",
                    }
                    for place in places
                ],
            }
        except Exception:
            pass
    return {"results": local_results, "source": "FLOOD-X pilot index"}

@app.post("/api/flood/report")
def submit_flood_report(req: CitizenReportRequest):
    """Submits a citizen or field officer flood observation (Section 27.3 & 27.5)."""
    return upload_service.submit_report(req.dict())

@app.get("/api/flood/reports")
def get_flood_reports(verified_only: bool = Query(False)):
    """Retrieves verified or recent citizen flood reports (Section 27.5)."""
    return {"reports": upload_service.get_reports(verified_only)}


@app.get("/api/flood/fusion/{location_id}")
def get_observation_fusion(
    location_id: str,
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Fuses a road prediction with nearby citizen observations for validation."""
    road = next((item for item in ROADS if item["id"] == location_id), ROADS[0])
    nowcast = nowcast_engine.get_nowcast(t, rain_mm)
    drain_sim = drainage_twin.simulate(nowcast["avg_intensity_mm_hr"], blockage_pct)
    prediction = flood_ml_model.predict_for_road(road, t, rain_mm, blockage_pct, drain_sim)

    def distance_km(first: List[float], second: List[float]) -> float:
        return math.hypot((first[0] - second[0]) * 111.0, (first[1] - second[1]) * 111.0)

    road_midpoint = road["coords"][len(road["coords"]) // 2]
    nearby_reports = [
        report for report in upload_service.get_reports(False)
        if distance_km(road_midpoint, report["location"]) <= 0.8
    ]
    observed_depth = round(sum(report["depth_cm"] for report in nearby_reports) / len(nearby_reports), 1) if nearby_reports else None
    if observed_depth is None:
        agreement_pct = 0.0
        fused_depth = prediction["predicted_depth_cm"]
        status = "NO_FIELD_EVIDENCE"
    else:
        difference = abs(observed_depth - prediction["predicted_depth_cm"])
        agreement_pct = round(max(0.0, min(100.0, 100.0 - (difference / max(prediction["predicted_depth_cm"], 1.0) * 100.0))), 1)
        fused_depth = round((prediction["predicted_depth_cm"] * 0.7) + (observed_depth * 0.3), 1)
        status = "CONFIRMED" if agreement_pct >= 75.0 else ("REVIEW" if agreement_pct >= 50.0 else "DIVERGENCE")

    return {
        "location_id": road["id"],
        "road_name": road["name"],
        "model_depth_cm": prediction["predicted_depth_cm"],
        "model_confidence_pct": prediction["confidence_pct"],
        "observed_depth_cm": observed_depth,
        "fused_depth_cm": fused_depth,
        "nearby_report_count": len(nearby_reports),
        "agreement_pct": agreement_pct,
        "status": status,
        "source_summary": "Nearby citizen and field reports within 800 m" if nearby_reports else "No nearby field reports available",
    }

def upload_custom_dataset(payload: CustomUploadPayload):
    """Processes the JSON MVP upload payload for direct callers and tests."""
    filename = payload.dataset_name if payload.dataset_name.endswith((".csv", ".json", ".geojson")) else f"{payload.dataset_name}.csv"
    metadata = {"dataset_name": payload.dataset_name, "data_type": payload.data_type, "source": payload.source}
    if payload.user_location:
        metadata["user_location"] = payload.user_location
    return upload_service.process_upload(
        file_content=payload.file_content,
        filename=filename,
        metadata=metadata
    )

@app.post("/api/upload/data")
async def upload_custom_dataset_endpoint(request: Request):
    """Uploads custom CSV or GeoJSON using JSON MVP or multipart form data."""
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        uploaded_file = form.get("file")
        if not isinstance(uploaded_file, UploadFile):
            raise HTTPException(status_code=422, detail="Multipart uploads require a file field")
        file_content = (await uploaded_file.read()).decode("utf-8")
        dataset_name = str(form.get("dataset_name") or uploaded_file.filename or "Uploaded Dataset")
        data_type = str(form.get("data_type") or "drainage")
        source = str(form.get("source") or "User Upload")
        location_lat = form.get("location_lat")
        location_lon = form.get("location_lon")
        location_label = str(form.get("location_label") or "")
        filename = uploaded_file.filename or dataset_name
    else:
        return upload_custom_dataset(CustomUploadPayload(**(await request.json())))

    metadata = {"dataset_name": dataset_name, "data_type": data_type, "source": source}
    if location_lat is not None and location_lon is not None:
        try:
            metadata["user_location"] = {
                "latitude": float(location_lat),
                "longitude": float(location_lon),
                "label": location_label or "Browser current location",
            }
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="Upload location must contain valid latitude and longitude")

    return upload_service.process_upload(
        file_content=file_content,
        filename=filename,
        metadata=metadata
    )

@app.get("/api/upload/validate/{upload_id}")
def validate_upload(upload_id: str):
    """Shows validation errors and warnings for uploaded file (Section 27.5)."""
    upl = get_upload(upload_id)
    if not upl:
        raise HTTPException(status_code=404, detail="Upload not found")
    return {
        "upload_id": upl["upload_id"],
        "status": upl["status"],
        "feature_count": upl["feature_count"],
        "errors": upl["errors"],
        "warnings": upl["warnings"]
    }

@app.get("/api/upload/preview/{upload_id}")
def preview_upload(upload_id: str):
    """Previews parsed features from uploaded file (Section 27.5)."""
    return upload_service.get_upload_preview(upload_id)

@app.post("/api/upload/apply/{upload_id}")
def apply_upload(upload_id: str):
    """Approves and adds uploaded dataset to active project layers (Section 27.5)."""
    return upload_service.apply_upload(upload_id)

@app.get("/api/user/layers")
def list_user_layers():
    """Lists user and project-uploaded custom layers (Section 27.5)."""
    return {"layers": upload_service.get_user_layers()}

@app.delete("/api/user/layers/{layer_id}")
def delete_user_layer(layer_id: str):
    """Removes an uploaded custom layer (Section 27.5)."""
    return upload_service.delete_user_layer(layer_id)

# =========================================================================
# BACKWARDS-COMPATIBLE ENDPOINTS
# =========================================================================

@app.get("/api/status")
def get_system_status():
    return {
        "status": "ONLINE",
        "system": "FLOOD-X Digital Twin Engine",
        "pilot_zone": PILOT_ZONE,
        "supported_horizons_min": TIMELINE_STEPS,
        "supported_vehicles": list(VEHICLE_PROFILES.keys())
    }

@app.get("/api/weather")
def get_weather():
    return get_rainfall_current()

@app.get("/api/rainfall")
def get_rainfall(
    t: int = Query(0, ge=0, le=180),
    scenario_mm: float = Query(85.0, ge=10.0, le=250.0)
):
    return nowcast_engine.get_nowcast(t, scenario_mm)

@app.get("/api/forecast")
def get_forecast():
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
    t: int = Query(0, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    return flood_ml_model.predict_all(t, rain_mm, blockage_pct)

@app.get("/api/flood/{road_id}")
def get_road_flood_detail(
    road_id: str,
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    return get_flood_prediction_for_location(road_id, t, rain_mm, blockage_pct)

@app.get("/api/drainage")
def get_drainage(
    rain_intensity_mm_hr: float = Query(65.0, ge=0.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    return drainage_twin.simulate(rain_intensity_mm_hr, blockage_pct)

@app.post("/api/routes/calculate")
def calculate_emergency_routes_compat(req: RouteRequest):
    return calculate_flood_aware_route(req)

@app.get("/api/alerts")
def get_active_alerts(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    alerts = []

    for r in flood_state["roads"]:
        if r["predicted_depth_cm"] >= 25.0 or r["risk_score_norm"] >= 0.80:
            alerts.append({
                "id": f"ALERT-{r['road_id']}-CRIT",
                "severity": "CRITICAL",
                "road_id": r["road_id"],
                "road_name": r["name"],
                "coords": r["coords"][len(r["coords"]) // 2],
                "message": f"CRITICAL INUNDATION DANGER: {r['name']} predicted depth {r['predicted_depth_cm']} cm ({r['risk_level']} Risk). Corridor impassable.",
                "depth_cm": r["predicted_depth_cm"],
                "probability_pct": r["flood_probability_pct"],
                "risk_norm": r["risk_score_norm"]
            })
        elif r["predicted_depth_cm"] >= 15.0 or r["risk_score_norm"] >= 0.60:
            alerts.append({
                "id": f"ALERT-{r['road_id']}-HIGH",
                "severity": "WARNING",
                "road_id": r["road_id"],
                "road_name": r["name"],
                "coords": r["coords"][len(r["coords"]) // 2],
                "message": f"HIGH WATERLOGGING RISK: {r['name']} water depth ~ {r['predicted_depth_cm']} cm. Reduce speed.",
                "depth_cm": r["predicted_depth_cm"],
                "probability_pct": r["flood_probability_pct"],
                "risk_norm": r["risk_score_norm"]
            })

    for pipe in flood_state["drainage"]["pipes"]:
        if pipe["status"] == "SURCHARGED":
            alerts.append({
                "id": f"ALERT-{pipe['pipe_id']}-SURCHARGE",
                "severity": "SURCHARGE",
                "pipe_id": pipe["pipe_id"],
                "coords": flood_state["drainage"]["nodes"][pipe["source"]]["coords"],
                "drainage_area_name": flood_state["drainage"]["nodes"][pipe["source"]]["name"],
                "message": f"DRAINAGE SURCHARGE: Conduit {pipe['pipe_id']} exceeded capacity ({pipe['utilization_pct']}%). Backwater ponding occurring.",
                "utilization_pct": pipe["utilization_pct"]
            })

    drainage = flood_state["drainage"]
    if drainage["water_level_rising"]:
        alerts.append({
            "id": "ALERT-DRAINAGE-WATER-LEVEL-RISING",
            "severity": "SURCHARGE",
            "coords": flood_state["drainage"]["nodes"][drainage["water_level_rising_nodes"][0]]["coords"],
            "drainage_area_name": flood_state["drainage"]["nodes"][drainage["water_level_rising_nodes"][0]]["name"],
            "message": (
                f"DRAINAGE CAPACITY WARNING: estimated water levels are rising in "
                f"{len(drainage['water_level_rising_nodes'])} area(s); "
                f"maximum level is {drainage['max_estimated_water_level_cm']} cm."
            ),
            "water_level_rising_nodes": drainage["water_level_rising_nodes"],
            "max_estimated_water_level_cm": drainage["max_estimated_water_level_cm"],
            "drainage_effectiveness_pct": drainage["drainage_effectiveness_pct"],
        })

    for alert in alerts:
        workflow = ALERT_WORKFLOW.get(alert["id"], {"status": "NEW"})
        alert["workflow_status"] = workflow["status"]
        if workflow.get("updated_at"):
            alert["workflow_updated_at"] = workflow["updated_at"]

    return {
        "timestamp": "Real-Time Broadcast",
        "active_alert_count": len(alerts),
        "alerts": alerts
    }


@app.post("/api/alerts/workflow")
def update_alert_workflow(req: AlertWorkflowRequest):
    """Acknowledges or escalates a generated alert without changing its risk calculation."""
    action = req.action.upper()
    if action not in ["ACKNOWLEDGE", "ESCALATE"]:
        raise HTTPException(status_code=400, detail="action must be ACKNOWLEDGE or ESCALATE")
    status = "ACKNOWLEDGED" if action == "ACKNOWLEDGE" else "ESCALATED"
    updated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ALERT_WORKFLOW[req.alert_id] = {"status": status, "updated_at": updated_at}
    return {"alert_id": req.alert_id, "workflow_status": status, "updated_at": updated_at}

@app.get("/api/gis/layers")
def get_gis_layers():
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
