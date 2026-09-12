"""Pilot GIS dataset for the 10 km² Kurla/BKC Mumbai flood-prone basin."""
from typing import Dict, List, Any

# Prominent junctions and landmarks in Kurla - BKC Basin
JUNCTIONS = {
    "J_BKC_GATE": {"id": "J_BKC_GATE", "name": "BKC Western Gateway", "coords": [19.0645, 72.8560], "elev": 7.5},
    "J_ASIAN_HEART": {"id": "J_ASIAN_HEART", "name": "Asian Heart Hospital (BKC)", "coords": [19.0665, 72.8655], "elev": 6.8},
    "J_BKC_CONNECTOR": {"id": "J_BKC_CONNECTOR", "name": "BKC-Chunabhatti Connector", "coords": [19.0610, 72.8710], "elev": 6.2},
    "J_MITHI_BRIDGE": {"id": "J_MITHI_BRIDGE", "name": "Mithi River Causey Bridge", "coords": [19.0690, 72.8715], "elev": 2.9},
    "J_LBS_KURLA_W": {"id": "J_LBS_KURLA_W", "name": "LBS Marg - Kurla West Jn", "coords": [19.0725, 72.8765], "elev": 3.1},
    "J_KURLA_STN": {"id": "J_KURLA_STN", "name": "Kurla Railway Station West", "coords": [19.0685, 72.8790], "elev": 2.7},
    "J_BHABHA_HOSP": {"id": "J_BHABHA_HOSP", "name": "Bhabha Municipal Hospital", "coords": [19.0640, 72.8805], "elev": 4.5},
    "J_CST_RD_KALINA": {"id": "J_CST_RD_KALINA", "name": "CST Road - Kalina Junction", "coords": [19.0750, 72.8640], "elev": 10.2},
    "J_SCLR_KALINA": {"id": "J_SCLR_KALINA", "name": "SCLR Kalina Interchange", "coords": [19.0775, 72.8730], "elev": 11.5},
    "J_SCLR_KURLA_E": {"id": "J_SCLR_KURLA_E", "name": "SCLR Kurla East Flyover Jn", "coords": [19.0735, 72.8875], "elev": 12.0},
    "J_BAIL_BAZAR": {"id": "J_BAIL_BAZAR", "name": "Bail Bazar Emergency Zone", "coords": [19.0805, 72.8845], "elev": 3.4},
    "J_KURLA_DEPOT": {"id": "J_KURLA_DEPOT", "name": "Kurla BEST Bus Depot", "coords": [19.0605, 72.8860], "elev": 4.1},
    "J_FIRE_KURLA": {"id": "J_FIRE_KURLA", "name": "Kurla Fire & Rescue Station", "coords": [19.0630, 72.8770], "elev": 4.2}
}

