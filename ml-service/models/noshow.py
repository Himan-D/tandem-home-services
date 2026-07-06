import torch
import torch.nn as nn
from .tabnet import TabNetBinaryClassifier


class NoShowPredictor(nn.Module):
    N_FEATURES = 10

    def __init__(self, n_features=None):
        super().__init__()
        n_features = n_features or self.N_FEATURES
        self.tabnet = TabNetBinaryClassifier(n_features=n_features, n_d=20, n_a=20, n_steps=3)

    def forward(self, x):
        return self.tabnet(x)

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            return self.tabnet(x)

    def get_feature_importance(self, x):
        _, masks = self.tabnet(x)
        return torch.stack(masks, dim=0).mean(dim=0).mean(dim=0).detach().cpu().numpy()

    def save(self, path):
        torch.save(self.state_dict(), path)

    @classmethod
    def load(cls, path):
        model = cls()
        model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
        model.eval()
        return model


def build_noshow_features(booking):
    return torch.tensor([
        min(booking.get("customer_booking_count", 0) / 50, 1.0),
        float(booking.get("customer_noshow_history", False)),
        float(booking.get("is_weekend", False)),
        min(booking.get("hour_of_day", 12) / 23, 1.0),
        min(booking.get("lead_time_hours", 24) / 168, 1.0),
        min(booking.get("booking_amount", 100) / 500, 1.0),
        float(booking.get("is_recurring", False)),
        float(booking.get("has_rating_history", False)),
        float(booking.get("is_plus_member", False)),
        min(booking.get("partner_rating", 4.5) / 5.0, 1.0),
    ], dtype=torch.float32)
