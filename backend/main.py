from __future__ import annotations

from datetime import datetime
from functools import lru_cache
import os
from pathlib import Path
import pickle

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "commodity_models.pkl"))
MAPS_DATA_PATH = Path(os.getenv("MAPS_DATA_PATH", BASE_DIR / "plot_maps_data.pkl"))

app = FastAPI(title="Commodity Price Prediction API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def load_model_catalog() -> dict:
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail="Commodity model file not found.")

    try:
        with MODEL_PATH.open("rb") as model_file:
            catalog = pickle.load(model_file)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load commodity models: {exc}") from exc

    if not isinstance(catalog, dict) or not catalog:
        raise HTTPException(status_code=500, detail="Commodity model catalog is empty or invalid.")

    return catalog


@lru_cache(maxsize=1)
def load_global_stats_catalog() -> dict:
    if not MAPS_DATA_PATH.exists():
        raise HTTPException(status_code=500, detail="Global stats file not found.")

    try:
        with MAPS_DATA_PATH.open("rb") as stats_file:
            catalog = pickle.load(stats_file)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load global stats: {exc}") from exc

    if not isinstance(catalog, dict) or not catalog:
        raise HTTPException(status_code=500, detail="Global stats catalog is empty or invalid.")

    return catalog


def normalize_lookup(value: str) -> str:
    return value.strip().lower()


def get_available_options() -> dict[str, list[str]]:
    catalog = load_model_catalog()
    commodities = sorted(catalog.keys())
    markets = sorted({market for models in catalog.values() if isinstance(models, dict) for market in models})
    return {"commodities": commodities, "markets": markets}


def get_model(commodity: str, market: str):
    catalog = load_model_catalog()

    commodity_match = next(
        (name for name in catalog.keys() if normalize_lookup(name) == normalize_lookup(commodity)),
        None,
    )
    if commodity_match is None:
        raise HTTPException(status_code=400, detail=f"Unsupported commodity '{commodity}'.")

    commodity_models = catalog[commodity_match]
    if not isinstance(commodity_models, dict):
        raise HTTPException(status_code=500, detail="Commodity entry is malformed.")

    market_match = next(
        (name for name in commodity_models.keys() if normalize_lookup(name) == normalize_lookup(market)),
        None,
    )
    if market_match is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported market '{market}' for {commodity_match}.",
        )

    return commodity_match, market_match, commodity_models[market_match]


def predict_price(model, year: int) -> float:
    try:
        prediction = model.predict([[year]])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    if not len(prediction):
        raise HTTPException(status_code=500, detail="Model returned no prediction.")

    return round(float(prediction[0]), 2)


def parse_market_label(market: str) -> tuple[str, str]:
    parts = market.split("_", 2)
    if len(parts) == 3:
        return parts[0], parts[1]
    return market, ""


def get_stats_key(category: str, suffix: str) -> str:
    return f"{normalize_lookup(category)}_{suffix}"


def build_stats_rows(values: dict) -> list[dict[str, int | str]]:
    rows = [{"name": key, "value": int(value)} for key, value in values.items()]
    return sorted(rows, key=lambda item: int(item["value"]), reverse=True)


@app.get("/")
def root() -> dict:
    return {
        "name": "Commodity Price Prediction API",
        "endpoints": ["/health", "/options", "/predict", "/global-stats", "/global-stats/options"],
    }


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/options")
def options() -> dict[str, list[str]]:
    return get_available_options()


@app.get("/global-stats/options")
def global_stats_options() -> dict[str, list[str]]:
    catalog = load_global_stats_catalog()
    categories = sorted(
        {
            key.replace("_prod", "").replace("_use", "")
            for key in catalog.keys()
            if key.endswith("_prod") or key.endswith("_use")
        }
    )
    return {"categories": [category.title() for category in categories]}


@app.get("/global-stats")
def global_stats(category: str = "Gold") -> dict:
    catalog = load_global_stats_catalog()
    prod_key = get_stats_key(category, "prod")
    use_key = get_stats_key(category, "use")

    if prod_key not in catalog or use_key not in catalog:
        raise HTTPException(status_code=400, detail=f"Unsupported stats category '{category}'.")

    producers = build_stats_rows(catalog[prod_key])
    usage = build_stats_rows(catalog[use_key])

    producer_total = sum(int(item["value"]) for item in producers)
    usage_total = sum(int(item["value"]) for item in usage)

    return {
        "category": category.title(),
        "producers": producers,
        "usage": usage,
        "producer_total": producer_total,
        "usage_total": usage_total,
        "top_producer": producers[0]["name"] if producers else None,
        "top_usage_region": usage[0]["name"] if usage else None,
    }


@app.get("/predict")
def predict(commodity: str = "Gold", market: str = "USA_USD_per_10g", year: int | None = None) -> dict:
    target_year = year or datetime.now().year
    if target_year < 1900 or target_year > 2100:
        raise HTTPException(status_code=400, detail="Year must be between 1900 and 2100.")

    commodity_name, market_name, model = get_model(commodity, market)
    current_year = datetime.now().year

    current_prediction = predict_price(model, current_year)
    target_prediction = predict_price(model, target_year)

    change_value = round(target_prediction - current_prediction, 2)
    change_percent = round((change_value / current_prediction) * 100, 2) if current_prediction else 0.0
    signal = "RISE" if change_value > 0 else "FALL" if change_value < 0 else "STABLE"

    chart_years = list(range(max(2000, target_year - 5), target_year + 6))
    chart_data = [
        {"year": chart_year, "predicted_price": predict_price(model, chart_year)}
        for chart_year in chart_years
    ]

    region, currency = parse_market_label(market_name)

    return {
        "commodity": commodity_name,
        "market": market_name,
        "region": region,
        "currency": currency,
        "unit": "per_10g",
        "current_year": current_year,
        "target_year": target_year,
        "current_prediction": current_prediction,
        "target_prediction": target_prediction,
        "change_value": change_value,
        "change_percent": change_percent,
        "signal": signal,
        "chart_data": chart_data,
    }
