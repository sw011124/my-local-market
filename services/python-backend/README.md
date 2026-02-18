# Python Backend (FastAPI)

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:5433/market'
python -m app.bootstrap
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
pytest
```
