"""Configuration and system parameters for FLOOD-X matching SIH Implementation Blueprint."""

PILOT_ZONE = {
    "name": "Mumbai - Kurla/BKC Basin (Pilot 10.5 km²)",
    "city": "Mumbai",
    "center": [19.0680, 72.8720],
    "bounds": {
        "min_lat": 19.0520,
        "max_lat": 19.0840,
        "min_lon": 72.8500,
        "max_lon": 72.8940,
    },
    "area_sq_km": 10.5,
    "total_population": 185000,
    "dem_source": "Copernicus DEM GLO-30",
    "rainfall_source": "IMD Radar + AWS / NASA GPM IMERG",
    "roads_source": "OpenStreetMap + Overpass API"
}

EXTERNAL_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
EXTERNAL_WEATHER_TIMEOUT_SECONDS = 4

TIMELINE_STEPS = [0, 15, 30, 60, 90, 120, 180]  # minutes from now

# Section 8: Baseline Flood-Risk Model Weights (Prototype Standardized)
BASELINE_WEIGHTS = {
    "rainfall": 0.30,
    "elevation": 0.20,
    "slope": 0.15,
    "flow_accumulation": 0.15,
    "drainage": 0.20
}

# Section 8: Calibrated Normalized Risk Levels (0.0 to 1.0)
RISK_LEVELS_NORM = {
    "LOW": {"min": 0.0, "max": 0.30, "color": "#10b981", "badge": "Low Risk", "level": "Low"},
    "MEDIUM": {"min": 0.30, "max": 0.60, "color": "#f59e0b", "badge": "Medium Risk", "level": "Medium"},
    "HIGH": {"min": 0.60, "max": 0.80, "color": "#f97316", "badge": "High Risk", "level": "High"},
    "CRITICAL": {"min": 0.80, "max": 1.00, "color": "#ef4444", "badge": "Critical Risk", "level": "Critical"}
}

# Legacy scale (0-100) compatible mapping
RISK_LEVELS = {
    "SAFE": {"min": 0, "max": 30, "color": "#10b981", "badge": "SAFE"},
    "WATCH": {"min": 31, "max": 60, "color": "#eab308", "badge": "WATCH"},
    "MODERATE": {"min": 61, "max": 75, "color": "#f97316", "badge": "MODERATE"},
    "HIGH": {"min": 76, "max": 85, "color": "#ef4444", "badge": "HIGH"},
    "CRITICAL": {"min": 86, "max": 100, "color": "#991b1b", "badge": "CRITICAL"}
}

VEHICLE_PROFILES = {
    "AMBULANCE": {
        "name": "Ambulance",
        "icon": "ambulance",
        "wading_depth_limit_cm": 25.0,
        "speed_kmh": 45.0,
        "risk_penalty_factor": 3.0
    },
    "FIRE_RESCUE": {
        "name": "Fire & Rescue",
        "icon": "truck",
        "wading_depth_limit_cm": 50.0,
        "speed_kmh": 35.0,
        "risk_penalty_factor": 1.5
    },
    "POLICE": {
        "name": "Police Patrol",
        "icon": "shield",
        "wading_depth_limit_cm": 30.0,
        "speed_kmh": 40.0,
        "risk_penalty_factor": 2.2
    },
    "PUBLIC_TRANSPORT": {
        "name": "Public Bus",
        "icon": "bus",
        "wading_depth_limit_cm": 40.0,
        "speed_kmh": 25.0,
        "risk_penalty_factor": 2.0
    },
    "CITIZEN": {
        "name": "Citizen Car",
        "icon": "car",
        "wading_depth_limit_cm": 15.0,
        "speed_kmh": 30.0,
        "risk_penalty_factor": 4.5
    }
}

# Section 19.7: WorldPop 100m Population Density Distribution for Pilot Area
WORLDPOP_PILOT_GRID = [
    {"cell_id": "POP-01", "name": "Kurla West Station Hub", "coords": [19.0685, 72.8790], "population": 38500, "density_per_km2": 26000},
    {"cell_id": "POP-02", "name": "LBS Marg Dense Residential", "coords": [19.0725, 72.8765], "population": 42000, "density_per_km2": 28000},
    {"cell_id": "POP-03", "name": "Bail Bazar Settlement", "coords": [19.0805, 72.8845], "population": 31500, "density_per_km2": 22000},
    {"cell_id": "POP-04", "name": "Mithi River Slum Enclave", "coords": [19.0690, 72.8715], "population": 29000, "density_per_km2": 32000},
    {"cell_id": "POP-05", "name": "BKC Commercial Highrise Core", "coords": [19.0650, 72.8620], "population": 16000, "density_per_km2": 9500},
    {"cell_id": "POP-06", "name": "Kalina Campus & Ridge", "coords": [19.0760, 72.8680], "population": 28000, "density_per_km2": 14000}
]
