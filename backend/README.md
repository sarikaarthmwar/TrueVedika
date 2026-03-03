# TrueVedika Flask Backend (Setup Phase 1)

This folder contains the initial Flask backend scaffold and Google Sheets integration for **TrueVedika Social & Wellness Portal**.

## Folder Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── routes/
│   │   └── health.py
│   └── services/
│       └── google_sheets.py
├── instance/
│   └── credentials.json   # you add this file
├── static/
│   ├── css/
│   └── js/
├── templates/
├── .env.example
├── requirements.txt
└── run.py
```

## 1) Install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Add Google credentials

Use a **Google Service Account** with Google Sheets API enabled.

1. Create/download your service account key from Google Cloud Console.
2. Rename the downloaded file to `credentials.json`.
3. Upload/place the file at:

```text
backend/instance/credentials.json
```

4. Share your target Google Sheet with the service account email as an editor.

## 3) Configure environment

```bash
cp .env.example .env
```

Set these values in `.env` (or export them in your shell):

- `GOOGLE_SHEET_ID`: your Google Sheet ID.
- `GOOGLE_CREDENTIALS_PATH`: default is `instance/credentials.json`.

Expected tabs:

- `Users`
- `Initiatives`
- `Mentors`
- `Events`
- `Blogs`

## 4) Run locally

```bash
python run.py
```

Health check endpoint:

```text
GET /api/health
```

This endpoint verifies app startup and attempts a Google Sheets metadata read.

---

## Notes

- This is the initial setup step you requested: Google Sheets client + base Flask structure.
- Next step is implementing auth flow, initiatives CRUD route handlers, mentor/blog endpoints, and admin actions.
