"""User Location, Citizen Flood Reporting, and Custom Data Upload Pipeline.
Implements Section 27 of the SIH Implementation Blueprint.
"""
import uuid
import json
import csv
import io
import time
from typing import Dict, List, Any, Optional
from ..database import (
    deactivate_layer,
    get_upload,
    initialize_database,
    insert_report,
    list_layers,
    list_reports,
    save_layer,
    save_upload,
)

# Searchable Landmarks in Mumbai Pilot Zone
LANDMARKS = [
    {"name": "Asian Heart Institute", "address": "G Block BKC, Bandra East", "coords": [19.0665, 72.8655], "pin": "400051"},
    {"name": "Kurla Railway Station West", "address": "Station Rd, Kurla West", "coords": [19.0685, 72.8790], "pin": "400070"},
    {"name": "LBS Marg Kurla Junction", "address": "LBS Marg, Kurla West", "coords": [19.0725, 72.8765], "pin": "400070"},
    {"name": "Bail Bazar Emergency Zone", "address": "Bail Bazar, Kurla East", "coords": [19.0805, 72.8845], "pin": "400072"},
    {"name": "Mithi River Causeway", "address": "BKC Connector, Mithi Basin", "coords": [19.0690, 72.8715], "pin": "400051"},
    {"name": "Bhabha Municipal Hospital", "address": "Belgrami Rd, Kurla West", "coords": [19.0640, 72.8805], "pin": "400070"},
    {"name": "Kalina Campus University", "address": "Vidyanagari, Kalina, Santacruz East", "coords": [19.0760, 72.8680], "pin": "400098"},
    {"name": "Kurla Fire Station", "address": "Near Station, Kurla West", "coords": [19.0630, 72.8770], "pin": "400070"}
]

