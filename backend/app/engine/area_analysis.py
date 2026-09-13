"""Area-of-interest analysis for blueprint section 27.1 / 28."""
from typing import Any, Dict, List

from ..data.bhuvan_hazard import classify_point
from ..data.pilot_dataset import ROADS
from .exposure_engine import exposure_engine
from .flood_ml_model import flood_ml_model
from .gpm_imerg import gpm_imerg_engine
from .historical_flood_model import historical_flood_model


def _point_in_polygon(lat: float, lon: float, ring: List[List[float]]) -> bool:
    inside = False
    previous = len(ring) - 1
    for index, (ilat, ilon) in enumerate(ring):
        plat, plon = ring[previous]
        crosses = ((ilat > lat) != (plat > lat))
        if crosses:
            intersect_lon = (plon - ilon) * (lat - ilat) / ((plat - ilat) or 1e-12) + ilon
            if lon < intersect_lon:
                inside = not inside
        previous = index
    return inside


def analyze_area(
    polygon: List[List[float]],
    t_minutes: int = 60,
    rain_mm: float = 85.0,
    blockage_pct: float = 0.0,
) -> Dict[str, Any]:
    if len(polygon) < 3:
        return {"status": "INVALID_POLYGON", "message": "Draw at least three vertices to close an area of interest."}

    ring = polygon if polygon[0] == polygon[-1] else polygon + [polygon[0]]
    lats = [point[0] for point in ring]
    lons = [point[1] for point in ring]
    centroid = [sum(lats) / len(lats), sum(lons) / len(lons)]

    flood_state = flood_ml_model.predict_all(t_minutes, rain_mm, blockage_pct)
    selected_roads = []
    for road in flood_state["roads"]:
        mid = road["coords"][len(road["coords"]) // 2]
        if _point_in_polygon(mid[0], mid[1], ring):
            selected_roads.append(road)

    gpm = gpm_imerg_engine.get_accumulations(centroid[0], centroid[1])
    hazard = classify_point(centroid[0], centroid[1])
    exposure = exposure_engine.calculate_exposure(selected_roads or flood_state["roads"])
    ml_status = historical_flood_model.status()

    if selected_roads:
        avg_ml = round(sum(r.get("ml_flood_probability_pct", r["flood_probability_pct"]) for r in selected_roads) / len(selected_roads), 1)
        avg_baseline = round(sum(r.get("baseline_flood_probability_pct", r["flood_probability_pct"]) for r in selected_roads) / len(selected_roads), 1)
        max_depth = max(r["predicted_depth_cm"] for r in selected_roads)
        critical = sum(1 for r in selected_roads if r["risk_level"] in ["High", "Critical"])
    else:
        avg_ml = 0.0
        avg_baseline = 0.0
        max_depth = 0.0
        critical = 0

    return {
        "status": "ANALYZED",
        "centroid": centroid,
        "polygon": ring,
        "forecast_horizon_min": t_minutes,
        "scenario": {"rainfall_mm": rain_mm, "blockage_pct": blockage_pct},
        "roads_in_area": len(selected_roads),
        "critical_roads": critical,
        "max_predicted_depth_cm": max_depth,
        "baseline_flood_probability_pct": avg_baseline,
        "ml_flood_probability_pct": avg_ml,
        "bhuvan_hazard": hazard,
        "gpm_imerg": {
            "rain_30m": gpm["rain_30m"],
            "rain_1h": gpm["rain_1h"],
            "rain_3h": gpm["rain_3h"],
            "rain_6h": gpm["rain_6h"],
            "rain_24h": gpm["rain_24h"],
            "status": gpm["status"],
            "source": gpm.get("source"),
        },
        "exposure": {
            "total_exposed_population": exposure["total_exposed_population"],
            "exposure_percentage": exposure["exposure_percentage"],
            "evacuation_priority": exposure["evacuation_priority"],
        },
        "ml_model": {
            "ready": ml_status["ready"],
            "backend": ml_status["backend"],
            "ml_accuracy": ml_status.get("metrics", {}).get("ml_accuracy"),
            "baseline_accuracy": ml_status.get("metrics", {}).get("baseline_accuracy"),
        },
        "top_roads": sorted(selected_roads, key=lambda item: item["risk_score_norm"], reverse=True)[:5],
        "summary": (
            f"{len(selected_roads)} monitored roads in the drawn area. "
            f"Bhuvan hazard class {hazard['hazard_class']}. "
            f"GPM-style 3h rain {gpm['rain_3h']} mm. "
            f"ML P(flood) {avg_ml}% vs baseline {avg_baseline}%."
        ),
    }