# Road Network segments connecting junctions
ROADS: List[Dict[str, Any]] = [
    {
        "id": "ROAD-101",
        "name": "LBS Marg (Kurla West to Mithi Bridge)",
        "source": "J_LBS_KURLA_W",
        "target": "J_MITHI_BRIDGE",
        "coords": [[19.0725, 72.8765], [19.0705, 72.8740], [19.0690, 72.8715]],
        "length_m": 680,
        "road_type": "arterial",
        "baseline_elevation": 2.9,
        "slope": 0.003,
        "imperviousness": 0.88,
        "flow_accumulation": 8400,
        "historical_flood_freq": 0.92,
        "drain_id": "PIPE-102"
    },
    {
        "id": "ROAD-102",
        "name": "Kurla Station Approach Road",
        "source": "J_KURLA_STN",
        "target": "J_LBS_KURLA_W",
        "coords": [[19.0685, 72.8790], [19.0710, 72.8778], [19.0725, 72.8765]],
        "length_m": 520,
        "road_type": "collector",
        "baseline_elevation": 2.7,
        "slope": 0.002,
        "imperviousness": 0.92,
        "flow_accumulation": 9200,
        "historical_flood_freq": 0.95,
        "drain_id": "PIPE-103"
    },
    {
        "id": "ROAD-103",
        "name": "Bhabha Hospital Access Road",
        "source": "J_KURLA_STN",
        "target": "J_BHABHA_HOSP",
        "coords": [[19.0685, 72.8790], [19.0660, 72.8800], [19.0640, 72.8805]],
        "length_m": 580,
        "road_type": "collector",
        "baseline_elevation": 3.8,
        "slope": 0.006,
        "imperviousness": 0.82,
        "flow_accumulation": 4100,
        "historical_flood_freq": 0.65,
        "drain_id": "PIPE-104"
    },
    {
        "id": "ROAD-104",
        "name": "CST Road (Kurla West to Kalina)",
        "source": "J_LBS_KURLA_W",
        "target": "J_CST_RD_KALINA",
        "coords": [[19.0725, 72.8765], [19.0740, 72.8700], [19.0750, 72.8640]],
        "length_m": 1380,
        "road_type": "arterial",
        "baseline_elevation": 6.5,
        "slope": 0.012,
        "imperviousness": 0.80,
        "flow_accumulation": 3200,
        "historical_flood_freq": 0.40,
        "drain_id": "PIPE-105"
    },
    {
        "id": "ROAD-105",
        "name": "BKC Main Avenue (Gateway to Asian Heart)",
        "source": "J_BKC_GATE",
        "target": "J_ASIAN_HEART",
        "coords": [[19.0645, 72.8560], [19.0655, 72.8610], [19.0665, 72.8655]],
        "length_m": 1050,
        "road_type": "arterial",
        "baseline_elevation": 7.2,
        "slope": 0.005,
        "imperviousness": 0.85,
        "flow_accumulation": 2100,
        "historical_flood_freq": 0.20,
        "drain_id": "PIPE-106"
    },
    {
        "id": "ROAD-106",
        "name": "Mithi Causeway Link (Asian Heart to Mithi Bridge)",
        "source": "J_ASIAN_HEART",
        "target": "J_MITHI_BRIDGE",
        "coords": [[19.0665, 72.8655], [19.0678, 72.8685], [19.0690, 72.8715]],
        "length_m": 720,
        "road_type": "arterial",
        "baseline_elevation": 3.8,
        "slope": 0.008,
        "imperviousness": 0.84,
        "flow_accumulation": 6700,
        "historical_flood_freq": 0.78,
        "drain_id": "PIPE-101"
    },
    {
        "id": "ROAD-107",
        "name": "SCLR Elevated Express Corridor",
        "source": "J_SCLR_KALINA",
        "target": "J_SCLR_KURLA_E",
        "coords": [[19.0775, 72.8730], [19.0755, 72.8800], [19.0735, 72.8875]],
        "length_m": 1620,
        "road_type": "expressway",
        "baseline_elevation": 11.8,
        "slope": 0.004,
        "imperviousness": 0.95,
        "flow_accumulation": 850,
        "historical_flood_freq": 0.05,
        "drain_id": "PIPE-107"
    },
    {
        "id": "ROAD-108",
        "name": "Kalina Connector (CST Road to SCLR)",
        "source": "J_CST_RD_KALINA",
        "target": "J_SCLR_KALINA",
        "coords": [[19.0750, 72.8640], [19.0765, 72.8685], [19.0775, 72.8730]],
        "length_m": 1010,
        "road_type": "collector",
        "baseline_elevation": 10.8,
        "slope": 0.009,
        "imperviousness": 0.75,
        "flow_accumulation": 1200,
        "historical_flood_freq": 0.15,
        "drain_id": "PIPE-108"
    },
    {
        "id": "ROAD-109",
        "name": "Kurla East Link (SCLR to Bail Bazar)",
        "source": "J_SCLR_KURLA_E",
        "target": "J_BAIL_BAZAR",
        "coords": [[19.0735, 72.8875], [19.0770, 72.8860], [19.0805, 72.8845]],
        "length_m": 920,
        "road_type": "collector",
        "baseline_elevation": 5.8,
        "slope": 0.015,
        "imperviousness": 0.82,
        "flow_accumulation": 4800,
        "historical_flood_freq": 0.60,
        "drain_id": "PIPE-109"
    },
    {
        "id": "ROAD-110",
        "name": "Bail Bazar Low-line Road",
        "source": "J_LBS_KURLA_W",
        "target": "J_BAIL_BAZAR",
        "coords": [[19.0725, 72.8765], [19.0765, 72.8810], [19.0805, 72.8845]],
        "length_m": 1250,
        "road_type": "arterial",
        "baseline_elevation": 3.4,
        "slope": 0.003,
        "imperviousness": 0.89,
        "flow_accumulation": 8100,
        "historical_flood_freq": 0.89,
        "drain_id": "PIPE-110"
    },
    {
        "id": "ROAD-111",
        "name": "Fire Station Rapid Access Road",
        "source": "J_FIRE_KURLA",
        "target": "J_KURLA_STN",
        "coords": [[19.0630, 72.8770], [19.0655, 72.8780], [19.0685, 72.8790]],
        "length_m": 640,
        "road_type": "collector",
        "baseline_elevation": 3.9,
        "slope": 0.007,
        "imperviousness": 0.84,
        "flow_accumulation": 4900,
        "historical_flood_freq": 0.70,
        "drain_id": "PIPE-104"
    },
    {
        "id": "ROAD-112",
        "name": "BKC-Chunabhatti Direct Arterial",
        "source": "J_BKC_CONNECTOR",
        "target": "J_ASIAN_HEART",
        "coords": [[19.0610, 72.8710], [19.0640, 72.8680], [19.0665, 72.8655]],
        "length_m": 880,
        "road_type": "arterial",
        "baseline_elevation": 6.8,
        "slope": 0.006,
        "imperviousness": 0.86,
        "flow_accumulation": 1800,
        "historical_flood_freq": 0.18,
        "drain_id": "PIPE-106"
    },
    {
        "id": "ROAD-113",
        "name": "BKC-Kalina High Ridge Connector",
        "source": "J_ASIAN_HEART",
        "target": "J_CST_RD_KALINA",
        "coords": [[19.0665, 72.8655], [19.0710, 72.8645], [19.0750, 72.8640]],
        "length_m": 1280,
        "road_type": "arterial",
        "baseline_elevation": 9.2,
        "slope": 0.011,
        "imperviousness": 0.78,
        "flow_accumulation": 1100,
        "historical_flood_freq": 0.12,
        "drain_id": "PIPE-105"
    }
]

