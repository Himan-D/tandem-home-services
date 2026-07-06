import torch
import torch.nn as nn
from .tabnet import TabNetRegressor


class CompletionTimePredictor(nn.Module):
    N_FEATURES = 10

    def __init__(self, n_features=None):
        super().__init__()
        n_features = n_features or self.N_FEATURES
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

    def save(self, path):
        torch.save(self.state_dict(), path)

    @classmethod
    def load(cls, path):
        model = cls()
        model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
        model.eval()
        return model


def build_completion_features(booking):
    return torch.tensor([
        min(booking.get("service_category_encoded", 0) / 13, 1.0),
        min(booking.get("num_bedrooms", 1) / 10, 1.0),
        min(booking.get("num_bathrooms", 1) / 10, 1.0),
        min(booking.get("sq_footage", 1000) / 5000, 1.0),
        float(booking.get("has_previous_booking", True)),
        min(booking.get("partner_experience_months", 12) / 120, 1.0),
        float(booking.get("is_weekend", False)),
        min(booking.get("hour_of_day", 12) / 23, 1.0),
        min(booking.get("distance_km", 5) / 30, 1.0),
        min(booking.get("add_on_count", 0) / 5, 1.0),
    ], dtype=torch.float32)
