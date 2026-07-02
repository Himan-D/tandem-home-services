import torch
import torch.nn as nn
import numpy as np


class TextServiceRecommender(nn.Module):
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

    def forward(self, user_ids, service_indices):
        u = self.user_factors(user_ids)
        s = self.service_factors(service_indices)
        pred = (u * s).sum(dim=1, keepdim=True)
        pred += self.user_bias(user_ids) + self.service_bias(service_indices) + self.global_bias
        return pred.squeeze()

    def predict_score(self, user_id, service_id_str, service_to_idx):
        self.eval()
        with torch.no_grad():
            sidx = service_to_idx.get(service_id_str, 0)
            u = torch.tensor([user_id])
            s = torch.tensor([sidx])
            return self.forward(u, s).item()

    def recommend_for_user(self, user_id, service_id_strs, service_to_idx, top_k=6):
        self.eval()
        with torch.no_grad():
            indices = [service_to_idx.get(sid, 0) for sid in service_id_strs]
            unique_indices = list(set(indices))
            u = torch.tensor([user_id] * len(unique_indices))
            s = torch.tensor(unique_indices)
            scores = self.forward(u, s)
            topk = scores.topk(min(top_k, len(scores)))
            idx_to_service = {v: k for k, v in service_to_idx.items()}
            results = []
            for i in topk.indices:
                sidx = int(unique_indices[i])
                sid = idx_to_service.get(sidx, 'unknown')
                results.append((sid, float(scores[i])))
            return results


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