# Drainage Network: Manholes / Inlets (Nodes)
DRAIN_NODES = [
    {"id": "MH-101", "name": "Inlet Mithi North", "coords": [19.0700, 72.8725], "elevation": 2.8, "capacity_m3s": 3.8, "type": "outfall"},
    {"id": "MH-102", "name": "Manhole Kurla West Main", "coords": [19.0720, 72.8760], "elevation": 3.0, "capacity_m3s": 2.5, "type": "junction"},
    {"id": "MH-103", "name": "Inlet Kurla Station Basin", "coords": [19.0682, 72.8788], "elevation": 2.6, "capacity_m3s": 2.2, "type": "inlet"},
    {"id": "MH-104", "name": "Manhole Bhabha Bypass", "coords": [19.0645, 72.8800], "elevation": 4.1, "capacity_m3s": 2.4, "type": "junction"},
    {"id": "MH-105", "name": "Manhole CST Kalina Trunk", "coords": [19.0745, 72.8650], "elevation": 9.5, "capacity_m3s": 4.5, "type": "junction"},
    {"id": "MH-106", "name": "Manhole BKC Central Drain", "coords": [19.0650, 72.8630], "elevation": 6.9, "capacity_m3s": 5.2, "type": "junction"},
    {"id": "MH-107", "name": "Manhole SCLR Storm Conduit", "coords": [19.0760, 72.8780], "elevation": 11.2, "capacity_m3s": 6.0, "type": "junction"},
    {"id": "MH-108", "name": "Inlet Bail Bazar Sump", "coords": [19.0800, 72.8840], "elevation": 3.3, "capacity_m3s": 2.6, "type": "inlet"},
    {"id": "MH-OUTFALL", "name": "Mithi River Tidal Outfall Gates", "coords": [19.0675, 72.8700], "elevation": 1.5, "capacity_m3s": 14.0, "type": "tidal_outfall"}
]

