"""
model.py - XGBoost tabanlı anomali tespit modeli.

Şu an mock (sahte) tahminler üretiyor.
Kendi eğitimli modelinizi entegre etmek için:
  1. Eğitilmiş modeli `model.joblib` olarak kaydedin
  2. load_model() fonksiyonunda joblib.load() kullanın
  3. predict() fonksiyonunu gerçek özellik vektörünü alacak şekilde güncelleyin
"""

import random
import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np


@dataclass
class Prediction:
    """Model tahmin sonucu."""
    label: str          # "NORMAL", "ANOMALY"
    threat_score: int   # 0-100
    confidence: float   # 0.0-1.0
    attack_type: str    # "BENIGN", "DDoS", "PortScan", "BruteForce", vb.
    inference_ms: float # Çıkarım süresi (ms)


# Saldırı türleri ve ağırlıkları (mock için)
ATTACK_TYPES = [
    ("BENIGN", 0.70),
    ("DDoS", 0.08),
    ("PortScan", 0.07),
    ("BruteForce", 0.05),
    ("SQL_Injection", 0.03),
    ("XSS", 0.03),
    ("Backdoor", 0.02),
    ("Botnet", 0.02),
]


class AnomalyDetector:
    """
    XGBoost tabanlı anomali tespit sınıfı.

    Şu an mock tahminler üretiyor. Gerçek model entegrasyonu için
    __init__ ve predict metodlarını güncelleyin.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.is_mock = True

        if model_path:
            try:
                import joblib
                self.model = joblib.load(model_path)
                self.is_mock = False
                print(f"[MODEL] Gerçek model yüklendi: {model_path}")
            except Exception as e:
                print(f"[MODEL] Model yüklenemedi ({e}), mock mod aktif.")

        if self.is_mock:
            print("[MODEL] Mock anomali tespit motoru aktif.")

    def predict(self, features: Optional[dict] = None) -> Prediction:
        """
        Tek bir paket/akış için tahmin üret.

        Args:
            features: Paket özellikleri (mock modda kullanılmaz)

        Returns:
            Prediction nesnesi
        """
        start = time.perf_counter()

        if self.is_mock:
            return self._mock_predict()

        # --- Gerçek model entegrasyonu ---
        # feature_vector = self._extract_features(features)
        # proba = self.model.predict_proba([feature_vector])[0]
        # label = "ANOMALY" if proba[1] > 0.5 else "NORMAL"
        # ...
        return self._mock_predict()

    def _mock_predict(self) -> Prediction:
        """Gerçekçi mock tahminler üret."""
        start = time.perf_counter()

        # Ağırlıklı rastgele saldırı türü seç
        types, weights = zip(*ATTACK_TYPES)
        attack_type = random.choices(types, weights=weights, k=1)[0]

        is_anomaly = attack_type != "BENIGN"

        if is_anomaly:
            threat_score = random.randint(45, 98)
            confidence = round(random.uniform(0.65, 0.99), 2)
        else:
            threat_score = random.randint(1, 15)
            confidence = round(random.uniform(0.85, 0.99), 2)

        elapsed = (time.perf_counter() - start) * 1000

        return Prediction(
            label="ANOMALY" if is_anomaly else "NORMAL",
            threat_score=threat_score,
            confidence=confidence,
            attack_type=attack_type,
            inference_ms=round(elapsed, 3),
        )


# Singleton
detector = AnomalyDetector()
