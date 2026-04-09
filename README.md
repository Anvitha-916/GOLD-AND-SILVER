# Commodity Price Predictor

A full-stack commodity price dashboard built around your `commodity_models.pkl` file.

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

## Notes

- The backend loads models from `C:\Users\windows\Downloads\commodity_models.pkl`.
- The pickle appears to contain multiple commodities, each with market-specific linear regression models.
- The active API contract is:
  - `GET /options` for available commodities and markets
  - `GET /predict?commodity=Gold&market=USA_USD_per_10g&year=2027`
