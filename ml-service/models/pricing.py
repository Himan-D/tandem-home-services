import torch
import torch.nn as nn
import numpy as np
from .tabnet import TabNetRegressor


class DynamicPricingModel(nn.Module):
    def __init__(self, n_features=14):
        super().__init__()
        self.tabnet = TabNetRegressor(n_features=n_features, n_d=32, n_a=32, n_steps=4, output_dim=1)

    def forward(self, x):
        return self.tabnet(x)

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            return self.tabnet(x)

    def get_feature_importance(self, x):
        _, masks = self.tabnet(x)
        return torch.stack(masks, dim=0).mean(dim=0).mean(dim=0).detach().cpu().numpy()


def build_price_features(booking):
    return torch.tensor([
        min(booking.get("hour_of_day", 12) / 23, 1.0),
        booking.get("day_of_week", 0) / 6,
        float(booking.get("is_weekend", False)),
        min(booking.get("demand_score", 0.5), 1.0),
        min(booking.get("supply_score", 0.5), 1.0),
        min(booking.get("surge_multiplier", 1.0) / 3.0, 1.0),
        min(booking.get("base_price", 100) / 500, 1.0),
        min(booking.get("customer_tier", 0.5), 1.0),
        min(booking.get("location_density", 0.5), 1.0),
        min(booking.get("season_factor", 0.5), 1.0),
        min(booking.get("historical_conv_rate", 0.5), 1.0),
        min(booking.get("service_category_encoded", 0) / 13, 1.0),
        min(booking.get("customer_lifetime_value", 0) / 10000, 1.0),
        min(max((booking.get("urgent_hours", 24) - 24) / -23, 0), 1.0),
    ], dtype=torch.float32)
