import numpy as np
from collections import defaultdict, deque


class DemandForecaster:
    def __init__(self, n_services=14):
        self.n_services = n_services
        self.hourly_demand = defaultdict(lambda: defaultdict(int))
        self.daily_counts = defaultdict(lambda: defaultdict(float))
        self.baselines = {}
        self.trained = False

    def train(self, hourly_data):
        self.hourly_demand.clear()
        self.daily_counts.clear()
        self.baselines.clear()

        for record in hourly_data:
            sid = record.get("service_id", "hourly")
            hour = record.get("hour", 12)
            day = record.get("day_of_week", 0)
            count = record.get("count", 1)

            self.hourly_demand[sid][hour] += count
            key = f"{day}_{hour}"
            self.daily_counts[sid][key] += count

        for sid in [self._sid_to_str(i) for i in range(self.n_services)]:
            values = list(self.hourly_demand[sid].values())
            self.baselines[sid] = float(np.mean(values)) / 10.0 if values else 0.3

        self.trained = True
        return True

    def forecast(self, service_id, day_of_week, hour_of_day):
        if not self.trained:
            return {"forecast": 0.5, "confidence": 0.0}

        baseline = self.baselines.get(service_id, 0.3)
        recent = self.hourly_demand[service_id].get(hour_of_day, 0)
        window = min(recent / 10.0, 1.0)

        hour_factor = {
            6: 0.3, 7: 0.5, 8: 0.7, 9: 0.9, 10: 1.0, 11: 1.0,
            12: 0.9, 13: 0.8, 14: 0.8, 15: 0.9, 16: 1.0, 17: 0.9,
            18: 0.7, 19: 0.5, 20: 0.4, 21: 0.3, 22: 0.2, 23: 0.1,
        }.get(hour_of_day, 0.5)

        weekend_boost = 1.3 if day_of_week >= 5 else 1.0
        forecast = (baseline * 0.4 + window * 0.3 + hour_factor * 0.3) * weekend_boost
        total_data_points = sum(self.hourly_demand[service_id].values())
        confidence = min(total_data_points / 50.0, 1.0)

        return {
            "forecast": round(min(forecast, 1.0), 4),
            "confidence": round(confidence, 4),
            "baseline": round(baseline, 4),
            "hour_factor": hour_factor,
            "weekend_boost": weekend_boost,
        }

    def forecast_all(self, day_of_week, hour_of_day):
        return {
            sid: self.forecast(sid, day_of_week, hour_of_day)
            for sid in [self._sid_to_str(i) for i in range(self.n_services)]
        }

    def _sid_to_str(self, sid):
        service_ids = [
            'hourly', 'bathroom', 'fridge', 'packing', 'kitchen',
            'dusting', 'wardrobe', 'car', 'plumber', 'electrician',
            'ac_repair', 'pest_control', 'painting', 'handyman',
        ]
        if isinstance(sid, int) and 0 <= sid < len(service_ids):
            return service_ids[sid]
        return sid


class SurgeDetector:
    def __init__(self):
        self.booking_history = defaultdict(lambda: deque(maxlen=120))
        self.supply_history = defaultdict(lambda: deque(maxlen=120))

    def record_state(self, service_id, booking_count, available_partners, timestamp=0):
        self.booking_history[service_id].append((timestamp, booking_count))
        self.supply_history[service_id].append((timestamp, available_partners))

    def train(self, historical_states):
        for state in historical_states:
            self.record_state(
                state.get("service_id", "hourly"),
                state.get("booking_count", 0),
                state.get("available_partners", 0),
                state.get("timestamp", 0),
            )

    def detect_surge(self, service_id, current_bookings_last_hour, available_partners):
        historical_counts = [c for _, c in self.booking_history.get(service_id, deque())]
        historical_partners = [p for _, p in self.supply_history.get(service_id, deque())]

        avg_demand = float(np.mean(historical_counts)) if historical_counts else max(current_bookings_last_hour, 1)
        avg_supply = float(np.mean(historical_partners)) if historical_partners else max(available_partners, 1)

        demand_ratio = current_bookings_last_hour / max(avg_demand, 1)
        supply_ratio = available_partners / max(avg_supply, 1)

        if demand_ratio > 2.0 and supply_ratio < 0.5:
            severity = "high"
            multiplier = min(2.0, 1.0 + (demand_ratio - 2.0) * 0.3)
        elif demand_ratio > 1.5 or supply_ratio < 0.7:
            severity = "medium"
            multiplier = min(1.5, 1.0 + max(demand_ratio - 1.5, 0) * 0.2)
        else:
            severity = "none"
            multiplier = 1.0

        return {
            "surge": severity != "none",
            "severity": severity,
            "multiplier": round(multiplier, 3),
            "demand_ratio": round(demand_ratio, 2),
            "supply_ratio": round(supply_ratio, 2),
        }

    def detect_all_surges(self, service_states):
        return {
            state.get("service_id"): self.detect_surge(
                state.get("service_id"),
                state.get("bookings_last_hour", 0),
                state.get("available_partners", 0),
            )
            for state in service_states if state.get("service_id")
        }
