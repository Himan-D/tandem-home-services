import torch
import torch.optim as optim
import torch.nn as nn
import numpy as np
from .recommendation import TextServiceRecommender, ProRanker


def train_recommender_text(model, interactions, service_to_idx, n_epochs=50, lr=0.01):
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    user_ids = torch.tensor([i[0] for i in interactions])
    service_indices = torch.tensor([service_to_idx.get(i[1], 0) for i in interactions])
    ratings = torch.tensor([i[2] for i in interactions], dtype=torch.float32)

    for epoch in range(n_epochs):
        model.train()
        optimizer.zero_grad()
        preds = model(user_ids, service_indices)
        loss = criterion(preds, ratings)
        loss.backward()
        optimizer.step()

    return model


def train_pro_ranker(model, features_list, scores_list, n_epochs=30, lr=0.005):
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCELoss()

    x = torch.tensor(np.array(features_list), dtype=torch.float32)
    y = torch.tensor(scores_list, dtype=torch.float32)

    for epoch in range(n_epochs):
        model.train()
        optimizer.zero_grad()
        preds = model(x)
        loss = criterion(preds, y)
        loss.backward()
        optimizer.step()

    return model
