"""Direct in-memory automated test suite for FLOOD-X endpoints."""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import (
    get_system_status,
    get_weather,
    get_rainfall,
    get_forecast,
    get_flood_predictions,
    get_road_flood_detail,
    get_drainage,
    calculate_emergency_routes,
    get_active_alerts,
    RouteRequest,
    DIST_DIR
)

def test_system_status():
    data = get_system_status()
    assert data["status"] == "ONLINE"
    assert "Mumbai" in data["pilot_zone"]["city"]
    print("[PASS] /api/status passed")

def test_weather():
    data = get_weather()
    assert "Doppler" in data["station"]
    assert data["current_intensity_mm_hr"] > 0
    print("[PASS] /api/weather passed")

def test_rainfall_nowcast():
    data = get_rainfall(t=60, scenario_mm=85.0)
    assert data["forecast_horizon_min"] == 60
    assert len(data["grid_cells"]) == 16
    print("[PASS] /api/rainfall passed")

def test_forecast():
    data = get_forecast()
    assert len(data["timeline"]) == 7
    print("[PASS] /api/forecast passed")

def test_flood_predict():
    data = get_flood_predictions(t=60, rain_mm=85.0, blockage_pct=25.0)
    assert len(data["roads"]) > 0
    assert data["kpis"]["max_water_depth_cm"] > 0
    assert data["kpis"]["surcharged_drains"] >= 0
    print(f"[PASS] /api/flood/predict passed (Active flood zones: {data['kpis']['active_flood_zones']}, Max depth: {data['kpis']['max_water_depth_cm']} cm)")

def test_road_detail_xai():
    data = get_road_flood_detail(road_id="ROAD-101", t=60, rain_mm=85.0, blockage_pct=0.0)
    assert "road" in data
    assert "explainability" in data["road"]
    assert "temporal_projection" in data
    print("[PASS] /api/flood/{road_id} passed (XAI factors:", list(data["road"]["explainability"].keys()), ")")

def test_drainage_hydraulics():
    data = get_drainage(rain_intensity_mm_hr=75.0, blockage_pct=30.0)
    assert data["total_pipes"] > 0
    print("[PASS] /api/drainage passed (Surcharged conduits:", data["surcharged_count"], ")")

def test_emergency_routing():
    req = RouteRequest(
        origin_id="J_ASIAN_HEART",
        destination_id="J_BAIL_BAZAR",
        vehicle_type="AMBULANCE",
        forecast_horizon_min=60,
        rainfall_scenario_mm=85.0,
        blockage_pct=0.0
    )
    data = calculate_emergency_routes(req)
    assert data["normal_route"] is not None
    assert data["recommended_route"] is not None
    assert data["summary"]["flooded_segments_avoided"] >= 1
    print(f"[PASS] /api/routes/calculate passed (Flooded segments avoided: {data['summary']['flooded_segments_avoided']})")

def test_alerts():
    data = get_active_alerts(t=60, rain_mm=85.0, blockage_pct=0.0)
    assert "alerts" in data
    print(f"[PASS] /api/alerts passed (Active alerts: {len(data['alerts'])})")

def test_frontend_dist():
    assert DIST_DIR.exists()
    index_file = DIST_DIR / "index.html"
    assert index_file.exists()
    content = index_file.read_text(encoding="utf-8")
    assert "FLOOD-X" in content
    print("[PASS] Frontend production build verified at:", str(DIST_DIR))

if __name__ == "__main__":
    print("--- RUNNING FLOOD-X IN-MEMORY ENGINE & API TESTS ---")
    test_system_status()
    test_weather()
    test_rainfall_nowcast()
    test_forecast()
    test_flood_predict()
    test_road_detail_xai()
    test_drainage_hydraulics()
    test_emergency_routing()
    test_alerts()
    test_frontend_dist()
    print("--- ALL 10 TEST SUITES PASSED CLEANLY! ---")
