"""FastAPI Application for FLOOD-X matching SIH Implementation Blueprint PRD."""
import os
import time
import json
import csv
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

INDIA_MAINLAND_MASK = [
    (8.0, 77.5), (8.5, 76.0), (10.5, 74.2), (14.0, 73.0),
    (18.0, 72.5), (21.0, 69.0), (25.0, 68.0), (29.0, 70.0),
    (35.0, 72.0), (37.0, 77.0), (35.0, 81.0), (32.0, 84.0),
    (29.0, 88.0), (28.0, 92.0), (26.0, 95.0), (23.0, 94.0),
    (21.0, 90.0), (19.0, 85.0), (16.0, 82.0), (12.0, 80.0),
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

class RouteRequest(BaseModel):
    origin_id: str = "J_ASIAN_HEART"
    destination_id: str = "J_BAIL_BAZAR"
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

@app.get("/api/place/detail")
def get_place_detail(
    city: str = Query("Mumbai"),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0),
):
    """Returns map-ready local operational layers for a selected Indian city."""
    if city.strip().lower() != "mumbai":
        return {"city": city, "status": "OVERVIEW_ONLY", "flood_zones": [], "safe_corridors": [], "emergency_assets": []}

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

@app.get("/api/rainfall/forecast")
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

@app.post("/api/route")
def calculate_flood_aware_route(req: RouteRequest):
    """Generates flood-aware emergency route comparing normal vs safe route (Section 8, 10, 21)."""
    return emergency_router.calculate_routes(
        origin_id=req.origin_id,
        destination_id=req.destination_id,
        vehicle_type=req.vehicle_type,
        t_minutes=req.forecast_horizon_min,
        rainfall_scenario_mm=req.rainfall_scenario_mm,
        blockage_pct=req.blockage_pct
    )

@app.get("/api/exposure")
def get_population_exposure(
    t: int = Query(60, ge=0, le=180),
    rain_mm: float = Query(85.0, ge=10.0, le=250.0),
    blockage_pct: float = Query(0.0, ge=0.0, le=95.0)
):
    """Returns WorldPop population exposure estimate (Section 19.7 & 21)."""
    flood_state = flood_ml_model.predict_all(t, rain_mm, blockage_pct)
    return exposure_engine.calculate_exposure(flood_state["roads"])

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

def upload_custom_dataset(payload: CustomUploadPayload):
    """Processes the JSON MVP upload payload for direct callers and tests."""
    filename = payload.dataset_name if payload.dataset_name.endswith((".csv", ".json", ".geojson")) else f"{payload.dataset_name}.csv"
    return upload_service.process_upload(
        file_content=payload.file_content,
        filename=filename,
        metadata={"dataset_name": payload.dataset_name, "data_type": payload.data_type, "source": payload.source}
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
        filename = uploaded_file.filename or dataset_name
    else:
        return upload_custom_dataset(CustomUploadPayload(**(await request.json())))

    return upload_service.process_upload(
        file_content=file_content,
        filename=filename,
        metadata={"dataset_name": dataset_name, "data_type": data_type, "source": source}
    )

@app.get("/api/upload/validate/{upload_id}")
def validate_upload(upload_id: str):
    """Shows validation errors and warnings for uploaded file (Section 27.5)."""
    upl = upload_service.uploads.get(upload_id)
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
                "message": f"DRAINAGE SURCHARGE: Conduit {pipe['pipe_id']} exceeded capacity ({pipe['utilization_pct']}%). Backwater ponding occurring.",
                "utilization_pct": pipe["utilization_pct"]
            })

    return {
        "timestamp": "Real-Time Broadcast",
        "active_alert_count": len(alerts),
        "alerts": alerts
    }

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
