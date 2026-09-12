"""WorldPop Population Exposure Engine for FLOOD-X.
Implements Section 19.7:
  exposed_population = sum(population_cells intersecting predicted_flood_zone)
  priority = flood_risk * exposed_population_factor
"""
import math
from typing import Dict, List, Any
from ..config import WORLDPOP_PILOT_GRID, PILOT_ZONE

class ExposureEngine:
    def __init__(self):
        self.cells = WORLDPOP_PILOT_GRID

    def calculate_exposure(self, road_predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates total and cell-level population exposed to predicted inundation."""
        total_pilot_population = PILOT_ZONE.get("total_population", 185000)
        total_exposed_population = 0
        cell_breakdowns = []

        # Find maximum risk in vicinity of each population grid cell
        for cell in self.cells:
            c_lat, c_lon = cell["coords"]
            # Find closest road segments within ~600m
            nearby_risks = []
            nearby_depths = []
            for r in road_predictions:
                coords = r["coords"]
                mid = coords[len(coords) // 2]
                dist_km = math.sqrt((mid[0] - c_lat)**2 + (mid[1] - c_lon)**2) * 111.0
                if dist_km <= 0.8:
                    nearby_risks.append(r["risk_score_norm"])
                    nearby_depths.append(r["predicted_depth_cm"])

            cell_max_risk = max(nearby_risks, default=0.1)
            cell_max_depth = max(nearby_depths, default=0.0)

            # Inundation exposure ratio: cells with risk > 0.40 experience active displacement
            if cell_max_depth >= 15.0 or cell_max_risk >= 0.40:
                inundation_factor = min(1.0, (cell_max_depth / 50.0) * 0.7 + (cell_max_risk * 0.4))
                cell_exposed = int(round(cell["population"] * inundation_factor))
            else:
                cell_exposed = 0

            # Priority calculation: priority = flood_risk * exposed_population_factor
            pop_factor = cell["population"] / 10000.0  # normalized scale
            priority_score = round(cell_max_risk * pop_factor, 2)
            
            if priority_score > 2.5:
                priority_level = "CRITICAL EVACUATION"
            elif priority_score > 1.2:
                priority_level = "HIGH PRIORITY"
            elif priority_score > 0.5:
                priority_level = "WATCH"
            else:
                priority_level = "NORMAL"

            total_exposed_population += cell_exposed
            cell_breakdowns.append({
                "cell_id": cell["cell_id"],
                "name": cell["name"],
                "coords": cell["coords"],
                "total_population": cell["population"],
                "exposed_population": cell_exposed,
                "exposure_percentage": round((cell_exposed / cell["population"]) * 100.0, 1),
                "max_predicted_depth_cm": cell_max_depth,
                "flood_risk_norm": cell_max_risk,
                "priority_score": priority_score,
                "priority_level": priority_level
            })

        overall_pct = round((total_exposed_population / total_pilot_population) * 100.0, 1)

        return {
            "source": "WorldPop 100m High-Resolution Population Density Layer (Section 19.7)",
            "total_pilot_population": total_pilot_population,
            "total_exposed_population": total_exposed_population,
            "exposure_percentage": overall_pct,
            "high_risk_wards_count": sum(1 for c in cell_breakdowns if c["exposed_population"] > 5000),
            "evacuation_priority": "CRITICAL" if total_exposed_population > 40000 else ("HIGH" if total_exposed_population > 15000 else "ELEVATED"),
            "population_cells": cell_breakdowns
        }

exposure_engine = ExposureEngine()
