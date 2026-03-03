import os
from pathlib import Path


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "PASTE_YOUR_SHEET_ID_HERE")
    GOOGLE_CREDENTIALS_PATH = os.getenv(
        "GOOGLE_CREDENTIALS_PATH",
        str(Path(__file__).resolve().parents[1] / "instance" / "credentials.json"),
    )

    REQUIRED_SHEETS = ["Users", "Initiatives", "Mentors", "Events", "Blogs"]
