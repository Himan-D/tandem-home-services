import os
import sys
import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch

sys.path.insert(0, os.path.dirname(__file__))
from models.recommendation import TextServiceRecommender, ProRanker
from models.pricing import DynamicPricingModel, build_price_features
from models.eta import ETAPredictor, build_eta_features
from models.churn import ChurnPredictor, LTVPredictor, build_churn_features, build_ltv_features
from models.bundling import ServiceBundler
from models.forecasting import DemandForecaster, SurgeDetector
from models.train import (
    train_recommender,
    train_pro_ranker,
    train_tabnet_regressor,
    train_tabnet_binary,
)

app = FastAPI(title="Tandem ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_IDS = [
    'hourly', 'bathroom', 'fridge', 'packing', 'kitchen',
    'dusting', 'wardrobe', 'car', 'plumber', 'electrician',
    'ac_repair', 'pest_control', 'painting', 'handyman',
]
SERVICE_TO_IDX = {s: i for i, s in enumerate(SERVICE_IDS)}
IDX_TO_SERVICE = {i: s for s, i in SERVICE_TO_IDX.items()}
N_SERVICES = len(SERVICE_IDS)

recommender = TextServiceRecommender(n_users=10, n_services=N_SERVICES, n_factors=32)
pro_ranker = ProRanker(n_features=16)
pricing_model = DynamicPricingModel(n_features=14)
eta_model = ETAPredictor(n_features=10)
churn_model = ChurnPredictor(n_features=10)
ltv_model = LTVPredictor(n_features=10)
bundler = ServiceBundler(n_services=N_SERVICES)
forecaster = DemandForecaster(n_services=N_SERVICES)
surge_detector = SurgeDetector()

recommender.eval()
pro_ranker.eval()


class TrainRecommenderRequest(BaseModel):
    interactions: list
    n_users: int = 50


class TrainProRankerRequest(BaseModel):
    features: list
    scores: list


class TrainTabNetRequest(BaseModel):
    features: list
    targets: list


class TrainBundlerRequest(BaseModel):
    booking_histories: list


class TrainForecasterRequest(BaseModel):
    hourly_data: list


class RecommendRequest(BaseModel):
    user_id: int
    top_k: int = 6
    service_ids: list[str] | None = None


class ProMatchRequest(BaseModel):
    user_id: int
    pros: list


class PricePredictRequest(BaseModel):
    bookings: list


class ETAPredictRequest(BaseModel):
    routes: list


class ChurnPredictRequest(BaseModel):
    users: list


class BundleRecommendRequest(BaseModel):
    selected_services: list[str]
    top_k: int = 3


class ForecastRequest(BaseModel):
    service_id: str | None = None
    day_of_week: int = 0
    hour_of_day: int = 12


class SurgeRequest(BaseModel):
    service_states: list


class SurgeRecordRequest(BaseModel):
    service_states: list


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "tabnet",
        "services": N_SERVICES,
        "recommender_trained": False,
        "pro_ranker_trained": False,
        "pricing_trained": False,
        "eta_trained": False,
        "churn_trained": False,
        "bundler_trained": bundler.trained,
        "forecaster_trained": forecaster.trained,
    }


@app.post("/train/recommender")
def train_recommender_endpoint(data: TrainRecommenderRequest):
    global recommender
    if not data.interactions:
        raise HTTPException(400, "No interactions provided")

    max_uid = max(i.get("user_id", 1) for i in data.interactions) + 5
    recommender = TextServiceRecommender(n_users=max_uid, n_services=N_SERVICES, n_factors=32)
    mapped = [(i["user_id"], i["service_id"], i.get("rating", 1.0)) for i in data.interactions]
    train_recommender(recommender, mapped, SERVICE_TO_IDX, n_epochs=30)
    recommender.eval()
    return {"trained": True, "users": max_uid, "services": N_SERVICES}


