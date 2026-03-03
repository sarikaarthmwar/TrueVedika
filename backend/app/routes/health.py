from flask import Blueprint, jsonify

from ..services.google_sheets import GoogleSheetsClient

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health_check():
    client = GoogleSheetsClient.from_env()
    available_sheets = client.list_sheet_titles()

    return jsonify(
        {
            "status": "ok",
            "message": "TrueVedika Flask backend is running",
            "sheet_connected": bool(available_sheets),
            "available_sheets": available_sheets,
        }
    )
