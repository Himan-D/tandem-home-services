import os
import json
import torch
import shutil
from datetime import datetime, timezone


REGISTRY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "registry")


class ModelRegistry:
    def __init__(self, model_name):
        self.model_name = model_name
        self.model_dir = os.path.join(REGISTRY_DIR, model_name)
        os.makedirs(self.model_dir, exist_ok=True)

    def save(self, model, metadata=None):
        version = self._next_version()
        version_dir = os.path.join(self.model_dir, f"v{version}")
        os.makedirs(version_dir, exist_ok=True)

        model_path = os.path.join(version_dir, "model.pt")
        torch.save(model.state_dict(), model_path)

        manifest = {
            "model": self.model_name,
            "version": version,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "state_dict_path": model_path,
            "metadata": metadata or {},
        }
        manifest_path = os.path.join(version_dir, "manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2, default=str)

        latest_path = os.path.join(self.model_dir, "latest")
        if os.path.islink(latest_path) or os.path.exists(latest_path):
            os.remove(latest_path)
        os.symlink(f"v{version}", latest_path, target_is_directory=True)

        return version

    def load(self, model, version=None):
        version_dir = self._resolve_version_dir(version)
        if not version_dir:
            return False

        model_path = os.path.join(version_dir, "model.pt")
        if not os.path.exists(model_path):
            return False

        state_dict = torch.load(model_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict, strict=False)
        return True

    def get_manifest(self, version=None):
        version_dir = self._resolve_version_dir(version)
        if not version_dir:
            return None

        manifest_path = os.path.join(version_dir, "manifest.json")
        if os.path.exists(manifest_path):
            with open(manifest_path) as f:
                return json.load(f)
        return None

    def list_versions(self):
        if not os.path.exists(self.model_dir):
            return []

        versions = []
        for entry in sorted(os.listdir(self.model_dir)):
            if entry.startswith("v") and os.path.isdir(os.path.join(self.model_dir, entry)):
                manifest = self.get_manifest(int(entry[1:]))
                versions.append({
                    "version": int(entry[1:]),
                    "created_at": manifest["created_at"] if manifest else "unknown",
                    "metadata": manifest["metadata"] if manifest else {},
                })
        return sorted(versions, key=lambda v: v["version"])

    def delete_version(self, version):
        version_dir = os.path.join(self.model_dir, f"v{version}")
        if os.path.exists(version_dir):
            shutil.rmtree(version_dir)
            return True
        return False

    def _next_version(self):
        versions = self.list_versions()
        return (versions[-1]["version"] + 1) if versions else 1

    def _resolve_version_dir(self, version=None):
        if version is not None:
            vdir = os.path.join(self.model_dir, f"v{version}")
            return vdir if os.path.exists(vdir) else None

        latest = os.path.join(self.model_dir, "latest")
        if os.path.islink(latest) or os.path.exists(latest):
            resolved = os.path.realpath(latest)
            return resolved if os.path.exists(resolved) else None

        versions = self.list_versions()
        if versions:
            return os.path.join(self.model_dir, f"v{versions[-1]['version']}")
        return None


class TrainingMetrics:
    def __init__(self):
        self.loss_history = []
        self.final_loss = None
        self.accuracy = None
        self.sample_count = 0
        self.val_loss = None
        self.val_accuracy = None

    def add_epoch(self, loss):
        self.loss_history.append(float(loss))

    def complete(self, accuracy=None, val_loss=None, val_accuracy=None):
        self.final_loss = float(self.loss_history[-1]) if self.loss_history else None
        self.accuracy = float(accuracy) if accuracy is not None else None
        self.val_loss = float(val_loss) if val_loss is not None else None
        self.val_accuracy = float(val_accuracy) if val_accuracy is not None else None

    def to_dict(self):
        return {
            "final_loss": self.final_loss,
            "accuracy": self.accuracy,
            "sample_count": self.sample_count,
            "val_loss": self.val_loss,
            "val_accuracy": self.val_accuracy,
            "loss_trend": {
                "first": self.loss_history[0] if self.loss_history else None,
                "last": self.final_loss,
                "improvement": (
                    round(self.loss_history[0] - self.final_loss, 6)
                    if len(self.loss_history) > 1 else None
                ),
            },
        }
