"""Comprehensive automated test suite validating the SIH Implementation Blueprint."""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import (
    get_health,
    get_rainfall_current,
    get_rainfall_forecast,
    get_flood_risk_map,
    get_flood_prediction_for_location,
    get_flood_explanation,
    run_simulation,
    calculate_flood_aware_route,
    get_population_exposure,
    get_evacuation_summary,
    get_active_alerts,
    get_critical_locations,
    analyze_drawn_area,
    AreaAnalysisRequest,
    get_observation_fusion,
    update_alert_workflow,
    AlertWorkflowRequest,
    get_response_plan,
    simulate_intervention,
    InterventionRequest,
    search_location,
    submit_flood_report,
    get_flood_reports,
    upload_custom_dataset,
    validate_upload,
    preview_upload,
    apply_upload,
    list_user_layers,
    SimulationRequest,
    RouteRequest,
    CitizenReportRequest,
    CustomUploadPayload,
    DIST_DIR
)
from app.engine.drainage_digital_twin import drainage_twin

def test_blueprint_apis():
    print("--- 1. Testing System Health & Telemetry (/api/health) ---")
    health = get_health()
    assert health["status"] == "HEALTHY"
    assert "IMD Doppler Radar" in health["data_sources"]["rainfall"]["source"]
    assert "Copernicus DEM" in health["data_sources"]["terrain"]["source"]
    print("[PASS] /api/health passed")

    print("\n--- 2. Testing IMD Rainfall Ingestion (/api/rainfall/current & /forecast) ---")
    rain_cur = get_rainfall_current()
    assert rain_cur["rainfall_mm"] > 0
    assert "Doppler" in rain_cur["station"]
    print(f"[PASS] /api/rainfall/current passed ({rain_cur['intensity_mm_hr']} mm/h)")

    rain_fc = get_rainfall_forecast(t=60, scenario_mm=85.0)
    assert rain_fc["forecast_horizon_min"] == 60
    assert len(rain_fc["grid_cells"]) == 16
    print("[PASS] /api/rainfall/forecast passed")

    print("\n--- 3. Testing GeoJSON Flood Risk Map (/api/flood/risk-map) ---")
    risk_map = get_flood_risk_map(t=60, rain_mm=85.0, blockage_pct=25.0)
    assert risk_map["type"] == "FeatureCollection"
    assert len(risk_map["features"]) > 0
    sample_feat = risk_map["features"][0]
    assert "risk_score_norm" in sample_feat["properties"]
    assert "risk_level" in sample_feat["properties"]
    print(f"[PASS] /api/flood/risk-map passed ({len(risk_map['features'])} GeoJSON road vectors)")

    print("\n--- 4. Testing Location Prediction & Explainability (/api/flood/prediction & /explain) ---")
    pred = get_flood_prediction_for_location("ROAD-101", t=60, rain_mm=85.0, blockage_pct=0.0)
    assert pred["location_id"] == "ROAD-101"
    assert "predicted_depth_cm" in pred["prediction"]
    assert pred["prediction"]["depth_lower_cm"] <= pred["prediction"]["predicted_depth_cm"] <= pred["prediction"]["depth_upper_cm"]
    assert "risk_level" in pred["prediction"]
    print(f"[PASS] /api/flood/prediction/ROAD-101 passed: Depth = {pred['prediction']['predicted_depth_cm']} cm, Level = {pred['prediction']['risk_level']}")

    expl = get_flood_explanation("ROAD-101", t=60, rain_mm=85.0, blockage_pct=0.0)
    assert "contributing_factors" in expl
    assert "plain_language_reason" in expl
    print(f"[PASS] /api/flood/explain/ROAD-101 passed: Top Factor = {expl['top_factor']}")

    print("\n--- 5. Testing What-If Simulation (/api/simulation) ---")
    sim_res = run_simulation(SimulationRequest(rainfall_scenario_mm=120.0, blockage_percent=40.0, forecast_horizon_min=90))
    assert sim_res["kpis"]["surcharged_drains"] > 0
    assert sim_res["drainage"]["retained_floodwater_m3"] > 0
    assert sim_res["drainage"]["water_level_rising"] is True
    assert sim_res["drainage"]["effectiveness_status"] == "UNDER_CAPACITY"
    print(f"[PASS] /api/simulation passed: Surcharged drains = {sim_res['kpis']['surcharged_drains']}, Critical roads = {sim_res['kpis']['critical_roads']}")

    print("\n--- 5b. Testing Drainage Water-Level Effectiveness Diagnostics ---")
    dry = drainage_twin.simulate(0.0, 0.0)
    blocked = drainage_twin.simulate(120.0, 40.0)
    assert dry["drainage_effectiveness_pct"] == 100.0
    assert dry["water_level_rising"] is False
    assert blocked["retained_floodwater_m3"] > dry["retained_floodwater_m3"]
    assert blocked["max_estimated_water_level_cm"] > dry["max_estimated_water_level_cm"]
    assert blocked["drainage_effectiveness_pct"] < dry["drainage_effectiveness_pct"]
    print(f"[PASS] drainage diagnostics passed: {blocked['retained_floodwater_m3']} m³ retained, max level = {blocked['max_estimated_water_level_cm']} cm")

    print("\n--- 6. Testing Section 10 Flood-Aware Routing (/api/route) ---")
    route_res = calculate_flood_aware_route(RouteRequest(
        origin_id="J_ASIAN_HEART",
        destination_id="J_BAIL_BAZAR",
        vehicle_type="AMBULANCE",
        forecast_horizon_min=60,
        rainfall_scenario_mm=85.0,
        blockage_pct=0.0
    ))
    assert route_res["normal_route"] is not None
    assert route_res["recommended_route"] is not None
    assert route_res["vehicle_profile"]["name"] == "Ambulance"
    assert route_res["vehicle_profile"]["wading_depth_limit_cm"] == 25.0
    assert route_res["summary"]["flooded_segments_avoided"] >= 1
    print(f"[PASS] /api/route passed: Normal route depth = {route_res['normal_route']['max_depth_cm']} cm, Safe route avoided {route_res['summary']['flooded_segments_avoided']} flooded segments")

    print("\n--- 7. Testing Section 19.7 WorldPop Population Exposure (/api/exposure) ---")
    expo = get_population_exposure(t=60, rain_mm=85.0, blockage_pct=0.0)
    assert expo["total_exposed_population"] > 0
    assert "evacuation_priority" in expo
    print(f"[PASS] /api/exposure passed: Total exposed = {expo['total_exposed_population']} citizens ({expo['exposure_percentage']}%), Priority = {expo['evacuation_priority']}")

    print("\n--- 7b. Testing Evacuation & Shelter Planning ---")
    evac = get_evacuation_summary(t=60, rain_mm=85.0, blockage_pct=0.0)
    assert evac["evacuation_priority"] in ["CRITICAL", "HIGH", "ELEVATED"]
    assert len(evac["shelters"]) >= 3
    assert evac["recommended_shelter"]["name"]
    print(f"[PASS] /api/evacuation/summary passed: {evac['evacuation_priority']} priority, {len(evac['shelters'])} shelters available")

    print("\n--- 7e. Testing Model and Citizen Observation Fusion ---")
    fusion = get_observation_fusion("ROAD-101", t=60, rain_mm=85.0, blockage_pct=0.0)
    assert fusion["location_id"] == "ROAD-101"
    assert fusion["fused_depth_cm"] >= 0
    assert fusion["status"] in ["CONFIRMED", "REVIEW", "DIVERGENCE", "NO_FIELD_EVIDENCE"]
    print(f"[PASS] /api/flood/fusion/ROAD-101 passed: status = {fusion['status']}, reports = {fusion['nearby_report_count']}")

    print("\n--- 7f. Testing Alert Acknowledgement Workflow ---")
    alert_snapshot = get_active_alerts(t=90, rain_mm=120.0, blockage_pct=40.0)
    alert_id = alert_snapshot["alerts"][0]["id"]
    workflow = update_alert_workflow(AlertWorkflowRequest(alert_id=alert_id, action="ACKNOWLEDGE"))
    assert workflow["workflow_status"] == "ACKNOWLEDGED"
    refreshed_alerts = get_active_alerts(t=90, rain_mm=120.0, blockage_pct=40.0)
    refreshed = next(alert for alert in refreshed_alerts["alerts"] if alert["id"] == alert_id)
    assert refreshed["workflow_status"] == "ACKNOWLEDGED"
    print(f"[PASS] /api/alerts/workflow passed: {alert_id} acknowledged")

    print("\n--- 7g. Testing Critical Location Predictor ---")
    critical_locations = get_critical_locations(t=90, rain_mm=120.0, blockage_pct=40.0, limit=5)
    assert len(critical_locations["locations"]) == 5
    assert critical_locations["locations"][0]["risk_score"] >= critical_locations["locations"][-1]["risk_score"]
    assert critical_locations["locations"][0]["depth_lower_cm"] <= critical_locations["locations"][0]["predicted_depth_cm"]
    print(f"[PASS] /api/flood/critical-locations passed: top = {critical_locations['locations'][0]['name']}")

    print("\n--- 7h. Testing Drawn Area Analysis ---")
    area = analyze_drawn_area(AreaAnalysisRequest(
        polygon=[[19.066, 72.873], [19.075, 72.873], [19.075, 72.884], [19.066, 72.884]],
        forecast_horizon_min=90,
        rainfall_scenario_mm=120.0,
        blockage_percent=40.0,
    ))
    assert area["status"] == "ANALYZED"
    assert area["roads_in_area"] > 0
    assert "exposure" in area and "bhuvan_hazard" in area
    print(f"[PASS] /api/analysis/area passed: {area['roads_in_area']} roads analyzed")

    print("\n--- 7c. Testing AI Response Planner ---")
    response_plan = get_response_plan(t=90, rain_mm=120.0, blockage_pct=40.0)
    assert len(response_plan["actions"]) > 0
    assert response_plan["actions"][0]["priority_score"] >= response_plan["actions"][-1]["priority_score"]
    assert response_plan["total_population_protected"] > 0
    print(f"[PASS] /api/operations/response-plan passed: {len(response_plan['actions'])} actions ranked")

    print("\n--- 7d. Testing Intervention Impact Simulator ---")
    intervention = simulate_intervention(InterventionRequest(rainfall_scenario_mm=120.0, blockage_percent=40.0, forecast_horizon_min=90, intervention_type="CLEAR_DRAIN"))
    assert intervention["impact"]["retained_water_reduction_m3"] > 0
    assert intervention["after"]["drainage_effectiveness_pct"] >= intervention["baseline"]["drainage_effectiveness_pct"]
    print(f"[PASS] /api/simulation/intervention passed: {intervention['impact']['retained_water_reduction_m3']} m³ water saved")

    print("\n--- 8. Testing Section 27 User Location & Citizen Reports ---")
    locs = search_location("Kurla")
    assert len(locs["results"]) > 0
    print(f"[PASS] /api/location/search passed ({len(locs['results'])} landmarks found)")

    rep_sub = submit_flood_report(CitizenReportRequest(
        location=[19.0725, 72.8765],
        location_name="LBS Marg Near Kurla West Jn",
        water_depth="knee",
        road_status="closed",
        drain_status="overflowing",
        description="Water 45 cm deep over entire carriageway"
    ))
    assert rep_sub["status"] == "SUCCESS"
    assert rep_sub["report"]["depth_cm"] == 45.0
    print(f"[PASS] /api/flood/report submit passed: ID = {rep_sub['report']['id']}")

    reps = get_flood_reports(verified_only=False)
    assert len(reps["reports"]) >= 3
    print(f"[PASS] /api/flood/reports retrieval passed ({len(reps['reports'])} reports active)")

    print("\n--- 9. Testing Section 27 Custom Data Upload Pipeline ---")
    sample_csv = "drain_id,lat,lon,capacity_m3s,blockage_percent\nD001,19.072,72.876,2.5,10\nD002,19.068,72.879,1.8,20\n"
    upl_res = upload_custom_dataset(CustomUploadPayload(
        dataset_name="Municipal Kurla Drain Survey",
        data_type="drainage",
        file_content=sample_csv,
        source="Field Survey Team A"
    ))
    upload_id = upl_res["upload_id"]
    assert upl_res["status"] in ["VALID", "WARNING"]
    assert upl_res["feature_count"] == 2
    print(f"[PASS] /api/upload/data passed: Upload ID = {upload_id}, Features = {upl_res['feature_count']}")

    val_res = validate_upload(upload_id)
    assert val_res["status"] == upl_res["status"]
    print(f"[PASS] /api/upload/validate passed")

    prev_res = preview_upload(upload_id)
    assert len(prev_res["preview_items"]) == 2
    print(f"[PASS] /api/upload/preview passed")

    apply_res = apply_upload(upload_id)
    assert apply_res["status"] == "APPLIED"
    print(f"[PASS] /api/upload/apply passed: Layer ID = {apply_res['layer_id']}")

    layers = list_user_layers()
    assert len(layers["layers"]) >= 1
    print(f"[PASS] /api/user/layers passed ({len(layers['layers'])} layers active)")

    print("\n--- 10. Verifying Static UI Bundle Presence ---")
    assert DIST_DIR.exists()
    assert (DIST_DIR / "index.html").exists()
    print(f"[PASS] Frontend production build present at {DIST_DIR}")

if __name__ == "__main__":
    print("=================================================================")
    print("      FLOOD-X SIH BLUEPRINT AUTOMATED VALIDATION SUITE           ")
    print("=================================================================")
    test_blueprint_apis()
    print("\n=================================================================")
    print("      ALL 10 BLUEPRINT TEST SUITES PASSED FLAWLESSLY!            ")
    print("=================================================================")
