"""Configuration and system parameters for FLOOD-X."""

PILOT_ZONE = {
    "name": "Mumbai - Kurla/BKC Basin (Pilot 10 km²)",
    "city": "Mumbai",
    "center": [19.0680, 72.8720],
    "bounds": {
        "min_lat": 19.0520,
        "max_lat": 19.0840,
        "min_lon": 72.8500,
        "max_lon": 72.8940,
    },
    "area_sq_km": 10.5
}

TIMELINE_STEPS = [0, 15, 30, 60, 90, 120, 180]  # minutes from now

RISK_LEVELS = {
    "SAFE": {"min": 0, "max": 20, "color": "#10b981", "badge": "SAFE"},
    "WATCH": {"min": 21, "max": 40, "color": "#eab308", "badge": "WATCH"},
    "MODERATE": {"min": 41, "max": 60, "color": "#f97316", "badge": "MODERATE"},
    "HIGH": {"min": 61, "max": 80, "color": "#ef4444", "badge": "HIGH"},
    "CRITICAL": {"min": 81, "max": 100, "color": "#991b1b", "badge": "CRITICAL"}
}

VEHICLE_PROFILES = {
    "AMBULANCE": {
        "name": "Ambulance",
        "icon": "ambulance",
        "wading_depth_limit_cm": 25.0,
        "speed_kmh": 45.0,
        "risk_penalty_factor": 2.5
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
        "risk_penalty_factor": 2.0
    },
    "PUBLIC_TRANSPORT": {
        "name": "Public Bus",
        "icon": "bus",
        "wading_depth_limit_cm": 40.0,
        "speed_kmh": 25.0,
        "risk_penalty_factor": 1.8
    },
    "CITIZEN": {
        "name": "Citizen Car",
        "icon": "car",
        "wading_depth_limit_cm": 15.0,
        "speed_kmh": 30.0,
        "risk_penalty_factor": 4.0
    }
}
