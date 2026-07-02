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
from models.recommendation import ServiceRecommender, ProRanker
from models.train import train_recommender, train_pro_ranker

app = FastAPI(title="Tandem ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

recommender = ServiceRecommender(n_users=100, n_services=20, n_factors=32)
pro_ranker = ProRanker(n_features=16)

recommender.eval()
pro_ranker.eval()


class TrainRequest(BaseModel):
    interactions: list


class RecommendRequest(BaseModel):
    user_id: int
    top_k: int = 6


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
    return {"status": "ok", "model": "pytorch"}


@app.post("/train")
def train(data: TrainRequest):
    global recommender
    interactions = [(i["user_id"], i["service_id"], i.get("rating", 1)) for i in data.interactions]
    if not interactions:
        raise HTTPException(400, "No interactions provided")
    n_users = max(i[0] for i in interactions) + 1
    n_services = max(i[1] for i in interactions) + 1
    recommender = ServiceRecommender(n_users=n_users, n_services=n_services, n_factors=32)
    recommender = train_recommender(recommender, interactions, n_epochs=30)
    return {"trained": True, "users": n_users, "services": n_services}


@app.post("/recommend")
def recommend(data: RecommendRequest):
    all_service_ids = list(range(1, 20))
    recs = recommender.recommend_for_user(data.user_id, all_service_ids, top_k=data.top_k)
    return {"recommendations": [{"service_id": sid, "score": round(s, 4)} for sid, s in recs]}


@app.post("/rank-pros")
def rank_pros(data: ProMatchRequest):
    ranked = []
    for p in data.pros:
        features = np.array([
            p.get("rating_avg", 4.5),
            min(p.get("jobs_completed", 0) / 100, 1.0),
            max(1.0 - p.get("response_time_mins", 30) / 60, 0),
            p.get("price_score", 0.5),
            p.get("location_score", 0.5),
            p.get("skills_match", 0.5),
            p.get("reliability_score", 0.8),
            p.get("availability_score", 0.5),
            1.0 if p.get("is_plus_member", False) else 0.0,
        ] + [0.0] * 7  # pad to 16 features

        features_tensor = torch.tensor(features, dtype=torch.float32)
        score = pro_ranker(features_tensor).item()
        ranked.append({"pro_id": p["pro_id"], "score": round(score, 4)})

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return {"ranked_pros": ranked}


@app.post("/predict-rating")
def predict_rating(data: dict):
    user_id = data.get("user_id", 1)
    service_id = data.get("service_id", 1)
    score = recommender.predict_score(user_id, service_id)
    return {"user_id": user_id, "service_id": service_id, "predicted_rating": round(score, 2)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
