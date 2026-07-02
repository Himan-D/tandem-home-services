import torch
import torch.nn as nn
import numpy as np


class ServiceRecommender(nn.Module):
    def __init__(self, n_users, n_services, n_factors=32):
        super().__init__()
        self.user_factors = nn.Embedding(n_users, n_factors)
        self.service_factors = nn.Embedding(n_services, n_factors)
        self.user_bias = nn.Embedding(n_users, 1)
        self.service_bias = nn.Embedding(n_services, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

        nn.init.normal_(self.user_factors.weight, std=0.1)
        nn.init.normal_(self.service_factors.weight, std=0.1)
        nn.init.zeros_(self.user_bias.weight)
        nn.init.zeros_(self.service_bias.weight)

    def forward(self, user_ids, service_ids):
        u = self.user_factors(user_ids)
        s = self.service_factors(service_ids)
        pred = (u * s).sum(dim=1, keepdim=True)
        pred += self.user_bias(user_ids) + self.service_bias(service_ids) + self.global_bias
        return pred.squeeze()

    def predict_score(self, user_id, service_id):
        self.eval()
        with torch.no_grad():
            u = torch.tensor([user_id])
            s = torch.tensor([service_id])
            return self.forward(u, s).item()

    def recommend_for_user(self, user_id, all_service_ids, top_k=6):
        self.eval()
        with torch.no_grad():
            u = torch.tensor([user_id] * len(all_service_ids))
            s = torch.tensor(all_service_ids)
            scores = self.forward(u, s)
            top_indices = scores.topk(min(top_k, len(scores))).indices
            return [(int(all_service_ids[i]), float(scores[i])) for i in top_indices]


class ProRanker(nn.Module):
    def __init__(self, n_features=16):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x).squeeze()

    def score_pro(self, features):
        self.eval()
        with torch.no_grad():
            x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
            return self.forward(x).item()