@app.post("/train/pro-ranker")
def train_pro_ranker_endpoint(data: TrainProRankerRequest):
    if not data.features or not data.scores:
        raise HTTPException(400, "Features and scores required")

    train_pro_ranker(pro_ranker, data.features, data.scores, n_epochs=30)
    pro_ranker.eval()
    return {"trained": True, "samples": len(data.features)}


@app.post("/train/pricing")
def train_pricing(data: TrainTabNetRequest):
    if not data.features or not data.targets:
        raise HTTPException(400, "Features and targets required")

    train_tabnet_regressor(pricing_model, data.features, data.targets, n_epochs=50)
    pricing_model.eval()
    return {"trained": True, "samples": len(data.features)}


@app.post("/train/eta")
def train_eta(data: TrainTabNetRequest):
    if not data.features or not data.targets:
        raise HTTPException(400, "Features and targets required")

    train_tabnet_regressor(eta_model, data.features, data.targets, n_epochs=50)
    eta_model.eval()
    return {"trained": True, "samples": len(data.features)}


@app.post("/train/churn")
def train_churn(data: TrainTabNetRequest):
    if not data.features or not data.targets:
        raise HTTPException(400, "Features and targets required")

    train_tabnet_binary(churn_model, data.features, data.targets, n_epochs=50)
    churn_model.eval()
    return {"trained": True, "samples": len(data.features)}


@app.post("/train/ltv")
def train_ltv(data: TrainTabNetRequest):
    if not data.features or not data.targets:
        raise HTTPException(400, "Features and targets required")

    train_tabnet_regressor(ltv_model, data.features, data.targets, n_epochs=50)
    ltv_model.eval()
    return {"trained": True, "samples": len(data.features)}


@app.post("/train/bundler")
def train_bundler(data: TrainBundlerRequest):
    if not data.booking_histories:
        raise HTTPException(400, "Booking histories required")

    bundler.train(data.booking_histories)
    return {"trained": True, "histories": len(data.booking_histories)}


@app.post("/train/forecaster")
def train_forecaster(data: TrainForecasterRequest):
    if not data.hourly_data:
        raise HTTPException(400, "Hourly data required")

    forecaster.train(data.hourly_data)
    return {"trained": True, "data_points": len(data.hourly_data)}


@app.post("/train/surge-detector")
def train_surge_detector(data: SurgeRecordRequest):
    if not data.service_states:
        raise HTTPException(400, "Service states required")

    surge_detector.train(data.service_states)
    return {"trained": True, "records": len(data.service_states)}


def build_pro_feature_vector(p):
    return [
        p.get("rating_avg", 4.5),
        min(p.get("jobs_completed", 0) / 100, 1.0),
        max(1.0 - p.get("response_time_mins", 30) / 60, 0),
        p.get("price_score", 0.5),
        p.get("location_score", 0.5),
        p.get("skills_match", 0.5),
        p.get("reliability_score", 0.8),
        p.get("availability_score", 0.5),
        1.0 if p.get("is_plus_member", False) else 0.0,
    ] + [0.0] * 7


@app.post("/recommend")
def recommend(data: RecommendRequest):
    rec_ids = data.service_ids or list(SERVICE_IDS)
    recs = recommender.recommend_for_user(data.user_id, rec_ids, SERVICE_TO_IDX, top_k=data.top_k)
    return {"recommendations": [{"service_id": sid, "score": round(s, 4)} for sid, s in recs]}


@app.post("/rank-pros")
def rank_pros(data: ProMatchRequest):
    if not data.pros:
        return {"ranked_pros": []}

    ranked = []
    for p in data.pros:
        features = np.array(build_pro_feature_vector(p))
        features_tensor = torch.tensor(features, dtype=torch.float32)
        score = pro_ranker(features_tensor).item()
        ranked.append({"pro_id": p["pro_id"], "score": round(score, 4)})

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return {"ranked_pros": ranked}


