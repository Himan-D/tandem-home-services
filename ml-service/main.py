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
from models.fraud import FraudDetector, build_fraud_features
from models.noshow import NoShowPredictor, build_noshow_features
from models.completion import CompletionTimePredictor, build_completion_features
from models.slots import SlotRecommender
from models.review_analysis import ReviewAnalyzer
from models.train import (
    train_recommender, train_pro_ranker,
    train_tabnet_regressor, train_tabnet_binary,
)
from models.registry import ModelRegistry

app = FastAPI(title="Tandem ML Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

SERVICE_IDS = ['hourly','bathroom','fridge','packing','kitchen','dusting',
               'wardrobe','car','plumber','electrician','ac_repair',
               'pest_control','painting','handyman']
SERVICE_TO_IDX = {s:i for i,s in enumerate(SERVICE_IDS)}
IDX_TO_SERVICE = {i:s for s,i in SERVICE_TO_IDX.items()}
N_SERVICES = len(SERVICE_IDS)

registries = {
    "pricing": ModelRegistry("pricing"),
    "eta": ModelRegistry("eta"),
    "churn": ModelRegistry("churn"),
    "ltv": ModelRegistry("ltv"),
    "fraud": ModelRegistry("fraud"),
    "noshow": ModelRegistry("noshow"),
    "completion": ModelRegistry("completion"),
}

recommender = TextServiceRecommender(n_users=10, n_services=N_SERVICES, n_factors=32)
pro_ranker = ProRanker(n_features=16)
pricing_model = DynamicPricingModel()
eta_model = ETAPredictor()
churn_model = ChurnPredictor()
ltv_model = LTVPredictor()
bundler = ServiceBundler(n_services=N_SERVICES)
forecaster = DemandForecaster(n_services=N_SERVICES)
surge_detector = SurgeDetector()
fraud_detector = FraudDetector()
noshow_predictor = NoShowPredictor()
completion_predictor = CompletionTimePredictor()
slot_recommender = SlotRecommender()
review_analyzer = ReviewAnalyzer()

model_registry_state = {}

def load_saved_models():
    for name, model in [
        ("pricing", pricing_model), ("eta", eta_model),
        ("churn", churn_model), ("ltv", ltv_model),
        ("fraud", fraud_detector), ("noshow", noshow_predictor),
        ("completion", completion_predictor),
    ]:
        reg = registries[name]
        if reg.load(model):
            meta = reg.get_manifest()
            v = meta["version"] if meta else "?"
            model_registry_state[name] = {"version": v, "loaded": True}
        else:
            model_registry_state[name] = {"version": None, "loaded": False}

recommender.eval()
pro_ranker.eval()
load_saved_models()

class TrainTabNetRequest(BaseModel):
    features: list; targets: list
class TrainBundlerRequest(BaseModel):
    booking_histories: list
class TrainForecasterRequest(BaseModel):
    hourly_data: list
class TrainSlotRequest(BaseModel):
    slot_data: list
class TrainReviewRequest(BaseModel):
    reviews: list
class RecommendRequest(BaseModel):
    user_id: int; top_k: int = 6; service_ids: list[str] | None = None
class ProMatchRequest(BaseModel):
    user_id: int; pros: list
class PricePredictRequest(BaseModel):
    bookings: list
class ETAPredictRequest(BaseModel):
    routes: list
class ChurnPredictRequest(BaseModel):
    users: list
class BundleRecommendRequest(BaseModel):
    selected_services: list[str]; top_k: int = 3
class ForecastRequest(BaseModel):
    service_id: str | None = None; day_of_week: int = 0; hour_of_day: int = 12
class SurgeRequest(BaseModel):
    service_states: list
class SurgeRecordRequest(BaseModel):
    service_states: list
class FraudCheckRequest(BaseModel):
    bookings: list
class NoShowRequest(BaseModel):
    bookings: list
class CompletionRequest(BaseModel):
    bookings: list
class SlotRequest(BaseModel):
    service_id: str = "hourly"; day_of_week: int = 0; top_k: int = 5
class AnalyzeReviewRequest(BaseModel):
    text: str
class BatchReviewRequest(BaseModel):
    texts: list[str]
class ReviewSummaryRequest(BaseModel):
    reviews: list
class TrainProRankerRequest(BaseModel):
    features: list; scores: list
class TrainRecommenderRequest(BaseModel):
    interactions: list; n_users: int = 50

def train_and_save(model, reg, train_fn, features, targets, name, n_epochs=50):
    if not features or not targets:
        raise HTTPException(400, f"{name}: features and targets required")
    model, metrics = train_fn(model, features, targets, n_epochs=n_epochs)
    model.eval()
    version = reg.save(model, metadata=metrics.to_dict())
    model_registry_state[name] = {"version": version, "loaded": True}
    return {"trained": True, "version": version, "samples": metrics.sample_count,
            "metrics": metrics.to_dict()}

@app.get("/health")
def health():
    state = {}
    for name, m in [("pricing", pricing_model), ("eta", eta_model),
                    ("churn", churn_model), ("ltv", ltv_model),
                    ("fraud", fraud_detector), ("noshow", noshow_predictor),
                    ("completion", completion_predictor)]:
        reg = registries[name]
        s = model_registry_state.get(name, {})
        s["versions_available"] = len(reg.list_versions())
        state[name] = s
    state["bundler"] = {"trained": bundler.trained}
    state["forecaster"] = {"trained": forecaster.trained}
    state["slots"] = {"trained": slot_recommender.trained}
    state["review_analyzer"] = {"trained": review_analyzer.trained}
    return {"status": "ok", "model": "tabnet", "services": N_SERVICES, **state}

# --- TRAIN ENDPOINTS ---

@app.post("/train/recommender")
def train_recommender_endpoint(data: TrainRecommenderRequest):
    global recommender
    if not data.interactions:
        raise HTTPException(400, "No interactions provided")
    max_uid = max(i.get("user_id", 1) for i in data.interactions) + 5
    recommender = TextServiceRecommender(n_users=max_uid, n_services=N_SERVICES, n_factors=32)
    mapped = [(i["user_id"], i["service_id"], i.get("rating", 1.0)) for i in data.interactions]
    recommender, metrics = train_recommender(recommender, mapped, SERVICE_TO_IDX, n_epochs=30)
    recommender.eval()
    return {"trained": True, "users": max_uid, "services": N_SERVICES, "metrics": metrics.to_dict()}

@app.post("/train/pro-ranker")
def train_pro_ranker_endpoint(data: TrainProRankerRequest):
    if not data.features or not data.scores:
        raise HTTPException(400, "Features and scores required")
    _, metrics = train_pro_ranker(pro_ranker, data.features, data.scores, n_epochs=30)
    pro_ranker.eval()
    return {"trained": True, "samples": len(data.features), "metrics": metrics.to_dict()}

@app.post("/train/pricing")
def train_pricing(data: TrainTabNetRequest):
    return train_and_save(pricing_model, registries["pricing"],
                          train_tabnet_regressor, data.features, data.targets, "pricing", 50)

@app.post("/train/eta")
def train_eta(data: TrainTabNetRequest):
    return train_and_save(eta_model, registries["eta"],
                          train_tabnet_regressor, data.features, data.targets, "eta", 50)

@app.post("/train/churn")
def train_churn(data: TrainTabNetRequest):
    return train_and_save(churn_model, registries["churn"],
                          train_tabnet_binary, data.features, data.targets, "churn", 50)

@app.post("/train/ltv")
def train_ltv(data: TrainTabNetRequest):
    return train_and_save(ltv_model, registries["ltv"],
                          train_tabnet_regressor, data.features, data.targets, "ltv", 50)

@app.post("/train/fraud")
def train_fraud(data: TrainTabNetRequest):
    return train_and_save(fraud_detector, registries["fraud"],
                          train_tabnet_binary, data.features, data.targets, "fraud", 40)

@app.post("/train/noshow")
def train_noshow(data: TrainTabNetRequest):
    return train_and_save(noshow_predictor, registries["noshow"],
                          train_tabnet_binary, data.features, data.targets, "noshow", 40)

@app.post("/train/completion")
def train_completion(data: TrainTabNetRequest):
    return train_and_save(completion_predictor, registries["completion"],
                          train_tabnet_regressor, data.features, data.targets, "completion", 50)

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
def train_surge_detector(data: SurgeRequest):
    if not data.service_states:
        raise HTTPException(400, "Service states required")
    surge_detector.train(data.service_states)
    return {"trained": True, "records": len(data.service_states)}

@app.post("/train/slots")
def train_slots(data: TrainSlotRequest):
    if not data.slot_data:
        raise HTTPException(400, "Slot data required")
    slot_recommender.train(data.slot_data)
    return {"trained": True, "samples": len(data.slot_data)}

@app.post("/train/review-analyzer")
def train_review_analyzer(data: TrainReviewRequest):
    if not data.reviews:
        raise HTTPException(400, "Review data required")
    review_analyzer.train(data.reviews)
    return {"trained": True, "samples": len(data.reviews)}

# --- MODEL VERSION MANAGEMENT ---

@app.get("/models/{name}/versions")
def model_versions(name: str):
    if name not in registries:
        raise HTTPException(404, f"Unknown model: {name}")
    return {"model": name, "versions": registries[name].list_versions()}

@app.post("/models/{name}/rollback")
def model_rollback(name: str, data: dict):
    if name not in registries:
        raise HTTPException(404, f"Unknown model: {name}")
    version = data.get("version")
    reg = registries[name]
    models_map = {"pricing": pricing_model, "eta": eta_model, "churn": churn_model,
                  "ltv": ltv_model, "fraud": fraud_detector, "noshow": noshow_predictor,
                  "completion": completion_predictor}
    model = models_map.get(name)
    if not model:
        raise HTTPException(400, f"Model {name} not available for rollback")
    if not reg.load(model, version=version):
        raise HTTPException(404, f"Version {version} not found")
    model.eval()
    model_registry_state[name] = {"version": version, "loaded": True}
    return {"rolled_back": True, "model": name, "version": version}

# --- INFERENCE ENDPOINTS ---

def build_pro_feature_vector(p):
    return [p.get("rating_avg", 4.5),
            min(p.get("jobs_completed", 0) / 100, 1.0),
            max(1.0 - p.get("response_time_mins", 30) / 60, 0),
            p.get("price_score", 0.5), p.get("location_score", 0.5),
            p.get("skills_match", 0.5), p.get("reliability_score", 0.8),
            p.get("availability_score", 0.5),
            1.0 if p.get("is_plus_member", False) else 0.0] + [0.0] * 7

@app.post("/recommend")
def recommend(data: RecommendRequest):
    rec_ids = data.service_ids or list(SERVICE_IDS)
    recs = recommender.recommend_for_user(data.user_id, rec_ids, SERVICE_TO_IDX, top_k=data.top_k)
    return {"recommendations": [{"service_id": sid, "score": round(s, 4)} for sid, s in recs]}

@app.post("/rank-pros")
def rank_pros(data: ProMatchRequest):
    if not data.pros:
        return {"ranked_pros": []}
    ranked = [(p["pro_id"], round(pro_ranker(torch.tensor(build_pro_feature_vector(p), dtype=torch.float32)).item(), 4)) for p in data.pros]
    ranked.sort(key=lambda x: x[1], reverse=True)
    return {"ranked_pros": [{"pro_id": pid, "score": s} for pid, s in ranked]}

@app.post("/predict-rating")
def predict_rating(data: dict):
    score = recommender.predict_score(data.get("user_id", 1), data.get("service_id", "hourly"), SERVICE_TO_IDX)
    return {"user_id": data.get("user_id", 1), "service_id": data.get("service_id", "hourly"),
            "predicted_rating": round(score, 2)}

@app.post("/predict-price")
def predict_price(data: PricePredictRequest):
    if not data.bookings:
        return {"prices": []}
    results = []
    for b in data.bookings:
        feat = build_price_features(b).unsqueeze(0)
        with torch.no_grad():
            out, _ = pricing_model.predict(feat)
        results.append({"booking_id": b.get("booking_id"),
                        "price_multiplier": round(max(float(out), 0.5), 4),
                        "final_price": round(b.get("base_price", 100) * max(float(out), 0.5), 2),
                        "feature_importance": pricing_model.get_feature_importance(feat).tolist()})
    return {"prices": results}

@app.post("/predict-eta")
def predict_eta(data: ETAPredictRequest):
    if not data.routes:
        return {"etas": []}
    results = []
    for r in data.routes:
        feat = build_eta_features(r).unsqueeze(0)
        with torch.no_grad():
            out, _ = eta_model.predict(feat)
        results.append({"route_id": r.get("route_id"),
                        "eta_minutes": round(max(float(out), 2), 1),
                        "feature_importance": eta_model.get_feature_importance(feat).tolist()})
    return {"etas": results}

@app.post("/predict-churn")
def predict_churn(data: ChurnPredictRequest):
    if not data.users:
        return {"churn_predictions": []}
    results = []
    for u in data.users:
        cf = build_churn_features(u).unsqueeze(0)
        lf = build_ltv_features(u).unsqueeze(0)
        with torch.no_grad():
            co, _ = churn_model.predict(cf)
            lo, _ = ltv_model.predict(lf)
        results.append({"user_id": u.get("user_id"),
                        "churn_probability": round(max(min(float(co), 1.0), 0.0), 4),
                        "predicted_ltv": round(max(float(lo), 0), 2)})
    return {"churn_predictions": results}

@app.post("/bundle-services")
def bundle_services(data: BundleRecommendRequest):
    if not data.selected_services:
        return {"bundles": []}
    return {"bundles": bundler.recommend_bundles(data.selected_services, top_k=data.top_k)}

@app.post("/frequently-bought-together")
def frequently_bought(data: BundleRecommendRequest):
    if not data.selected_services:
        return {"recommendations": []}
    recs = bundler.predict_frequently_bought_together(data.selected_services[0], top_k=data.top_k)
    return {"service_id": data.selected_services[0],
            "recommendations": [{"service_id": s, "score": round(sc, 4)} for s, sc in recs]}

@app.post("/forecast")
def forecast(data: ForecastRequest):
    if data.service_id:
        return {"forecasts": {data.service_id: forecaster.forecast(data.service_id, data.day_of_week, data.hour_of_day)}}
    return {"forecasts": forecaster.forecast_all(data.day_of_week, data.hour_of_day)}

@app.post("/detect-surge")
def detect_surge(data: SurgeRequest):
    return {"surges": surge_detector.detect_all_surges(data.service_states) if data.service_states else {}}

@app.post("/record-state")
def record_state(data: SurgeRequest):
    for s in (data.service_states or []):
        surge_detector.record_state(s.get("service_id","hourly"), s.get("booking_count",0), s.get("available_partners",0), s.get("timestamp",0))
        if s.get("service_id"):
            forecaster.record_booking(s["service_id"], s.get("hour_of_day",12), s.get("day_of_week",0), s.get("timestamp",0))
    return {"recorded": len(data.service_states)}

@app.post("/check-fraud")
def check_fraud(data: FraudCheckRequest):
    if not data.bookings:
        return {"fraud_scores": []}
    results = []
    for b in data.bookings:
        feat = build_fraud_features(b).unsqueeze(0)
        with torch.no_grad():
            out, _ = fraud_detector.predict(feat)
        prob = float(out)
        results.append({"booking_id": b.get("booking_id"),
                        "fraud_probability": round(prob, 4),
                        "risk_level": "high" if prob > 0.7 else "medium" if prob > 0.4 else "low"})
    return {"fraud_scores": results}

@app.post("/predict-noshow")
def predict_noshow(data: NoShowRequest):
    if not data.bookings:
        return {"noshow_predictions": []}
    results = []
    for b in data.bookings:
        feat = build_noshow_features(b).unsqueeze(0)
        with torch.no_grad():
            out, _ = noshow_predictor.predict(feat)
        prob = float(out)
        results.append({"booking_id": b.get("booking_id"),
                        "noshow_probability": round(prob, 4),
                        "risk_level": "high" if prob > 0.6 else "medium" if prob > 0.3 else "low"})
    return {"noshow_predictions": results}

@app.post("/predict-completion-time")
def predict_completion_time(data: CompletionRequest):
    if not data.bookings:
        return {"completion_times": []}
    results = []
    for b in data.bookings:
        feat = build_completion_features(b).unsqueeze(0)
        with torch.no_grad():
            out, _ = completion_predictor.predict(feat)
        mins = round(max(float(out), 15), 1)
        results.append({"booking_id": b.get("booking_id"),
                        "predicted_minutes": mins,
                        "range": f"{max(int(mins-10),10)}-{int(mins+10)} min"})
    return {"completion_times": results}

@app.post("/recommend-slots")
def recommend_slots(data: SlotRequest):
    return {"slots": slot_recommender.recommend_slots(data.service_id, data.day_of_week, top_k=data.top_k),
            "summary": slot_recommender.get_availability_summary(data.service_id)}

@app.post("/analyze-review")
def analyze_review(data: AnalyzeReviewRequest):
    return review_analyzer.analyze(data.text)

@app.post("/analyze-reviews-batch")
def analyze_reviews_batch(data: BatchReviewRequest):
    return {"results": review_analyzer.batch_analyze(data.texts)}

@app.post("/summarize-reviews")
def summarize_reviews(data: ReviewSummaryRequest):
    return review_analyzer.summarize_reviews(data.reviews)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
