from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from flask import current_app
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


@dataclass
class GoogleSheetsClient:
    service: Any
    spreadsheet_id: str

    @classmethod
    def from_env(cls) -> "GoogleSheetsClient":
        creds = Credentials.from_service_account_file(
            current_app.config["GOOGLE_CREDENTIALS_PATH"], scopes=SCOPES
        )
        service = build("sheets", "v4", credentials=creds)

        return cls(service=service, spreadsheet_id=current_app.config["GOOGLE_SHEET_ID"])

    def list_sheet_titles(self) -> list[str]:
        metadata = (
            self.service.spreadsheets()
            .get(spreadsheetId=self.spreadsheet_id)
            .execute()
        )

        sheets = metadata.get("sheets", [])
        return [sheet["properties"]["title"] for sheet in sheets]

    def read_rows(self, sheet_name: str) -> list[list[str]]:
        result = (
            self.service.spreadsheets()
            .values()
            .get(spreadsheetId=self.spreadsheet_id, range=sheet_name)
            .execute()
        )
        return result.get("values", [])

    def append_row(self, sheet_name: str, values: list[str]) -> dict[str, Any]:
        body = {"values": [values]}
        return (
            self.service.spreadsheets()
            .values()
            .append(
                spreadsheetId=self.spreadsheet_id,
                range=sheet_name,
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body=body,
            )
            .execute()
        )