@app.post("/predict-rating")
def predict_rating(data: dict):
    user_id = data.get("user_id", 1)
    service_id = data.get("service_id", "hourly")
    score = recommender.predict_score(user_id, service_id, SERVICE_TO_IDX)
    return {"user_id": user_id, "service_id": service_id, "predicted_rating": round(score, 2)}


@app.post("/predict-price")
def predict_price(data: PricePredictRequest):
    if not data.bookings:
        return {"prices": []}

    results = []
    for b in data.bookings:
        features = build_price_features(b).unsqueeze(0)
        with torch.no_grad():
            price_out, masks = pricing_model.predict(features)
        multiplier = round(max(float(price_out), 0.5), 4)
        importance = pricing_model.get_feature_importance(features).tolist()
        results.append({
            "booking_id": b.get("booking_id"),
            "price_multiplier": multiplier,
            "final_price": round(b.get("base_price", 100) * multiplier, 2),
            "feature_importance": importance,
        })

    return {"prices": results}


@app.post("/predict-eta")
def predict_eta(data: ETAPredictRequest):
    if not data.routes:
        return {"etas": []}

    results = []
    for r in data.routes:
        features = build_eta_features(r).unsqueeze(0)
        with torch.no_grad():
            eta_out, masks = eta_model.predict(features)
        eta_mins = round(max(float(eta_out), 2), 1)
        importance = eta_model.get_feature_importance(features).tolist()
        results.append({
            "route_id": r.get("route_id"),
            "eta_minutes": eta_mins,
            "feature_importance": importance,
        })

    return {"etas": results}


@app.post("/predict-churn")
def predict_churn(data: ChurnPredictRequest):
    if not data.users:
        return {"churn_predictions": []}

    results = []
    for u in data.users:
        features = build_churn_features(u).unsqueeze(0)
        with torch.no_grad():
            churn_out, _ = churn_model.predict(features)
        ltv_features = build_ltv_features(u).unsqueeze(0)
        with torch.no_grad():
            ltv_out, _ = ltv_model.predict(ltv_features)

        results.append({
            "user_id": u.get("user_id"),
            "churn_probability": round(max(min(float(churn_out), 1.0), 0.0), 4),
            "predicted_ltv": round(max(float(ltv_out), 0), 2),
        })

    return {"churn_predictions": results}


@app.post("/bundle-services")
def bundle_services(data: BundleRecommendRequest):
    if not data.selected_services:
        return {"bundles": []}

    bundles = bundler.recommend_bundles(data.selected_services, top_k=data.top_k)
    return {"bundles": bundles}


@app.post("/frequently-bought-together")
def frequently_bought(data: BundleRecommendRequest):
    if not data.selected_services:
        return {"recommendations": []}

    results = bundler.predict_frequently_bought_together(data.selected_services[0], top_k=data.top_k)
    return {
        "service_id": data.selected_services[0],
        "recommendations": [{"service_id": s, "score": round(sc, 4)} for s, sc in results],
    }


@app.post("/forecast")
def forecast(data: ForecastRequest):
    if data.service_id:
        result = forecaster.forecast(data.service_id, data.day_of_week, data.hour_of_day)
        return {"forecasts": {data.service_id: result}}
    else:
        results = forecaster.forecast_all(data.day_of_week, data.hour_of_day)
        return {"forecasts": results}


@app.post("/detect-surge")
def detect_surge(data: SurgeRequest):
    if not data.service_states:
        return {"surges": {}}

    results = surge_detector.detect_all_surges(data.service_states)
    return {"surges": results}


@app.post("/record-state")
def record_state(data: SurgeRecordRequest):
    for state in data.service_states:
        surge_detector.record_state(
            state.get("service_id", "hourly"),
            state.get("booking_count", 0),
            state.get("available_partners", 0),
            state.get("timestamp", 0),
        )
        if state.get("service_id"):
            forecaster.record_booking(
                state.get("service_id"),
                state.get("hour_of_day", 12),
                state.get("day_of_week", 0),
                state.get("timestamp", 0),
            )

    return {"recorded": len(data.service_states)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
