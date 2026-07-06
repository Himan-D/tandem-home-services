import torch
import torch.nn as nn
import numpy as np
import re
from collections import Counter


SENTIMENT_WORDS = {
    "positive": {
        "excellent", "amazing", "great", "fantastic", "wonderful", "perfect",
        "outstanding", "superb", "impressive", "love", "best", "awesome",
        "incredible", "brilliant", "exceptional", "professional", "friendly",
        "quick", "clean", "thorough", "reliable", "recommend", "satisfied",
        "happy", "pleased", "grateful", "thankful", "prompt", "efficient",
        "courteous", "skillful", "careful", "organized", "polite", "helpful",
    },
    "negative": {
        "terrible", "awful", "horrible", "worst", "poor", "bad", "disappointing",
        "disgusting", "rude", "unprofessional", "slow", "sloppy", "careless",
        "damage", "broken", "late", "unreliable", "avoid", "waste", "overpriced",
        "unhappy", "frustrated", "angry", "disappointed", "cheap", "incomplete",
        "messy", "unfinished", "scam", "dishonest", "ignored", "cancelled",
    },
    "intensifiers": {
        "very", "extremely", "incredibly", "absolutely", "really", "highly",
        "completely", "totally", "utterly", "so", "such",
    },
    "negations": {
        "not", "no", "never", "neither", "nor", "cannot", "can't",
        "don't", "doesn't", "didn't", "won't", "wouldn't",
    },
}


class ReviewAnalyzer:
    def __init__(self, n_features=8):
        self.tabnet = TabNetSentiment(n_features=n_features)
        self.vocab = {}
        self.trained = False

    def train(self, review_data):
        texts = [r.get("text", "") for r in review_data]
        labels = [r.get("sentiment", 0) for r in review_data]

        features = [self._extract_features(t) for t in texts]
        if len(features) >= 3:
            x = torch.tensor(np.array(features), dtype=torch.float32)
            y = torch.tensor(labels, dtype=torch.float32)

            optimizer = torch.optim.Adam(self.tabnet.parameters(), lr=0.005)
            criterion = nn.MSELoss()
            for _ in range(30):
                self.tabnet.train()
                optimizer.zero_grad()
                preds, _ = self.tabnet(x)
                loss = criterion(preds, y)
                loss.backward()
                optimizer.step()

        self.trained = True
        return True

    def analyze(self, text):
        features = self._extract_features(text)
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)

        if self.trained:
            self.tabnet.eval()
            with torch.no_grad():
                score, _ = self.tabnet(x)
                sentiment = float(score)
        else:
            sentiment = self._heuristic_score(text)

        return {
            "sentiment": round(max(min(sentiment, 1.0), 0.0), 4),
            "label": "positive" if sentiment > 0.6 else "negative" if sentiment < 0.4 else "neutral",
            "details": self._analyze_details(text),
        }

    def batch_analyze(self, texts):
        return [self.analyze(t) for t in texts]

    def _extract_features(self, text):
        text = text.lower()
        words = set(re.findall(r'\b[a-z]+\b', text))
        pos_count = sum(1 for w in words if w in SENTIMENT_WORDS["positive"])
        neg_count = sum(1 for w in words if w in SENTIMENT_WORDS["negative"])
        intensifier_count = sum(1 for w in words if w in SENTIMENT_WORDS["intensifiers"])
        negation_count = sum(1 for w in words if w in SENTIMENT_WORDS["negations"])
        total_words = len(words) or 1
        has_exclamation = 1.0 if "!" in text else 0.0
        word_count = min(len(text.split()) / 100, 1.0)
        char_count = min(len(text) / 500, 1.0)
        return [
            pos_count / total_words,
            neg_count / total_words,
            intensifier_count / max(total_words, 1),
            negation_count / max(total_words, 1),
            (pos_count - neg_count) / max(pos_count + neg_count, 1),
            has_exclamation,
            word_count,
            char_count,
        ]

    def _heuristic_score(self, text):
        features = self._extract_features(text)
        pos = features[0]
        neg = features[1]
        intensity = features[2]
        negation = features[3]
        net = pos - neg
        score = 0.5 + net * 0.4 + (intensity * 0.1) - (negation * 0.2)
        return max(min(score, 1.0), 0.0)

    def _analyze_details(self, text):
        text_lower = text.lower()
        words = set(re.findall(r'\b[a-z]+\b', text_lower))
        pos_found = [w for w in words if w in SENTIMENT_WORDS["positive"]]
        neg_found = [w for w in words if w in SENTIMENT_WORDS["negative"]]
        return {
            "positive_words": pos_found[:5],
            "negative_words": neg_found[:5],
            "has_intensifiers": any(w in text_lower for w in SENTIMENT_WORDS["intensifiers"]),
            "has_negations": any(w in text_lower for w in SENTIMENT_WORDS["negations"]),
        }

    def summarize_reviews(self, reviews):
        texts = [r.get("review", "") or r.get("text", "") for r in reviews]
        if not texts:
            return {"avg_sentiment": 0.5, "total": 0, "breakdown": {}}

        results = self.batch_analyze(texts)
        sentiments = [r["sentiment"] for r in results]
        labels = [r["label"] for r in results]
        label_counts = Counter(labels)

        all_pos_words = []
        all_neg_words = []
        for r, t in zip(results, texts):
            all_pos_words.extend(r["details"]["positive_words"])
            all_neg_words.extend(r["details"]["negative_words"])

        return {
            "avg_sentiment": round(float(np.mean(sentiments)), 4),
            "total": len(texts),
            "breakdown": {
                "positive": label_counts.get("positive", 0),
                "neutral": label_counts.get("neutral", 0),
                "negative": label_counts.get("negative", 0),
            },
            "common_positive": [w for w, _ in Counter(all_pos_words).most_common(5)],
            "common_negative": [w for w, _ in Counter(all_neg_words).most_common(5)],
        }


class TabNetSentiment(nn.Module):
    def __init__(self, n_features=8):
        super().__init__()
        from .tabnet import TabNetEncoder
        self.encoder = TabNetEncoder(n_features, n_d=16, n_a=16, n_steps=3)
        self.head = nn.Sequential(
            nn.Linear(16, 8), nn.ReLU(), nn.Linear(8, 1), nn.Sigmoid(),
        )

    def forward(self, x):
        steps, masks = self.encoder(x)
        d = torch.stack(steps, dim=1).sum(dim=1)
        return self.head(d).squeeze(), masks
