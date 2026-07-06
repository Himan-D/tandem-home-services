import torch
import torch.nn as nn
from .tabnet import TabNetBinaryClassifier


class FraudDetector(nn.Module):
    N_FEATURES = 12

    def __init__(self, n_features=None):
        super().__init__()
        n_features = n_features or self.N_FEATURES
        self.tabnet = TabNetBinaryClassifier(n_features=n_features, n_d=24, n_a=24, n_steps=4)

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


def build_fraud_features(booking):
    return torch.tensor([
        min(booking.get("booking_amount", 100) / 1000, 1.0),
        min(booking.get("customer_bookings_24h", 0) / 5, 1.0),
        float(booking.get("is_new_customer", True)),
        float(booking.get("is_guest_checkout", False)),
        min(booking.get("distance_from_usual_km", 0) / 50, 1.0),
        float(booking.get("email_verified", False)),
        float(booking.get("phone_verified", False)),
        float(booking.get("has_previous_cancellations", False)),
        min(booking.get("payment_attempts", 1) / 5, 1.0),
        min(booking.get("account_age_hours", 0) / 720, 1.0),
        float(booking.get("different_device", False)),
        float(booking.get("ip_risk_score", 0)),
    ], dtype=torch.float32)
