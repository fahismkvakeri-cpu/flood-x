export interface RoadPrediction {
  road_id: string;
  name: string;
  coords: [number, number][];
  road_type: string;
  length_m: number;
  elevation_m: number;
  forecast_horizon_min: number;
  predicted_depth_cm: number;
  flood_probability_pct: number;
  risk_score_norm: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_category: 'SAFE' | 'WATCH' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  color: string;
  time_to_flood_min: number | null;
  flood_duration_hrs: number;
  drain_utilization_pct: number;
  drain_status: string;
  drainage_area_id: string | null;
  drainage_area_name: string;
  drainage_water_level_cm: number;
  drainage_retained_volume_m3: number;
  drainage_effectiveness_pct: number;
  drainage_level_status: string;
  confidence_pct: number;
  depth_lower_cm: number;
  depth_upper_cm: number;
  uncertainty_reason: string;
  is_closed: boolean;
  explainability: Record<string, number>;
  top_factor: string;
  plain_reason: string;
}

export interface DrainagePipe {
  pipe_id: string;
  source: string;
  destination: string;
  current_flow_m3s: number;
  capacity_m3s: number;
  utilization_pct: number;
  status: 'NORMAL' | 'CRITICAL' | 'SURCHARGED';
  overflow_m3s: number;
  diameter_m: number;
}

export interface DrainageNode {
  id: string;
  name: string;
  coords: [number, number];
  elevation: number;
  inflow_m3s: number;
  total_inflow_m3s: number;
  conveyed_flow_m3s: number;
  retained_flow_m3s: number;
  retained_volume_m3: number;
  estimated_water_level_cm: number;
  drainage_effectiveness_pct: number;
  level_status: string;
  is_surcharged: boolean;
  status: string;
}

export interface DrainageSimulation {
  total_pipes: number;
  surcharged_count: number;
  surcharged_pipes: string[];
  blockage_pct: number;
  total_surcharge_volume_m3: number;
  generated_runoff_m3: number;
  retained_floodwater_m3: number;
  max_estimated_water_level_cm: number;
  drainage_effectiveness_pct: number;
  water_level_rising: boolean;
  water_level_rising_nodes: string[];
  effectiveness_status: string;
  pipes: DrainagePipe[];
  nodes: Record<string, DrainageNode>;
}

export interface KPIs {
  active_flood_zones: number;
  critical_roads: number;
  surcharged_drains: number;
  max_water_depth_cm: number;
  total_monitored_roads: number;
}

export interface NowcastCell {
  lat: number;
  lon: number;
  intensity_mm_hr: number;
  confidence: number;
}

export interface RainfallNowcast {
  forecast_horizon_min: number;
  avg_intensity_mm_hr: number;
  accumulated_rainfall_mm: number;
  confidence_pct: number;
  storm_status: string;
  grid_cells: NowcastCell[];
}

export interface FloodPredictResponse {
  forecast_horizon_min: number;
  rainfall_scenario_mm: number;
  blockage_pct: number;
  nowcast: RainfallNowcast;
  drainage: DrainageSimulation;
  kpis: KPIs;
  roads: RoadPrediction[];
  timeline_projections: Record<string, { horizon_min: number; depth_cm: number; risk_score_norm: number; risk_score: number; risk_level: string; risk_category: string }[]>;
}

export interface CriticalLocation {
  rank: number;
  road_id: string;
  name: string;
  coords: [number, number];
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_score: number;
  predicted_depth_cm: number;
  depth_lower_cm: number;
  depth_upper_cm: number;
  time_to_flood_min: number | null;
  flood_probability_pct: number;
  confidence_pct: number;
  is_closed: boolean;
  top_factor: string;
  plain_reason: string;
}

export interface CriticalLocationsResponse {
  forecast_horizon_min: number;
  scenario: { rainfall_mm: number; blockage_pct: number };
  locations: CriticalLocation[];
}

export interface AreaAnalysisResponse {
  status: string;
  centroid: [number, number];
  polygon: [number, number][];
  forecast_horizon_min: number;
  scenario: { rainfall_mm: number; blockage_pct: number };
  roads_in_area: number;
  critical_roads: number;
  max_predicted_depth_cm: number;
  baseline_flood_probability_pct: number;
  ml_flood_probability_pct: number;
  bhuvan_hazard: { hazard_class: string; zone_name: string; source: string };
  gpm_imerg: { rain_3h: number; rain_24h: number; status: string; source?: string };
  exposure: { total_exposed_population: number; exposure_percentage: number; evacuation_priority: string };
  ml_model: { ready: boolean; backend: string; ml_accuracy?: number; baseline_accuracy?: number };
  top_roads: RoadPrediction[];
  summary: string;
}

export interface LocationBriefResponse {
  location: { latitude: number; longitude: number };
  nearest_road: { road_id: string; name: string; distance_km: number };
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_score: number;
  predicted_depth_cm: number;
  depth_range_cm: [number, number];
  flood_probability_pct: number;
  confidence_pct: number;
  time_to_flood_min: number | null;
  hazard: { hazard_class: string; zone_name: string };
  rainfall: { rain_3h: number; rain_24h: number; status: string };
  recommended_action: string;
  source: string;
}

export interface RouteSummary {
  path_nodes: string[];
  total_distance_km: number;
  estimated_duration_min: number;
  max_depth_cm: number;
  flooded_segments_count: number;
  risk_status: string;
  color: string;
  segments: {
    road_id: string;
    name: string;
    length_m: number;
    depth_cm: number;
    risk_score: number;
    risk_score_norm: number;
    is_hazard: boolean;
  }[];
  coordinates: [number, number][];
}

