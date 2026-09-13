"""ISRO Bhuvan-style flood-hazard context layers for the SIH prototype.

Official Bhuvan WMS/GIS layers require licensed access and cannot be scraped.
These polygons encode documented high-susceptibility urban basins (Mithi/Kurla
and other Indian flood-prone clusters) so the model can use flood-hazard as a
prior, matching blueprint section 19.6. Replace with live Bhuvan WMS when
credentials are available.
"""
from typing import Any, Dict, List

BHUVAN_WMS_URL = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"

BHUVAN_HAZARD_ZONES: List[Dict[str, Any]] = [
    {
        "id": "BHUVAN-MITHI",
        "name": "Mithi River floodplain (Bhuvan flood-hazard context)",
        "hazard_class": "Very High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [19.0675, 72.8680],
            [19.0715, 72.8700],
            [19.0725, 72.8750],
            [19.0680, 72.8770],
            [19.0650, 72.8730],
            [19.0675, 72.8680],
        ],
    },
    {
        "id": "BHUVAN-KURLA",
        "name": "Kurla West drainage basin",
        "hazard_class": "High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [19.0660, 72.8750],
            [19.0735, 72.8755],
            [19.0760, 72.8810],
            [19.0700, 72.8840],
            [19.0660, 72.8800],
            [19.0660, 72.8750],
        ],
    },
    {
        "id": "BHUVAN-BAIL",
        "name": "Bail Bazar low-lying settlement",
        "hazard_class": "High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [19.0775, 72.8810],
            [19.0825, 72.8815],
            [19.0830, 72.8870],
            [19.0780, 72.8880],
            [19.0775, 72.8810],
        ],
    },
    {
        "id": "BHUVAN-BKC",
        "name": "BKC / Kalina ridge (lower susceptibility)",
        "hazard_class": "Moderate",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [19.0620, 72.8560],
            [19.0680, 72.8580],
            [19.0705, 72.8665],
            [19.0660, 72.8695],
            [19.0615, 72.8630],
            [19.0620, 72.8560],
        ],
    },
    {
        "id": "BHUVAN-KOLKATA",
        "name": "Hooghly-side urban flood susceptibility",
        "hazard_class": "High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [22.5200, 88.3000],
            [22.6000, 88.3000],
            [22.6000, 88.4200],
            [22.5200, 88.4200],
            [22.5200, 88.3000],
        ],
    },
    {
        "id": "BHUVAN-CHENNAI",
        "name": "Adyar–Cooum floodplain susceptibility",
        "hazard_class": "High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [13.0000, 80.1800],
            [13.1200, 80.1800],
            [13.1200, 80.3200],
            [13.0000, 80.3200],
            [13.0000, 80.1800],
        ],
    },
    {
        "id": "BHUVAN-GUWAHATI",
        "name": "Brahmaputra urban flood susceptibility",
        "hazard_class": "Very High",
        "source": "ISRO Bhuvan flood-hazard context (prototype)",
        "coordinates": [
            [26.1000, 91.6500],
            [26.2000, 91.6500],
            [26.2000, 91.8200],
            [26.1000, 91.8200],
            [26.1000, 91.6500],
        ],
    },
]

HAZARD_PRIOR = {
    "Very High": 0.08,
    "High": 0.05,
    "Moderate": 0.02,
    "Low": 0.0,
}


def _point_in_ring(lat: float, lon: float, ring: List[List[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, (ilat, ilon) in enumerate(ring):
        jlat, jlon = ring[j]
        intersects = ((ilat > lat) != (jlat > lat)) and (
            lon < (jlon - ilon) * (lat - ilat) / ((jlat - ilat) or 1e-12) + ilon
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def classify_point(lat: float, lon: float) -> Dict[str, Any]:
    """Return the highest flood-hazard class containing a coordinate."""
    matched = None
    rank = {"Low": 0, "Moderate": 1, "High": 2, "Very High": 3}
    for zone in BHUVAN_HAZARD_ZONES:
        if _point_in_ring(lat, lon, zone["coordinates"]):
            if matched is None or rank[zone["hazard_class"]] > rank[matched["hazard_class"]]:
                matched = zone
    if not matched:
        return {
            "hazard_class": "Low",
            "zone_id": None,
            "zone_name": "Outside mapped Bhuvan flood-hazard polygons",
            "prior_boost": 0.0,
        }
    return {
        "hazard_class": matched["hazard_class"],
        "zone_id": matched["id"],
        "zone_name": matched["name"],
        "prior_boost": HAZARD_PRIOR.get(matched["hazard_class"], 0.0),
    }


def as_geojson() -> Dict[str, Any]:
    features = []
    colors = {"Very High": "#7f1d1d", "High": "#dc2626", "Moderate": "#f59e0b", "Low": "#22c55e"}
    for zone in BHUVAN_HAZARD_ZONES:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[c[1], c[0]] for c in zone["coordinates"]]],
            },
            "properties": {
                "id": zone["id"],
                "name": zone["name"],
                "hazard_class": zone["hazard_class"],
                "source": zone["source"],
                "color": colors.get(zone["hazard_class"], "#64748b"),
            },
        })
    return {
        "type": "FeatureCollection",
        "source": "ISRO Bhuvan flood-hazard context (SIH prototype polygons)",
        "wms_url": BHUVAN_WMS_URL,
        "note": "Supporting susceptibility layer, not official ground truth. Swap in licensed Bhuvan WMS for operations.",
        "features": features,
        "zones": BHUVAN_HAZARD_ZONES,
    }
