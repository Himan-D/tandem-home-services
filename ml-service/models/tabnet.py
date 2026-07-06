import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class GLUBlock(nn.Module):
    def __init__(self, d_input, d_output):
        super().__init__()
        self.fc = nn.Linear(d_input, d_output * 2)

    def forward(self, x):
        x = self.fc(x)
        x, g = x.chunk(2, dim=-1)
        return x * torch.sigmoid(g)


class FeatureTransformer(nn.Module):
    def __init__(self, d_input, d_output, n_shared=2, n_independent=2, virtual_batch_size=128):
        super().__init__()
        self.shared = nn.ModuleList()
        for _ in range(n_shared):
            self.shared.append(GLUBlock(d_output, d_output))

        self.independent = nn.ModuleList()
        self.independent.append(GLUBlock(d_input, d_output))
        for _ in range(n_independent - 1):
            self.independent.append(GLUBlock(d_output, d_output))

        self.ln = nn.LayerNorm(d_output)

    def forward(self, x):
        x = self.independent[0](x)
        for layer in self.independent[1:]:
            x = layer(x)
        x = self.ln(x)
        return x


class AttentiveTransformer(nn.Module):
    def __init__(self, d_input, d_output):
        super().__init__()
        self.fc = nn.Linear(d_input, d_output)
        self.ln = nn.LayerNorm(d_output)

    def forward(self, x, prior):
        x = self.fc(x)
        x = self.ln(x)
        x = x * prior
        return sparsemax(x, dim=-1)


def sparsemax(z, dim=-1):
    z = z - z.max(dim=dim, keepdim=True)[0]
    z_sorted, _ = z.sort(dim=dim, descending=True)
    z_range = torch.arange(1, z.size(dim) + 1, device=z.device, dtype=z.dtype)
    z_cumsum = z_sorted.cumsum(dim=dim) - 1
    k_vals = z_cumsum / z_range
    support = (z_sorted > k_vals)
    k_support = support.sum(dim=dim, keepdim=True).float()
    tau = z_cumsum.gather(dim, (k_support - 1).long().clamp(min=0)) / k_support.clamp(min=1)
    return torch.clamp(z - tau, min=0)


class TabNetEncoder(nn.Module):
    def __init__(self, n_features, n_d=32, n_a=32, n_steps=4, n_independent=2, n_shared=2):
        super().__init__()
        self.n_steps = n_steps
        self.n_d = n_d
        self.n_a = n_a

        self.feature_transform = FeatureTransformer(
            n_features, n_d + n_a, n_shared=n_shared, n_independent=n_independent
        )
        self.attentive = nn.ModuleList()
        self.feature_transformers = nn.ModuleList()
        for _ in range(n_steps):
            self.attentive.append(AttentiveTransformer(n_a, n_features))
            self.feature_transformers.append(
                FeatureTransformer(n_d + n_a, n_d + n_a, n_shared=n_shared, n_independent=n_independent)
            )

        self.reconstruction = nn.Linear(n_d, n_features)

    def forward(self, x):
        prior = torch.ones_like(x[:, :1].expand(-1, x.size(-1)))
        masks = []
        steps_output = []
        a = torch.zeros(x.size(0), self.n_a, device=x.device)

        for step in range(self.n_steps):
            mask = self.attentive[step](a, prior)
            masks.append(mask)
            masked_x = x * mask
            out = self.feature_transform(masked_x)
            out = self.feature_transformers[step](out)
            d = out[:, :self.n_d]
            a = out[:, self.n_d:]
            steps_output.append(d)
            prior = prior * (1 - mask)

        return steps_output, masks


class TabNetRegressor(nn.Module):
    def __init__(self, n_features, n_d=32, n_a=32, n_steps=4, output_dim=1):
        super().__init__()
        self.encoder = TabNetEncoder(n_features, n_d, n_a, n_steps)
        self.head = nn.Sequential(
            nn.Linear(n_d, 32),
            nn.ReLU(),
            nn.Linear(32, output_dim),
        )

    def forward(self, x):
        steps_output, masks = self.encoder(x)
        d = torch.stack(steps_output, dim=1).sum(dim=1)
        return self.head(d).squeeze(), masks

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            out, _ = self.forward(x)
            if out.dim() == 0:
                return out.item()
            return out.cpu().numpy()


class TabNetBinaryClassifier(nn.Module):
    def __init__(self, n_features, n_d=24, n_a=24, n_steps=3):
        super().__init__()
        self.encoder = TabNetEncoder(n_features, n_d, n_a, n_steps)
        self.head = nn.Sequential(
            nn.Linear(n_d, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        steps_output, masks = self.encoder(x)
        d = torch.stack(steps_output, dim=1).sum(dim=1)
        return self.head(d).squeeze(), masks

    def predict(self, x):
        self.eval()
        with torch.no_grad():
            out, _ = self.forward(x)
            if out.dim() == 0:
                return out.item()
            return out.cpu().numpy()