export interface RouteCalculationResponse {
  origin: { id: string; name: string; coords: [number, number] };
  destination: { id: string; name: string; coords: [number, number] };
  vehicle_profile: {
    name: string;
    icon: string;
    wading_depth_limit_cm: number;
    speed_kmh: number;
    risk_penalty_factor: number;
  };
  forecast_horizon_min: number;
  routing_source?: string;
  normal_route: RouteSummary | null;
  recommended_route: RouteSummary | null;
  summary: {
    flooded_segments_avoided: number;
    is_normal_route_trapped: boolean;
    recommendation: string;
  };
}

export interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'SURCHARGE';
  road_id?: string;
  road_name?: string;
  pipe_id?: string;
  message: string;
  depth_cm?: number;
  probability_pct?: number;
  risk_norm?: number;
  utilization_pct?: number;
  coords?: [number, number];
  drainage_area_name?: string;
  water_level_rising_nodes?: string[];
  max_estimated_water_level_cm?: number;
  drainage_effectiveness_pct?: number;
  workflow_status?: 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED';
  workflow_updated_at?: string;
}

export interface EvacuationShelter {
  id: string;
  name: string;
  type: string;
  coords: [number, number];
  capacity: number;
  occupancy: number;
  available_space: number;
  distance_km: number;
  status: string;
  suitability: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_demand: number;
  message: string;
}

export interface EvacuationSummaryResponse {
  evacuation_priority: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  total_exposed_population: number;
  exposure_percentage: number;
  shelters: EvacuationShelter[];
  recommended_shelter: EvacuationShelter;
  summary: string;
}

export interface MaintenanceAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: string;
  risk_score: number;
  last_inspected_hours: number;
  message: string;
}

export interface OperationsSummaryResponse {
  field_status: string;
  operations_window_min: number;
  total_assets: number;
  critical_assets: number;
  open_work_orders: number;
  service_health_pct: number;
  active_alerts: number;
  assets: MaintenanceAsset[];
  priority_summary: {
    critical: number;
    high: number;
    monitor: number;
  };
  recommendation: string;
}

export interface ResponsePlanAction {
  id: string;
  type: string;
  urgency: string;
  title: string;
  target: string;
  reason: string;
  expected_depth_reduction_cm: number;
  population_protected: number;
  evidence: string;
  priority_score: number;
}

export interface ResponsePlanResponse {
  forecast_horizon_min: number;
  scenario: { rainfall_mm: number; blockage_pct: number };
  decision_summary: string;
  total_population_protected: number;
  actions: ResponsePlanAction[];
}

export interface InterventionImpactResponse {
  intervention_type: string;
  intervention_label: string;
  baseline: { blockage_pct: number; retained_floodwater_m3: number; max_water_level_cm: number; drainage_effectiveness_pct: number; exposed_population: number; critical_roads: number };
  after: { blockage_pct: number; retained_floodwater_m3: number; max_water_level_cm: number; drainage_effectiveness_pct: number; exposed_population: number; critical_roads: number };
  impact: { retained_water_reduction_m3: number; water_level_reduction_cm: number; population_protected: number; critical_roads_avoided: number };
}

export interface ObservationFusionResponse {
  location_id: string;
  road_name: string;
  model_depth_cm: number;
  model_confidence_pct: number;
  observed_depth_cm: number | null;
  fused_depth_cm: number;
  nearby_report_count: number;
  agreement_pct: number;
  status: 'CONFIRMED' | 'REVIEW' | 'DIVERGENCE' | 'NO_FIELD_EVIDENCE';
  source_summary: string;
}

// Section 19.7: WorldPop Exposure Data
export interface PopulationCell {
  cell_id: string;
  name: string;
  coords: [number, number];
  total_population: number;
  exposed_population: number;
  exposure_percentage: number;
  max_predicted_depth_cm: number;
  flood_risk_norm: number;
  priority_score: number;
  priority_level: string;
}

export interface PopulationExposureResponse {
  source: string;
  total_pilot_population: number;
  total_exposed_population: number;
  exposure_percentage: number;
  high_risk_wards_count: number;
  evacuation_priority: string;
  population_cells: PopulationCell[];
}

// Section 27: Citizen Flood Report
export interface CitizenReport {
  id: string;
  timestamp: string;
  location: [number, number];
  location_name: string;
  water_depth: string;
  depth_cm: number;
  road_status: 'open' | 'partially blocked' | 'closed';
  drain_status: 'normal' | 'overflowing' | 'blocked' | 'unknown';
  description: string;
  photo_url?: string;
  verified: boolean;
  reporter_type?: string;
}

// Section 27: User Uploaded Custom Layer
export interface UserLayer {
  id: string;
  name: string;
  data_type: string;
  source: string;
  feature_count: number;
  features: any[];
  active: boolean;
  applied_at: string;
  user_location?: { latitude: number; longitude: number; label?: string } | null;
}

export interface LandmarkLocation {
  name: string;
  address: string;
  coords: [number, number];
  pin: string;
}

export interface IndiaRiskPoint {
  id: string;
  name: string;
  coords: [number, number];
  risk_score_norm: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  predicted_depth_cm: number;
  source: string;
  rainfall_mm?: number;
  elevation_m?: number;
  river_discharge_m3s?: number;
  soil_type?: string;
  population_density?: number;
  water_level_m?: number;
  land_cover?: string;
  flood_occurred?: boolean;
}

export interface PlaceDetail {
  city: string;
  status: string;
  pilot_area?: string;
  flood_zones: { id: string; name: string; risk_level: string; depth_cm: number; coordinates: [number, number][] }[];
  safe_corridors: { id: string; name: string; risk_level: string; coordinates: [number, number][] }[];
  emergency_assets: { id: string; name: string; type: string; coords: [number, number] }[];
}
