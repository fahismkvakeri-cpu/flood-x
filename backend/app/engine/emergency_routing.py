"""Flood-Safe Emergency Routing Engine for FLOOD-X.
Computes dynamic Dijkstra / A* shortest paths factoring flood depths,
impassable road closures, and vehicle clearance capabilities.
"""
import math
import networkx as nx
from typing import Dict, List, Any, Optional
from ..config import VEHICLE_PROFILES
from ..data.pilot_dataset import JUNCTIONS, ROADS
from .flood_ml_model import flood_ml_model

class EmergencyRoutingEngine:
    def __init__(self):
        pass

    def build_network_graph(self, road_predictions: List[Dict[str, Any]], speed_mps: float = 5.0) -> nx.Graph:
        """Constructs an undirected street network graph annotated with real-time flood conditions."""
        g = nx.Graph()
        pred_map = {p["road_id"]: p for p in road_predictions}

        for j_id, j_data in JUNCTIONS.items():
            g.add_node(j_id, name=j_data["name"], coords=j_data["coords"], elev=j_data["elev"])

        for r in ROADS:
            p = pred_map.get(r["id"])
            depth = p["predicted_depth_cm"] if p else 0.0
            risk = p["risk_score"] if p else 0
            is_closed = p["is_closed"] if p else False

            # Baseline travel time in seconds: distance / speed
            base_time_sec = r["length_m"] / speed_mps

            g.add_edge(
                r["source"],
                r["target"],
                road_id=r["id"],
                name=r["name"],
                length_m=r["length_m"],
                coords=r["coords"],
                base_time_sec=base_time_sec,
                depth_cm=depth,
                risk_score=risk,
                is_closed=is_closed
            )

        return g

    def calculate_routes(
        self,
        origin_id: str,
        destination_id: str,
        vehicle_type: str = "AMBULANCE",
        t_minutes: int = 60,
        rainfall_scenario_mm: float = 85.0,
        blockage_pct: float = 0.0
    ) -> Dict[str, Any]:
        """Calculates standard shortest route vs FLOOD-X flood-safe route."""
        # Get active flood state
        flood_state = flood_ml_model.predict_all(t_minutes, rainfall_scenario_mm, blockage_pct)

        profile = VEHICLE_PROFILES.get(vehicle_type, VEHICLE_PROFILES["AMBULANCE"])
        wading_limit = profile["wading_depth_limit_cm"]
        risk_penalty = profile["risk_penalty_factor"]
        # Urban monsoon traffic speed (approx 9 km/h = 2.5 m/s)
        speed_mps = max(1.8, (profile["speed_kmh"] * 0.055))

        g = self.build_network_graph(flood_state["roads"], speed_mps)

        # 1. Standard / Normal Shortest Route (distance/time only, blind to flooding)
        try:
            normal_path = nx.shortest_path(g, source=origin_id, target=destination_id, weight="base_time_sec")
            normal_route_info = self._summarize_path(g, normal_path, wading_limit)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            normal_route_info = None

        # 2. Flood-Safe Recommended Route
        # Build safe graph: sever impassable edges (depth >= clearance) and penalize waterlogged roads
        safe_g = g.copy()
        for u, v, data in safe_g.edges(data=True):
            depth = data["depth_cm"]
            # Impassable condition: water exceeds vehicle clearance
            if depth >= wading_limit:
                data["safe_weight"] = 1e8  # effectively impassable / severed
            else:
                depth_penalty = 1.0 + (depth / 10.0) * 1.5
                risk_multiplier = 1.0 + (data["risk_score"] / 100.0) * risk_penalty
                data["safe_weight"] = data["base_time_sec"] * depth_penalty * risk_multiplier

        try:
            safe_path = nx.shortest_path(safe_g, source=origin_id, target=destination_id, weight="safe_weight")
            safe_route_info = self._summarize_path(safe_g, safe_path, wading_limit)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            safe_route_info = None

        # Compare avoided flooded segments
        normal_flooded = normal_route_info.get("flooded_segments_count", 0) if normal_route_info else 0
        safe_flooded = safe_route_info.get("flooded_segments_count", 0) if safe_route_info else 0
        avoided_count = max(0, normal_flooded - safe_flooded)

        return {
            "origin": {"id": origin_id, "name": JUNCTIONS[origin_id]["name"], "coords": JUNCTIONS[origin_id]["coords"]},
            "destination": {"id": destination_id, "name": JUNCTIONS[destination_id]["name"], "coords": JUNCTIONS[destination_id]["coords"]},
            "vehicle_profile": profile,
            "forecast_horizon_min": t_minutes,
            "normal_route": normal_route_info,
            "recommended_route": safe_route_info,
            "summary": {
                "flooded_segments_avoided": avoided_count,
                "is_normal_route_trapped": normal_route_info.get("max_depth_cm", 0) >= wading_limit if normal_route_info else True,
                "recommendation": "Use FLOOD-X recommended route via elevated corridors to bypass critical flood zones."
            }
        }

    def _summarize_path(self, g: nx.Graph, path: List[str], wading_limit: float) -> Dict[str, Any]:
        total_length_m = 0.0
        total_time_sec = 0.0
        max_depth_cm = 0.0
        flooded_segments = 0
        segments = []
        coordinates = []

        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            edge_data = g[u][v]
            total_length_m += edge_data["length_m"]
            total_time_sec += edge_data["base_time_sec"]
            depth = edge_data["depth_cm"]
            if depth > max_depth_cm:
                max_depth_cm = depth
            if depth >= 15.0:
                flooded_segments += 1

            coords = edge_data["coords"]
            # Append coords maintaining direction
            if len(coordinates) == 0:
                coordinates.extend(coords)
            else:
                coordinates.extend(coords[1:])

            segments.append({
                "road_id": edge_data["road_id"],
                "name": edge_data["name"],
                "length_m": edge_data["length_m"],
                "depth_cm": depth,
                "risk_score": edge_data["risk_score"],
                "is_hazard": depth >= wading_limit
            })

        duration_min = round(total_time_sec / 60.0, 1)
        risk_status = "CRITICAL / IMPASSABLE" if max_depth_cm >= wading_limit else ("MODERATE RISK" if max_depth_cm > 12 else "LOW RISK / SAFE")

        return {
            "path_nodes": path,
            "total_distance_km": round(total_length_m / 1000.0, 2),
            "estimated_duration_min": duration_min,
            "max_depth_cm": round(max_depth_cm, 1),
            "flooded_segments_count": flooded_segments,
            "risk_status": risk_status,
            "color": "#ef4444" if max_depth_cm >= wading_limit else "#10b981",
            "segments": segments,
            "coordinates": coordinates
        }

emergency_router = EmergencyRoutingEngine()
