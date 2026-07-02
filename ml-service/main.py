import os
import sys
import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn

sys.path.insert(0, os.path.dirname(__file__))
from models.recommendation import TextServiceRecommender, ProRanker
from models.train import train_recommender_text, train_pro_ranker

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

recommender = TextServiceRecommender(n_users=50, n_services=N_SERVICES, n_factors=32)
pro_ranker = ProRanker(n_features=16)

service_scores_history = {}

seed_interactions = [
    (1, 'hourly', 5.0), (1, 'dusting', 4.0),
    (2, 'plumber', 5.0), (2, 'electrician', 4.5), (2, 'handyman', 4.0),
    (3, 'bathroom', 5.0), (3, 'kitchen', 4.5), (3, 'fridge', 4.0),
    (1, 'car', 3.0), (3, 'wardrobe', 5.0),
    (4, 'plumber', 5.0), (4, 'electrician', 5.0),
    (5, 'painting', 4.0), (5, 'pest_control', 3.5),
]
seed_features = [
    ([4.9, 0.75, 0.8, 0.5, 0.9, 1.0, 0.9, 0.8, 1.0, 0, 0, 0, 0, 0, 0, 0], 0.95),
    ([4.7, 0.5, 0.6, 0.3, 0.7, 0.5, 0.8, 0.5, 0.0, 0, 0, 0, 0, 0, 0, 0], 0.75),
    ([4.2, 0.25, 0.4, 0.7, 0.4, 0.0, 0.6, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0], 0.55),
    ([5.0, 1.0, 1.0, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 0, 0, 0, 0, 0, 0, 0], 0.99),
]

train_recommender_text(recommender, seed_interactions, SERVICE_TO_IDX, n_epochs=100)
train_pro_ranker(pro_ranker,
    [f[0] for f in seed_features],
    [f[1] for f in seed_features],
    n_epochs=100
)

recommender.eval()
pro_ranker.eval()


class TrainRequest(BaseModel):
    interactions: list


class RecommendRequest(BaseModel):
    user_id: int
    top_k: int = 6
    service_ids: list[str] | None = None


class ProMatchRequest(BaseModel):
    user_id: int
    pros: list


class ProFeatures(BaseModel):
    pro_id: int
    rating_avg: float = 4.5
    jobs_completed: int = 0
    response_time_mins: float = 30
    price_score: float = 0.5
    location_score: float = 0.5
    skills_match: float = 0.5
    reliability_score: float = 0.8


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "pytorch",
        "services": N_SERVICES,
        "trained": True,
    }


@app.post("/train")
def train(data: TrainRequest):
    global recommender
    interactions = data.interactions
    if not interactions:
        raise HTTPException(400, "No interactions provided")

    max_uid = max(i.get("user_id", 1) for i in interactions) + 5
    recommender = TextServiceRecommender(n_users=max_uid, n_services=N_SERVICES, n_factors=32)
    mapped = [(i["user_id"], i["service_id"], i.get("rating", 1.0)) for i in interactions]
    train_recommender_text(recommender, mapped, SERVICE_TO_IDX, n_epochs=30)
    recommender.eval()
    return {"trained": True, "users": max_uid, "services": N_SERVICES}


def build_feature_vector(p):
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
    ranked = []
    for p in data.pros:
        features = np.array(build_feature_vector(p))
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
