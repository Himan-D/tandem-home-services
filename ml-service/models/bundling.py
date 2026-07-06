import numpy as np
from collections import defaultdict


class ServiceBundler:
    def __init__(self, n_services=14):
        self.n_services = n_services
        self.co_occurrence = np.zeros((n_services, n_services))
        self.service_popularity = np.zeros(n_services)
        self.affinity = None
        self.trained = False

    def train(self, booking_histories):
        self.co_occurrence.fill(0)
        self.service_popularity.fill(0)

        for history in booking_histories:
            services = history if isinstance(history, list) else history.get("service_ids", [])
            for i, sid_a in enumerate(services):
                idx_a = self._to_idx(sid_a)
                self.service_popularity[idx_a] += 1
                for sid_b in services[i + 1:]:
                    idx_b = self._to_idx(sid_b)
                    self.co_occurrence[idx_a][idx_b] += 1
                    self.co_occurrence[idx_b][idx_a] += 1

        eps = 1e-8
        pop_norm = self.service_popularity / (np.max(self.service_popularity) + eps)
        co_occ_norm = self.co_occurrence / (np.max(self.co_occurrence) + eps)

        self.affinity = co_occ_norm * 0.7 + np.outer(pop_norm, pop_norm) * 0.3
        np.fill_diagonal(self.affinity, 0)
        self.trained = True
        return True

    def recommend_bundles(self, selected_service_ids, top_k=3, max_bundle_size=3):
        if self.affinity is None:
            return []

        idxs = [self._to_idx(s) for s in selected_service_ids]
        if not idxs:
            return []

        scores = np.sum(self.affinity[idxs], axis=0)
        scores[np.array(idxs)] = -1

        candidates = []
        used = set(idxs)
        for _ in range(min(top_k * 2, self.n_services)):
            best = np.argmax(scores)
            if scores[best] <= 0:
                break
            candidates.append(best)
            used.add(best)
            scores[best] = -1

        bundles = []
        for c in candidates:
            bundle_sids = [self._to_str(c)]
            complement_scores = self.affinity[c].copy()
            complement_scores[np.array(list(used))] = -1

            for _ in range(min(max_bundle_size - 1, 2)):
                best_comp = np.argmax(complement_scores)
                if complement_scores[best_comp] <= 0:
                    break
                bundle_sids.append(self._to_str(best_comp))
                complement_scores[best_comp] = -1
                used.add(best_comp)

            score = float(np.mean([
                self.affinity[c][self._to_idx(s)]
                for s in bundle_sids if s != self._to_str(c)
            ] or [0.5]))
            bundles.append({
                "services": bundle_sids,
                "bundle_score": round(score, 4),
                "savings_estimate": round(0.1 + score * 0.1, 3),
            })

        bundles.sort(key=lambda b: b["bundle_score"], reverse=True)
        return bundles[:top_k]

    def get_bundle_discount(self, bundle_services):
        count = len(bundle_services)
        if count <= 1:
            return 0
        return min(0.05 + count * 0.05, 0.25)

    def predict_frequently_bought_together(self, service_id, top_k=3):
        if self.affinity is None:
            return []

        idx = self._to_idx(service_id)
        scores = self.affinity[idx].copy()
        scores[idx] = -1
        top = np.argsort(scores)[-top_k:][::-1]
        return [(self._to_str(t), float(scores[t])) for t in top if scores[t] > 0]

    def _to_idx(self, sid):
        service_ids = [
            'hourly', 'bathroom', 'fridge', 'packing', 'kitchen',
            'dusting', 'wardrobe', 'car', 'plumber', 'electrician',
            'ac_repair', 'pest_control', 'painting', 'handyman',
        ]
        if isinstance(sid, int):
            return sid if 0 <= sid < self.n_services else 0
        return service_ids.index(sid) if sid in service_ids else 0

    def _to_str(self, idx):
        service_ids = [
            'hourly', 'bathroom', 'fridge', 'packing', 'kitchen',
            'dusting', 'wardrobe', 'car', 'plumber', 'electrician',
            'ac_repair', 'pest_control', 'painting', 'handyman',
        ]
        return service_ids[idx] if 0 <= idx < self.n_services else 'hourly'
