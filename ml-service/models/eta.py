import torch
import torch.nn as nn
import numpy as np
from .tabnet import TabNetRegressor


class ETAPredictor(nn.Module):
    def __init__(self, n_features=10):
        super().__init__()
        self.tabnet = TabNetRegressor(n_features=n_features, n_d=24, n_a=24, n_steps=3, output_dim=1)

    def forward(self, x):
        return self.tabnet(x)

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            return self.tabnet(x)

    def get_feature_importance(self, x):
        _, masks = self.tabnet(x)
        return torch.stack(masks, dim=0).mean(dim=0).mean(dim=0).detach().cpu().numpy()


def build_eta_features(route):
    return torch.tensor([
        min(route.get("distance_km", 5) / 50, 1.0),
        route.get("hour_of_day", 12) / 23,
        route.get("day_of_week", 0) / 6,
        float(route.get("is_rush_hour", False)),
        min(route.get("traffic_factor", 1.0) / 3.0, 1.0),
        min(route.get("historical_avg_speed", 30) / 100, 1.0),
        min(route.get("service_prep_time", 15) / 120, 1.0),
        min(route.get("num_stops", 0) / 10, 1.0),
        float(route.get("is_weekend", False)),
        min(max(route.get("weather_factor", 1.0) - 0.5, 0) / 1.5, 1.0),
    ], dtype=torch.float32)
