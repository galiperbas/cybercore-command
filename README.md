# CyberCore Command

**Gerçek Zamanlıya Yakın Ağ Anomali Tespit ve Görselleştirme Sistemi**

> TÜBİTAK 2242 — Yapay Zekâ Destekli Gerçek Zamanlı Ağ Trafiği Anomali Tespiti ve Web Tabanlı Görselleştirme Sistemi

XGBoost tabanlı makine öğrenmesi modeli ile ağ trafiğini gerçek zamanlıya yakın analiz eden, anomalileri tespit eden ve sonuçları web tabanlı bir komuta panelinde görselleştiren bütünleşik bir siber güvenlik sistemidir.

---

## Mimari

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│  Vite · TypeScript · Tailwind CSS v4 · Recharts          │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │ KPI      │  │ Trafik   │  │ Etkinlik  │  │   AI   │  │
│  │ Kartları │  │ Grafiği  │  │ Logları   │  │Chatbot │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘  │
│                       ▲ WebSocket                         │
└───────────────────────┼──────────────────────────────────┘
                        │  ws://localhost:8000/ws
┌───────────────────────┼──────────────────────────────────┐
│                    BACKEND (FastAPI)                       │
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐   │
│  │ Sniffer  │───▶│  Model   │───▶│  WebSocket Broker │   │
│  │ (Scapy)  │    │(XGBoost) │    │   (yayın)         │   │
│  └──────────┘    └──────────┘    └───────────────────┘   │
│       ▲                                                   │
│  Ağ Arayüzü                                              │
└──────────────────────────────────────────────────────────┘
```

**Veri Akışı:**

1. `sniffer.py` — Ağ paketlerini yakalar (Scapy veya sahte veri modu)
2. `model.py` — Her paketi XGBoost ile sınıflandırır (Normal / Anomali)
3. `main.py` — Sonuçları WebSocket ile tüm bağlı istemcilere yayınlar
4. `useNetworkTraffic.ts` — WebSocket verisini React state'ine bağlayan özel hook
5. `App.tsx` — Gösterge panelini canlı verilerle günceller

---

## Hızlı Başlangıç (Manuel Kurulum)

### Gereksinimler

- **Python** 3.10 veya üzeri
- **Node.js** 18 veya üzeri
- *(İsteğe bağlı)* Root / Yönetici yetkisi — canlı paket yakalama için gereklidir

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/galiperbas/cybercore-command.git
cd cybercore-command
```

### 2. Backend Kurulumu

```bash
# Sanal ortam oluşturun
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Sunucuyu başlatın (sahte veri modu — root gerektirmez)
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Backend `http://localhost:8000` adresinde çalışır. WebSocket uç noktası: `ws://localhost:8000/ws`.

### 3. Frontend Kurulumu

```bash
# Ayrı bir terminal penceresi açın
cd cybercore-command

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Frontend `http://localhost:3000` adresinde açılır ve backend'e otomatik olarak bağlanır.

### 4. Doğrulama

| Adres | Açıklama |
|-------|----------|
| `http://localhost:8000` | API durum bilgisi |
| `http://localhost:8000/docs` | Swagger UI (otomatik oluşturulan API belgeleri) |
| `http://localhost:3000` | Gösterge paneli (canlı veriler akıyor olmalı) |

---

## Docker ile Kurulum

Docker sayesinde Python, Node.js veya herhangi bir bağımlılık yüklemenize gerek kalmaz. Tek gereken Docker'dır.

### Gereksinimler