# Drainage Network: Pipes & Canals (Edges)
DRAIN_EDGES = [
    {
        "id": "PIPE-101",
        "source": "MH-106",
        "destination": "MH-101",
        "length_m": 1100,
        "diameter_m": 1.8,
        "slope": 0.0035,
        "manning_n": 0.015,
        "capacity_m3s": 4.5
    },
    {
        "id": "PIPE-102",
        "source": "MH-102",
        "destination": "MH-101",
        "length_m": 580,
        "diameter_m": 1.4,
        "slope": 0.0025,
        "manning_n": 0.016,
        "capacity_m3s": 2.6
    },
    {
        "id": "PIPE-103",
        "source": "MH-103",
        "destination": "MH-102",
        "length_m": 490,
        "diameter_m": 1.2,
        "slope": 0.0020,
        "manning_n": 0.017,
        "capacity_m3s": 1.9
    },
    {
        "id": "PIPE-104",
        "source": "MH-104",
        "destination": "MH-103",
        "length_m": 520,
        "diameter_m": 1.3,
        "slope": 0.0030,
        "manning_n": 0.015,
        "capacity_m3s": 2.3
    },
    {
        "id": "PIPE-105",
        "source": "MH-105",
        "destination": "MH-102",
        "length_m": 1250,
        "diameter_m": 1.6,
        "slope": 0.0060,
        "manning_n": 0.014,
        "capacity_m3s": 4.2
    },
    {
        "id": "PIPE-107",
        "source": "MH-107",
        "destination": "MH-105",
        "length_m": 1400,
        "diameter_m": 2.0,
        "slope": 0.0050,
        "manning_n": 0.014,
        "capacity_m3s": 5.8
    },
    {
        "id": "PIPE-110",
        "source": "MH-108",
        "destination": "MH-102",
        "length_m": 1100,
        "diameter_m": 1.4,
        "slope": 0.0022,
        "manning_n": 0.016,
        "capacity_m3s": 2.4
    },
    {
        "id": "PIPE-MAIN-OUTFALL",
        "source": "MH-101",
        "destination": "MH-OUTFALL",
        "length_m": 350,
        "diameter_m": 2.8,
        "slope": 0.0038,
        "manning_n": 0.013,
        "capacity_m3s": 12.5
    }
]

# Digital Elevation Model (DEM) reference points for pilot terrain visualization
DEM_CONTOURS = [
    {"name": "Mithi Depression Basin", "center": [19.0695, 72.8740], "elevation_m": 2.5, "radius_m": 500},
    {"name": "Kurla Station Low Sump", "center": [19.0685, 72.8790], "elevation_m": 2.4, "radius_m": 400},
    {"name": "Bail Bazar Basin", "center": [19.0805, 72.8845], "elevation_m": 3.2, "radius_m": 450},
    {"name": "BKC Commercial Plain", "center": [19.0650, 72.8620], "elevation_m": 7.2, "radius_m": 750},
    {"name": "Kalina Elevated Ridge", "center": [19.0760, 72.8680], "elevation_m": 11.5, "radius_m": 600}
]
