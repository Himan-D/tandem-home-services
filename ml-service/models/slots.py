import numpy as np
from collections import defaultdict


class SlotRecommender:
    def __init__(self):
        self.hour_scores = defaultdict(lambda: defaultdict(float))
        self.slot_counts = defaultdict(lambda: defaultdict(int))
        self.completion_rates = defaultdict(lambda: defaultdict(float))
        self.trained = False

    def train(self, slot_data):
        self.hour_scores.clear()
        self.slot_counts.clear()
        self.completion_rates.clear()

        for record in slot_data:
            sid = record.get("service_id", "hourly")
            hour = record.get("hour", 12)
            completed = record.get("completed", 0)
            total = record.get("total", 0)
            score = record.get("score", 0.5)

            self.hour_scores[sid][hour] += score
            self.slot_counts[sid][hour] += total
            self.completion_rates[sid][hour] = (
                self.completion_rates[sid][hour] + completed
            ) / max(total, 1)

        self.trained = True
        return True

    def recommend_slots(self, service_id, day_of_week, top_k=5):
        if not self.trained:
            return self._default_slots(day_of_week, top_k)

        hours = list(range(6, 22))
        scored = []
        for h in hours:
            count = self.slot_counts[service_id].get(h, 0)
            comp = self.completion_rates[service_id].get(h, 0.85)
            hist_score = self.hour_scores[service_id].get(h, 0.5)

            day_factor = 1.3 if day_of_week >= 5 else 1.0
            hour_demand = {7: 1.2, 8: 1.3, 9: 1.5, 10: 1.7, 11: 1.8,
                           14: 1.6, 15: 1.7, 16: 1.5, 17: 1.3, 18: 1.1}.get(h, 0.8)
            if day_of_week >= 5:
                hour_demand *= {9: 1.2, 10: 1.3, 11: 1.4, 12: 1.5,
                                13: 1.4, 14: 1.3, 15: 1.2}.get(h, 0.9)

            final_score = (
                hist_score * 0.3 +
                comp * 0.25 +
                hour_demand * 0.3 +
                day_factor * 0.15
            )
            scored.append((h, round(final_score, 4)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [
            {
                "hour": h,
                "score": s,
                "label": f"{h % 12 or 12}:00 {'PM' if h >= 12 else 'AM'}",
                "completion_rate": round(self.completion_rates[service_id].get(h, 0.85), 3),
            }
            for h, s in scored[:top_k]
        ]

    def get_availability_summary(self, service_id):
        if not self.trained:
            return {"peak_hours": ["10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM"],
                    "avg_completion_rate": 0.88}

        slots = self.recommend_slots(service_id, 0, top_k=16)
        peak = [s["label"] for s in slots if s["score"] > 0.7][:4]
        rates = [s["completion_rate"] for s in slots]
        avg_rate = float(np.mean(rates)) if rates else 0.85
        return {"peak_hours": peak or ["10:00 AM", "11:00 AM"],
                "avg_completion_rate": round(avg_rate, 3)}

    def _default_slots(self, day_of_week, top_k):
        base = [9, 10, 11, 14, 15, 16]
        if day_of_week >= 5:
            base = [8, 9, 10, 11, 12, 13, 14, 15]
        return [
            {"hour": h, "score": 0.7, "label": f"{h % 12 or 12}:00 {'PM' if h >= 12 else 'AM'}",
             "completion_rate": 0.85}
            for h in base[:top_k]
        ]
