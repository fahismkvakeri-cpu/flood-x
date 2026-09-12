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
  risk_score: number;
  risk_category: 'SAFE' | 'WATCH' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  color: string;
  time_to_flood_min: number | null;
  flood_duration_hrs: number;
  drain_utilization_pct: number;
  drain_status: string;
  confidence_pct: number;
  is_closed: boolean;
  explainability: Record<string, number>;
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
  is_surcharged: boolean;
  status: string;
}

export interface DrainageSimulation {
  total_pipes: number;
  surcharged_count: number;
  surcharged_pipes: string[];
  blockage_pct: number;
  total_surcharge_volume_m3: number;
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
  timeline_projections: Record<string, { horizon_min: number; depth_cm: number; risk_score: number; risk_category: string }[]>;
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
  utilization_pct?: number;
}
