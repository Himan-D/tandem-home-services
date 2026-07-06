import torch
import torch.nn as nn
import numpy as np
from .tabnet import TabNetBinaryClassifier, TabNetRegressor


class ChurnPredictor(nn.Module):
    def __init__(self, n_features=10):
        super().__init__()
        self.tabnet = TabNetBinaryClassifier(n_features=n_features, n_d=24, n_a=24, n_steps=3)

    def forward(self, x):
        return self.tabnet(x)

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            return self.tabnet(x)

    def get_feature_importance(self, x):
        _, masks = self.tabnet(x)
        return torch.stack(masks, dim=0).mean(dim=0).mean(dim=0).detach().cpu().numpy()


class LTVPredictor(nn.Module):
    def __init__(self, n_features=10):
        super().__init__()
        self.tabnet = TabNetRegressor(n_features=n_features, n_d=24, n_a=24, n_steps=3, output_dim=1)

    def forward(self, x):
        return self.tabnet(x)

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            return self.tabnet(x)


def build_churn_features(user):
    return torch.tensor([
        min(user.get("days_since_last_booking", 30) / 365, 1.0),
        min(user.get("total_bookings", 0) / 100, 1.0),
        user.get("avg_rating_given", 4.5) / 5.0,
        min(user.get("cancelled_bookings", 0) / max(user.get("total_bookings", 1), 1), 1.0),
        min(user.get("account_age_days", 30) / 365, 1.0),
        min(user.get("support_tickets", 0) / 10, 1.0),
        float(user.get("is_plus_member", False)),
        min(user.get("booking_frequency", 1) / 30, 1.0),
        min(user.get("failed_payments", 0) / 5, 1.0),
        min(user.get("avg_spend_per_booking", 100) / 500, 1.0),
    ], dtype=torch.float32)


def build_ltv_features(user):
    return torch.tensor([
        min(user.get("total_bookings", 0) / 100, 1.0),
        min(user.get("account_age_days", 30) / 730, 1.0),
        min(user.get("avg_spend_per_booking", 100) / 500, 1.0),
        min(user.get("booking_frequency", 1) / 30, 1.0),
        float(user.get("is_plus_member", False)),
        user.get("avg_rating_given", 4.5) / 5.0,
        min(len(user.get("unique_services", [1])) / 14, 1.0),
        min(user.get("referrals_made", 0) / 20, 1.0),
        float(user.get("has_verified_email", True)),
        min(user.get("completed_bookings", 0) / 100, 1.0),
    ], dtype=torch.float32)