class UploadService:
    def __init__(self):
        initialize_database()
        if not list_reports():
            seed_reports = [
            # Seeded initial verified observation (matching PRD Section 27.3 example)
            {
                "id": "REPORT-001",
                "timestamp": "2026-09-12T14:15:00",
                "location": [19.0720, 72.8760],
                "location_name": "LBS Marg near Kurla Depot",
                "water_depth": "knee",
                "depth_cm": 45.0,
                "road_status": "partially blocked",
                "drain_status": "overflowing",
                "description": "Storm drain overflowing near junction. Water up to knee level (approx 45 cm). Small cars turning back.",
                "photo_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500",
                "verified": True,
                "reporter_type": "Field Officer"
            },
            {
                "id": "REPORT-002",
                "timestamp": "2026-09-12T14:22:00",
                "location": [19.0682, 72.8788],
                "location_name": "Kurla Station West Subway",
                "water_depth": "waist",
                "depth_cm": 70.0,
                "road_status": "closed",
                "drain_status": "blocked",
                "description": "Subway completely flooded, drain manhole blocked by silt. Traffic halted.",
                "photo_url": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500",
                "verified": True,
                "reporter_type": "Citizen"
            }
            ]
            for report in seed_reports:
                insert_report(report)

    # --- User Location (Section 27.1) ---
    def search_locations(self, query: str) -> List[Dict[str, Any]]:
        """Searches locations by name, address, or PIN."""
        q = query.lower().strip()
        if not q:
            return LANDMARKS
        matches = [
            loc for loc in LANDMARKS
            if q in loc["name"].lower() or q in loc["address"].lower() or q in loc.get("pin", "")
        ]
        return matches

    # --- Citizen Flood Reporting (Section 27.3) ---
    def submit_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validates and stores a citizen flood report."""
        report_id = f"REPORT-{uuid.uuid4().hex[:6].upper()}"
        
        # Parse depth text to numeric cm
        depth_val = report_data.get("water_depth", "none")
        if isinstance(depth_val, (int, float)):
            depth_cm = float(depth_val)
        else:
            depth_map = {"none": 0.0, "ankle": 15.0, "knee": 45.0, "waist": 85.0}
            depth_cm = depth_map.get(str(depth_val).lower(), 15.0)

        report = {
            "id": report_id,
            "timestamp": report_data.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%S")),
            "location": report_data.get("location", [19.0680, 72.8720]),
            "location_name": report_data.get("location_name", "Observed Location"),
            "water_depth": depth_val,
            "depth_cm": depth_cm,
            "road_status": report_data.get("road_status", "partially blocked"),
            "drain_status": report_data.get("drain_status", "overflowing"),
            "description": report_data.get("description", "Citizen waterlogging report."),
            "photo_url": report_data.get("photo_url", ""),
            "verified": False,
            "reporter_type": report_data.get("reporter_type", "Citizen")
        }
        insert_report(report)
        return {
            "status": "SUCCESS",
            "message": "Citizen flood report submitted successfully. Pinned to live map layer.",
            "report": report
        }

    def get_reports(self, verified_only: bool = False) -> List[Dict[str, Any]]:
        """Returns verified or all citizen flood reports."""
        if verified_only:
            return list_reports(verified_only=True)
        return list_reports()

    # --- Custom Data Upload Pipeline (Section 27.4 & 27.5) ---
    def process_upload(
        self,
        file_content: str,
        filename: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Stage 1: File type & schema validation and coordinate detection."""
        upload_id = f"UPL-{uuid.uuid4().hex[:8]}"
        is_json = filename.endswith(".json") or filename.endswith(".geojson")
        is_csv = filename.endswith(".csv")

        parsed_features = []
        errors = []
        warnings = []

        if is_json:
            try:
                data = json.loads(file_content)
                if "features" in data:
                    for feat in data["features"]:
                        geom = feat.get("geometry", {})
                        props = feat.get("properties", {})
                        coords = geom.get("coordinates", [])
                        parsed_features.append({
                            "type": geom.get("type"),
                            "coordinates": coords,
                            "properties": props
                        })
                else:
                    parsed_features.append({"type": "raw_json", "data": data})
            except Exception as e:
                errors.append(f"Invalid JSON/GeoJSON syntax: {str(e)}")
        elif is_csv:
            try:
                reader = csv.DictReader(io.StringIO(file_content))
                for row in reader:
                    lat = float(row.get("lat") or row.get("latitude") or 0.0)
                    lon = float(row.get("lon") or row.get("longitude") or 0.0)
                    if lat and lon:
                        parsed_features.append({
                            "type": "Point",
                            "coordinates": [lat, lon],
                            "properties": dict(row)
                        })
                    else:
                        warnings.append(f"Row without lat/lon: {dict(row)}")
            except Exception as e:
                errors.append(f"Invalid CSV structure: {str(e)}")
        else:
            errors.append("Unsupported format. Please upload CSV or GeoJSON.")

        # Coordinate range sanity checks (Mumbai pilot vicinity)
        out_of_bounds = 0
        for f in parsed_features:
            coords = f.get("coordinates")
            if isinstance(coords, list) and len(coords) >= 2:
                lat, lon = coords[0], coords[1]
                if not (18.5 <= lat <= 19.5 and 72.5 <= lon <= 73.5):
                    out_of_bounds += 1

        if out_of_bounds > 0:
            warnings.append(f"{out_of_bounds} features have coordinates outside pilot bounds (EPSG:4326 assumed).")

        status = "REJECTED" if errors else ("WARNING" if warnings else "VALID")

        upload_entry = {
            "upload_id": upload_id,
            "filename": filename,
            "metadata": metadata,
            "status": status,
            "feature_count": len(parsed_features),
            "errors": errors,
            "warnings": warnings,
            "features": parsed_features,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        save_upload(upload_entry)

        return {
            "upload_id": upload_id,
            "filename": filename,
            "status": status,
            "feature_count": len(parsed_features),
            "errors": errors,
            "warnings": warnings,
            "dataset_name": metadata.get("dataset_name", filename)
        }

    def get_upload_preview(self, upload_id: str) -> Dict[str, Any]:
        """Stage 2: Preview uploaded dataset."""
        upl = get_upload(upload_id)
        if not upl:
            return {"error": f"Upload {upload_id} not found"}
        return {
            "upload_id": upl["upload_id"],
            "filename": upl["filename"],
            "metadata": upl["metadata"],
            "feature_count": upl["feature_count"],
            "preview_items": upl["features"][:10],
            "warnings": upl["warnings"]
        }

    def apply_upload(self, upload_id: str) -> Dict[str, Any]:
        """Stage 3: Approve and inject valid dataset into active user layers."""
        upl = get_upload(upload_id)
        if not upl:
            return {"error": f"Upload {upload_id} not found"}
        
        layer = {
            "id": f"LAYER-{upload_id}",
            "name": upl["metadata"].get("dataset_name", upl["filename"]),
            "data_type": upl["metadata"].get("data_type", "drainage"),
            "source": upl["metadata"].get("source", "User Upload"),
            "feature_count": upl["feature_count"],
            "features": upl["features"],
            "active": True,
            "applied_at": time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        save_layer(layer)
        return {
            "status": "APPLIED",
            "message": f"Dataset '{layer['name']}' successfully applied to FLOOD-X digital twin.",
            "layer_id": layer["id"],
            "feature_count": layer["feature_count"]
        }

    def get_user_layers(self) -> List[Dict[str, Any]]:
        """Returns all active user-uploaded layers."""
        return list_layers()

    def delete_user_layer(self, layer_id: str) -> Dict[str, Any]:
        """Removes an uploaded custom layer."""
        deactivate_layer(layer_id)
        return {"status": "DELETED", "layer_id": layer_id}

upload_service = UploadService()
