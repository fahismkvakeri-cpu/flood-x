"""SQLite persistence for user-generated FLOOD-X data."""
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DATABASE_PATH = Path(__file__).resolve().parents[1] / "flood_x.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS citizen_reports (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                location_name TEXT NOT NULL,
                water_depth TEXT NOT NULL,
                depth_cm REAL NOT NULL,
                road_status TEXT NOT NULL,
                drain_status TEXT NOT NULL,
                description TEXT NOT NULL,
                photo_url TEXT NOT NULL,
                verified INTEGER NOT NULL DEFAULT 0,
                reporter_type TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS uploads (
                upload_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                status TEXT NOT NULL,
                feature_count INTEGER NOT NULL,
                errors_json TEXT NOT NULL,
                warnings_json TEXT NOT NULL,
                features_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_layers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data_type TEXT NOT NULL,
                source TEXT NOT NULL,
                feature_count INTEGER NOT NULL,
                features_json TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                applied_at TEXT NOT NULL
            );
            """
        )


def insert_report(report: Dict[str, Any]) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO citizen_reports
            (id, timestamp, latitude, longitude, location_name, water_depth, depth_cm,
             road_status, drain_status, description, photo_url, verified, reporter_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report["id"], report["timestamp"], report["location"][0], report["location"][1],
                report["location_name"], report["water_depth"], report["depth_cm"],
                report["road_status"], report["drain_status"], report["description"],
                report["photo_url"], int(report["verified"]), report["reporter_type"],
            ),
        )


def list_reports(verified_only: bool = False) -> List[Dict[str, Any]]:
    query = "SELECT * FROM citizen_reports"
    if verified_only:
        query += " WHERE verified = 1"
    query += " ORDER BY timestamp DESC"
    with get_connection() as connection:
        rows = connection.execute(query).fetchall()
    return [
        {
            "id": row["id"], "timestamp": row["timestamp"],
            "location": [row["latitude"], row["longitude"]],
            "location_name": row["location_name"], "water_depth": row["water_depth"],
            "depth_cm": row["depth_cm"], "road_status": row["road_status"],
            "drain_status": row["drain_status"], "description": row["description"],
            "photo_url": row["photo_url"], "verified": bool(row["verified"]),
            "reporter_type": row["reporter_type"],
        }
        for row in rows
    ]


def save_upload(upload: Dict[str, Any]) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO uploads
            (upload_id, filename, metadata_json, status, feature_count, errors_json,
             warnings_json, features_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                upload["upload_id"], upload["filename"], json.dumps(upload["metadata"]),
                upload["status"], upload["feature_count"], json.dumps(upload["errors"]),
                json.dumps(upload["warnings"]), json.dumps(upload["features"]), upload["created_at"],
            ),
        )


def get_upload(upload_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM uploads WHERE upload_id = ?", (upload_id,)).fetchone()
    if not row:
        return None
    return {
        "upload_id": row["upload_id"], "filename": row["filename"],
        "metadata": json.loads(row["metadata_json"]), "status": row["status"],
        "feature_count": row["feature_count"], "errors": json.loads(row["errors_json"]),
        "warnings": json.loads(row["warnings_json"]), "features": json.loads(row["features_json"]),
        "created_at": row["created_at"],
    }


def save_layer(layer: Dict[str, Any]) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO user_layers
            (id, name, data_type, source, feature_count, features_json, active, applied_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                layer["id"], layer["name"], layer["data_type"], layer["source"],
                layer["feature_count"], json.dumps(layer["features"]), int(layer["active"]),
                layer["applied_at"],
            ),
        )


def list_layers() -> List[Dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM user_layers WHERE active = 1 ORDER BY applied_at DESC").fetchall()
    return [
        {
            "id": row["id"], "name": row["name"], "data_type": row["data_type"],
            "source": row["source"], "feature_count": row["feature_count"],
            "features": json.loads(row["features_json"]), "active": bool(row["active"]),
            "applied_at": row["applied_at"],
        }
        for row in rows
    ]


def deactivate_layer(layer_id: str) -> None:
    with get_connection() as connection:
        connection.execute("UPDATE user_layers SET active = 0 WHERE id = ?", (layer_id,))