- [Docker](https://docs.docker.com/get-docker/) ve [Docker Compose](https://docs.docker.com/compose/install/)

### Çalıştırma

```bash
# Depoyu klonlayın
git clone https://github.com/galiperbas/cybercore-command.git
cd cybercore-command

# (İsteğe bağlı) Ortam değişkenlerini yapılandırın
cp .env.example .env
# .env dosyasını açıp GEMINI_API_KEY değerini girin (AI sohbet botu için)

# Tüm servisleri derleyip başlatın
docker compose up --build
```

Bu komut aşağıdaki servisleri ayağa kaldırır:

| Servis | Adres | Açıklama |
|--------|-------|----------|
| **Backend** | `http://localhost:8000` | FastAPI + WebSocket sunucusu |
| **Frontend** | `http://localhost:3000` | React gösterge paneli |

### Servisleri Durdurmak

```bash
docker compose down
```

### Kod Değişikliği Sonrası Yeniden Derleme

```bash
docker compose up --build
```

> **Not:** Backend container'ı `./api` dizinini volume olarak bağlar; bu sayede backend kodundaki değişiklikler otomatik olarak yansır. Frontend değişiklikleri için yeniden derleme gereklidir.

---

## Proje Yapısı

```
cybercore-command/
├── api/                          # Python Backend
│   ├── __init__.py
│   ├── main.py                   # FastAPI uygulaması + WebSocket + yayın
│   ├── model.py                  # XGBoost anomali tespiti (sahte / gerçek)
│   └── sniffer.py                # Scapy paket yakalama (sahte / canlı)
├── src/                          # React Frontend
│   ├── App.tsx                   # Ana gösterge paneli bileşeni
│   ├── hooks/
│   │   └── useNetworkTraffic.ts  # WebSocket özel hook'u
│   ├── services/
│   │   └── geminiService.ts      # AI sohbet botu (Gemini API)
│   ├── constants.ts              # Tip tanımları
│   └── index.css                 # Tailwind + özel tema
├── Dockerfile.backend            # Backend container imajı
├── Dockerfile.frontend           # Frontend container imajı
├── docker-compose.yml            # Çoklu servis orkestrasyon dosyası
├── requirements.txt              # Python bağımlılıkları
├── package.json                  # Node bağımlılıkları
├── .env.example                  # Ortam değişkenleri şablonu
├── vite.config.ts                # Vite yapılandırması
└── README.md
```

---

## WebSocket Mesaj Protokolü

Backend'den frontend'e gönderilen mesaj tipleri:

| Tip | Açıklama | Sıklık |
|-----|----------|--------|
| `kpi` | Toplam trafik, anomali sayısı, kritik sayısı | ~3 saniye |
| `log` | Tek bir log girişi (anomali veya periyodik) | Her anomali + her 5 paket |
| `logs_init` | İlk bağlantıda son 50 log | Bir kez |
| `traffic` | Trafik zaman serisi (son 20 pencere) | ~5 saniye |

---

## Kendi Modelinizi Entegre Etme

1. Eğitilmiş XGBoost modelinizi kaydedin:

```python
import joblib
joblib.dump(model, "api/model.joblib")
```

2. `api/model.py` dosyasında yolu güncelleyin:

```python
detector = AnomalyDetector(model_path="api/model.joblib")
```

3. `predict()` metodundaki gerçek özellik çıkarma mantığını etkinleştirin.

---

## Canlı Paket Yakalama (İsteğe Bağlı)

Sahte veri modu yerine gerçek ağ trafiği dinlemek için:

1. `api/main.py` dosyasında:

```python
sniffer = PacketSniffer(use_mock=False, interface="eth0")
```

2. Root yetkisiyle çalıştırın:

```bash
sudo uvicorn api.main:app --host 0.0.0.0 --port 8000
```

---

## Teknoloji Yığını

| Katman | Teknolojiler |
|--------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Framer Motion |
| **Backend** | FastAPI, Uvicorn, WebSocket |
| **ML Modeli** | XGBoost (sahte mod + gerçek model entegrasyon desteği) |
| **Paket Yakalama** | Scapy (sahte veri modu destekli) |
| **AI Sohbet Botu** | Google Gemini API |
| **Konteynerizasyon** | Docker, Docker Compose |

---

## Proje Yol Haritası

| Aşama | Durum | Açıklama |
|-------|-------|----------|
| 1. Model Seçimi ve Kıyaslama | ✅ Tamamlandı | 3 veri seti üzerinde 7 model karşılaştırması |
| 2. Backend + WebSocket | ✅ Tamamlandı | FastAPI, Scapy, sahte XGBoost boru hattı |
| 3. Frontend Gösterge Paneli | ✅ Tamamlandı | React ile canlı WebSocket entegrasyonu |
| 4. Gerçek Model Entegrasyonu | 🔧 Devam Ediyor | Eğitimli XGBoost → üretim ortamı |
| 5. AI Sohbet Botu | 🔧 Devam Ediyor | Gemini API entegrasyonu |

---

## Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `GEMINI_API_KEY` | Hayır | AI sohbet botu özelliği için Google Gemini API anahtarı |
| `VITE_WS_URL` | Hayır | Özel WebSocket adresi (varsayılan: `ws://localhost:8000/ws`) |

---

## Lisans

Bu proje TÜBİTAK 2242 yarışması kapsamında geliştirilmiştir.
