# 🌱 Precision Irrigation Planner
**Group 4 — BCS Batch 2**  
Prasann (066) · Dhruv (063) · Sanskruti (081) · Paridhi (061) · Parth (062) · Nisheeth (060)

---

## 🚀 Setup in VS Code (3 Steps)

### Step 1 — Open this folder in VS Code
```
File → Open Folder → select this pip-project folder
```

### Step 2 — Install dependencies
Open the **Terminal** in VS Code (Ctrl + ` ) and run:
```bash
npm install
```

### Step 3 — Start the server
```bash
npm start
```

Then open your browser at:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
pip-project/
├── server.js          ← Node.js + Express backend (all API routes)
├── .env               ← API key config (do not share publicly)
├── package.json       ← Dependencies
└── public/
    └── index.html     ← Full frontend (HTML + CSS + JS)
```

---

## 🔌 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/weather?city=London` | Real-time weather for any city |
| GET | `/api/forecast?city=London` | 24-hour forecast (8 slots × 3hr) |
| POST | `/api/decision` | Runs C++ irrigation decision logic |
| GET | `/api/search?q=ind` | City autocomplete (top 7 results) |

### POST /api/decision — Example
```json
// Request body
{
  "soilMoisture": 35,
  "humidity": 42,
  "temperature": 30,
  "crop": "Wheat"
}

// Response
{
  "decision": "Irrigation ON — Dry Conditions",
  "state": "on",
  "waterNeeded": 38.0,
  "recommendation": "Apply 38.0 units to reach field capacity of 70%"
}
```

---

## 🌍 Features
- Search **any city in the world** (200,000+ cities)
- Live city **autocomplete** as you type
- Real temperature, humidity, wind, pressure, visibility
- **24-hour forecast** strip with rain prediction
- Crop selector (Wheat / Rice / Corn) with soil moisture slider
- **Decision Engine** mirrors exact C++ logic
- Animated SVG soil moisture gauge
- Terminal-style log output

---

## 🔑 API Key
The key in `.env` is already set. If it stops working, get a free key at:  
👉 https://openweathermap.org/api → Sign up → Copy API key → paste in `.env`

---

## 🛠 For Live Reload During Development
```bash
npm run dev
```
(Uses nodemon — auto-restarts server on file changes)
