# Backend Python (FastAPI)

## Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

## Endpoints
- `GET /health`
- `POST /previsions/saisonniere`
- `POST /previsions/court-terme`
- `POST /previsions/chirps`
- `POST /previsions/cds`

## Notes
- Earth Engine key/credentials loaded from `.env`.
- CHIRPS + CDS connectors are scaffolded with stubs and can be replaced by full production ingestion logic.
