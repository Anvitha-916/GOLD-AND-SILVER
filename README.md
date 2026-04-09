# Commodity Price Predictor

A full-stack commodity price dashboard built around serialized commodity model files.

## Stack

- Frontend: Vite + React + Recharts
- Backend: FastAPI + scikit-learn model loading
- Data source: serialized commodity model catalog

## Project Structure

```text
backend/
  main.py
  requirements.txt
frontend/
  package.json
  vite.config.js
  index.html
  src/
    main.jsx
    App.jsx
    styles.css
```

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

Endpoints:

- `GET /`
- `GET /health`
- `GET /options`
- `GET /predict`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173`.

Set `VITE_API_BASE_URL` if your frontend should call a non-local backend.

Example:

```bash
cd frontend
echo VITE_API_BASE_URL=http://127.0.0.1:8000 > .env
npm run dev
```

## Railway Deployment

This repository should be deployed to Railway as two separate services from the same GitHub repository:

1. A `backend` service with root directory `/backend`
2. A `frontend` service with root directory `/frontend`

Railway's monorepo docs recommend setting a root directory per service for isolated repos like this one, and note that config files can be set by absolute path such as `/backend/railway.json` and `/frontend/railway.json`.

### Backend service

- Connect this GitHub repository to a Railway service
- Set the service root directory to `/backend`
- Set the config-as-code path to `/backend/railway.json`
- Generate a public domain
- Add these variables:

```text
MODEL_PATH=/app/backend/commodity_models.pkl
MAPS_DATA_PATH=/app/backend/plot_maps_data.pkl
```

Important:

- The backend will not start on Railway unless `commodity_models.pkl` and `plot_maps_data.pkl` are available inside the deployed service.
- Right now those files are not in this repository, so you must either:
  - add them into `backend/`, or
  - change `MODEL_PATH` and `MAPS_DATA_PATH` to wherever you place them in the Railway container or attached volume

### Frontend service

- Connect the same GitHub repository to a second Railway service
- Set the service root directory to `/frontend`
- Set the config-as-code path to `/frontend/railway.json`
- Generate a public domain
- Add this variable:

```text
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN.up.railway.app
```

Replace the URL with the real backend Railway domain after the backend service is live.

## Railway Notes

- Railway says isolated monorepos should use a root directory per service.
- Railway uses Railpack by default for builds.
- Railway public services should listen on `0.0.0.0:$PORT`.

## Notes

- The pickle appears to contain multiple commodities, each with market-specific linear regression models.
- The active API contract is:
  - `GET /options` for available commodities and markets
  - `GET /predict?commodity=Gold&market=USA_USD_per_10g&year=2027`
  - `GET /global-stats/options`
  - `GET /global-stats?category=Gold`
