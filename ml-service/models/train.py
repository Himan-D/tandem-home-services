import torch
import torch.optim as optim
import torch.nn as nn
import numpy as np
from .recommendation import TextServiceRecommender, ProRanker
from .registry import TrainingMetrics


def train_recommender(model, interactions, service_to_idx, n_epochs=50, lr=0.01):
    if not interactions:
        return model, TrainingMetrics()
    metrics = TrainingMetrics()
    metrics.sample_count = len(interactions)
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
        metrics.add_epoch(loss.item())

    with torch.no_grad():
        preds = model(user_ids, service_indices)
        mae = torch.abs(preds - ratings).mean().item()
    metrics.complete(accuracy=max(0, 1 - mae / 5.0))
    return model, metrics


def train_pro_ranker(model, features_list, scores_list, n_epochs=30, lr=0.005):
    if not features_list or not scores_list:
        return model, TrainingMetrics()
    metrics = TrainingMetrics()
    metrics.sample_count = len(features_list)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCELoss()
    split = max(2, int(len(features_list) * 0.8))
    x = torch.tensor(np.array(features_list), dtype=torch.float32)
    y = torch.tensor(scores_list, dtype=torch.float32)
    x_train, x_val = x[:split], x[split:]
    y_train, y_val = y[:split], y[split:]

    for epoch in range(n_epochs):
        model.train()
        optimizer.zero_grad()
        preds = model(x_train)
        loss = criterion(preds, y_train)
        loss.backward()
        optimizer.step()
        metrics.add_epoch(loss.item())

    with torch.no_grad():
        model.eval()
        preds = model(x_val) if len(x_val) > 0 else model(x_train)
        targets = y_val if len(y_val) > 0 else y_train
        binary_acc = ((preds > 0.5) == (targets > 0.5)).float().mean().item() if len(targets) > 0 else 0
    metrics.complete(accuracy=binary_acc)
    return model, metrics


def train_tabnet_regressor(model, features_list, targets_list, n_epochs=50, lr=0.005):
    if not features_list or not targets_list:
        return model, TrainingMetrics()
    metrics = TrainingMetrics()
    metrics.sample_count = len(features_list)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()
    split = max(2, int(len(features_list) * 0.8))
    x = torch.tensor(np.array(features_list), dtype=torch.float32)
    y = torch.tensor(targets_list, dtype=torch.float32)
    x_train, x_val = x[:split], x[split:]
    y_train, y_val = y[:split], y[split:]

    for epoch in range(n_epochs):
        model.train()
        optimizer.zero_grad()
        out, _ = model(x_train)
        loss = criterion(out, y_train)
        loss.backward()
        optimizer.step()
        metrics.add_epoch(loss.item())

    with torch.no_grad():
        model.eval()
        if len(x_val) > 0:
            out_val, _ = model(x_val)
            val_loss = criterion(out_val, y_val).item()
        else:
            val_loss = None
    metrics.complete(val_loss=val_loss)
    return model, metrics


def train_tabnet_binary(model, features_list, targets_list, n_epochs=50, lr=0.005):
    if not features_list or not targets_list:
        return model, TrainingMetrics()
    metrics = TrainingMetrics()
    metrics.sample_count = len(features_list)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCELoss()
    split = max(2, int(len(features_list) * 0.8))
    x = torch.tensor(np.array(features_list), dtype=torch.float32)
    y = torch.tensor(targets_list, dtype=torch.float32)
    x_train, x_val = x[:split], x[split:]
    y_train, y_val = y[:split], y[split:]

    for epoch in range(n_epochs):
        model.train()
        optimizer.zero_grad()
        out, _ = model(x_train)
        loss = criterion(out, y_train)
        loss.backward()
        optimizer.step()
        metrics.add_epoch(loss.item())

    with torch.no_grad():
        model.eval()
        if len(x_val) > 0:
            out_val, _ = model(x_val)
        else:
            out_val, _ = model(x_train)
            x_val, y_val = x_train, y_train
        y_use = y_val[:len(out_val)] if len(out_val.shape) > 0 else y_val
        if out_val.dim() == 0:
            out_val = out_val.unsqueeze(0)
            y_use = y_use.unsqueeze(0) if y_use.dim() == 0 else y_use[:1]
        binary_acc = ((out_val > 0.5) == (y_use > 0.5)).float().mean().item()
        val_loss = criterion(out_val, y_use).item()
    metrics.complete(accuracy=binary_acc, val_loss=val_loss, val_accuracy=binary_acc)
    return model, metrics
