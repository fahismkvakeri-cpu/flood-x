"""Drainage Graph Engine & Urban Digital Twin.
Models the underground storm-sewer network as a directed hydraulic graph,
computes Manning's flow capacity, identifies pipe surcharging, and handles blockage simulations.
"""
import math
import networkx as nx
from typing import Dict, List, Any
from ..data.pilot_dataset import DRAIN_NODES, DRAIN_EDGES


class DrainageDigitalTwin:
    STORAGE_AREA_M2 = 65000.0
    SIMULATION_INTERVAL_HOURS = 1.0

    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        self.graph.clear()
        for node in DRAIN_NODES:
            self.graph.add_node(
                node["id"],
                name=node["name"],
                coords=node["coords"],
                elevation=node["elevation"],
                capacity_m3s=node["capacity_m3s"],
                type=node["type"]
            )
        for edge in DRAIN_EDGES:
            self.graph.add_edge(
                edge["source"],
                edge["destination"],
                id=edge["id"],
                length_m=edge["length_m"],
                diameter_m=edge["diameter_m"],
                slope=edge["slope"],
                manning_n=edge["manning_n"],
                base_capacity_m3s=edge["capacity_m3s"]
            )

    def simulate(
        self,
        avg_rainfall_mm_hr: float,
        blockage_pct: float = 0.0
    ) -> Dict[str, Any]:
        """Runs the hydraulic flow simulation across the drainage network."""
        # Rational Method for catchment runoff: Q = (C * I * A) / 360
        # Catchment area per node ~ 6.5 hectares for realistic urban storm drain capacity
        catchment_ha = 6.5
        runoff_c = 0.85  # Urban impervious coefficient
        
        node_inflows: Dict[str, float] = {}
        for nid in self.graph.nodes:
            # Baseline incoming surface runoff per node in m3/s
            q_in = (runoff_c * avg_rainfall_mm_hr * catchment_ha) / 360.0
            node_inflows[nid] = q_in

        # Propagate flow through graph along topological order
        edge_results: List[Dict[str, Any]] = []
        node_results: Dict[str, Any] = {}
        surcharged_pipes: List[str] = []
        total_surcharge_volume_m3 = 0.0

        # Effective capacity reduction due to blockage
        # Capacity scales with (1 - blockage)^1.6 based on hydraulic radius reduction
        capacity_factor = max(0.1, (1.0 - (blockage_pct / 100.0)) ** 1.6)

        # Topological traversal for flow accumulation
        try:
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXUnfeasible:
            topo_order = list(self.graph.nodes)

        accumulated_flow: Dict[str, float] = {nid: node_inflows[nid] for nid in self.graph.nodes}
        node_outflow: Dict[str, float] = {nid: 0.0 for nid in self.graph.nodes}
        node_retained_flow: Dict[str, float] = {nid: 0.0 for nid in self.graph.nodes}

        for u in topo_order:
            out_edges = list(self.graph.out_edges(u, data=True))
            if not out_edges:
                if self.graph.nodes[u].get("type") != "tidal_outfall":
                    node_retained_flow[u] += accumulated_flow[u]
                else:
                    node_outflow[u] += accumulated_flow[u]
                continue
            flow_per_edge = accumulated_flow[u] / len(out_edges)
            for _, v, data in out_edges:
                effective_cap = data["base_capacity_m3s"] * capacity_factor
                utilization = round((flow_per_edge / effective_cap) * 100.0, 1)
                is_surcharged = utilization > 100.0
                overflow_m3s = max(0.0, flow_per_edge - effective_cap)

                if is_surcharged:
                    surcharged_pipes.append(data["id"])
                    total_surcharge_volume_m3 += overflow_m3s * 3600.0  # hourly volume

                node_outflow[u] += min(flow_per_edge, effective_cap)
                node_retained_flow[u] += overflow_m3s

                edge_results.append({
                    "pipe_id": data["id"],
                    "source": u,
                    "destination": v,
                    "current_flow_m3s": round(flow_per_edge, 2),
                    "capacity_m3s": round(effective_cap, 2),
                    "utilization_pct": utilization,
                    "status": "SURCHARGED" if is_surcharged else ("CRITICAL" if utilization > 85 else "NORMAL"),
                    "overflow_m3s": round(overflow_m3s, 2),
                    "diameter_m": data["diameter_m"]
                })

                # Route downstream (water that does pass)
                accumulated_flow[v] += min(flow_per_edge, effective_cap)

        for n_id, n_data in self.graph.nodes(data=True):
            # Associated edge surcharge check
            adjacent_surcharged = any(
                e["status"] == "SURCHARGED" for e in edge_results if e["source"] == n_id or e["destination"] == n_id
            )
            total_inflow = accumulated_flow[n_id]
            retained_flow = node_retained_flow[n_id]
            retained_volume = retained_flow * 3600.0 * self.SIMULATION_INTERVAL_HOURS
            estimated_level_cm = min(250.0, (retained_volume / self.STORAGE_AREA_M2) * 100.0)
            local_effectiveness = 100.0 if total_inflow <= 0 else max(
                0.0, min(100.0, (node_outflow[n_id] / total_inflow) * 100.0)
            )
            if retained_flow > 0.0:
                level_status = "WATER_LEVEL_RISING"
            else:
                level_status = "STABLE"
            node_results[n_id] = {
                "id": n_id,
                "name": n_data["name"],
                "coords": n_data["coords"],
                "elevation": n_data["elevation"],
                "inflow_m3s": round(node_inflows[n_id], 2),
                "total_inflow_m3s": round(total_inflow, 2),
                "conveyed_flow_m3s": round(node_outflow[n_id], 2),
                "retained_flow_m3s": round(retained_flow, 2),
                "retained_volume_m3": round(retained_volume, 1),
                "estimated_water_level_cm": round(estimated_level_cm, 1),
                "drainage_effectiveness_pct": round(local_effectiveness, 1),
                "level_status": level_status,
                "is_surcharged": adjacent_surcharged,
                "status": "SURCHARGED" if adjacent_surcharged else level_status
            }

        generated_flow = sum(node_inflows.values())
        retained_volume = sum(node["retained_volume_m3"] for node in node_results.values())
        generated_volume = generated_flow * 3600.0 * self.SIMULATION_INTERVAL_HOURS
        effectiveness = 100.0 if generated_volume <= 0 else max(
            0.0, min(100.0, (1.0 - retained_volume / generated_volume) * 100.0)
        )
        rising_nodes = [node_id for node_id, node in node_results.items() if node["level_status"] == "WATER_LEVEL_RISING"]
        max_level = max((node["estimated_water_level_cm"] for node in node_results.values()), default=0.0)

        return {
            "total_pipes": len(edge_results),
            "surcharged_count": len(surcharged_pipes),
            "surcharged_pipes": surcharged_pipes,
            "blockage_pct": blockage_pct,
            "total_surcharge_volume_m3": round(total_surcharge_volume_m3, 1),
            "generated_runoff_m3": round(generated_volume, 1),
            "retained_floodwater_m3": round(retained_volume, 1),
            "max_estimated_water_level_cm": round(max_level, 1),
            "drainage_effectiveness_pct": round(effectiveness, 1),
            "water_level_rising": bool(rising_nodes),
            "water_level_rising_nodes": rising_nodes,
            "effectiveness_status": "EFFECTIVE" if effectiveness >= 85.0 and not rising_nodes else "UNDER_CAPACITY",
            "pipes": edge_results,
            "nodes": node_results
        }

drainage_twin = DrainageDigitalTwin()
