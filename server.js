const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────────
//  GET /api/weather?city=Indore
//  Returns current weather for any city in the world
// ─────────────────────────────────────────────────────────
app.get("/api/weather", async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim() === "") {
    return res.status(400).json({ error: "City name is required." });
  }

  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: city.trim(),
        appid: API_KEY,
        units: "metric",
      },
    });

    const d = response.data;

    // Send clean structured data to frontend
    res.json({
      success: true,
      city: d.name,
      country: d.sys.country,
      temperature: d.main.temp,
      feels_like: d.main.feels_like,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      description: d.weather[0].description,
      icon: d.weather[0].icon,
      wind_speed: d.wind.speed,
      wind_deg: d.wind.deg,
      visibility: d.visibility,
      clouds: d.clouds.all,
      sunrise: d.sys.sunrise,
      sunset: d.sys.sunset,
      coord: d.coord,
      timezone: d.timezone,
    });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: `City "${city}" not found. Check spelling and try again.` });
    }
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check your .env file." });
    }
    console.error("Weather API error:", err.message);
    res.status(500).json({ error: "Failed to fetch weather data. Try again." });
  }
});

// ─────────────────────────────────────────────────────────
//  GET /api/forecast?city=Indore
//  Returns 5-day / 3-hour forecast
// ─────────────────────────────────────────────────────────
app.get("/api/forecast", async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim() === "") {
    return res.status(400).json({ error: "City name is required." });
  }

  try {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        q: city.trim(),
        appid: API_KEY,
        units: "metric",
        cnt: 8, // next 24 hours (8 x 3hr slots)
      },
    });

    const slots = response.data.list.map((item) => ({
      time: item.dt_txt,
      temp: item.main.temp,
      humidity: item.main.humidity,
      description: item.weather[0].description,
      rain: item.rain ? item.rain["3h"] || 0 : 0,
    }));

    res.json({ success: true, city: response.data.city.name, forecast: slots });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: `City "${city}" not found.` });
    }
    console.error("Forecast API error:", err.message);
    res.status(500).json({ error: "Failed to fetch forecast data." });
  }
});

// ─────────────────────────────────────────────────────────
//  POST /api/decision
//  Runs irrigation decision logic (mirrors C++ code exactly)
// ─────────────────────────────────────────────────────────
app.post("/api/decision", (req, res) => {
  const { soilMoisture, humidity, temperature, crop } = req.body;

  if (soilMoisture === undefined || humidity === undefined || !crop) {
    return res.status(400).json({ error: "Missing required fields: soilMoisture, humidity, crop" });
  }

  const CROPS = {
    Wheat: { wiltingPoint: 30, fieldCapacity: 70 },
    Rice:  { wiltingPoint: 40, fieldCapacity: 80 },
    Corn:  { wiltingPoint: 35, fieldCapacity: 75 },
  };

  const cropData = CROPS[crop];
  if (!cropData) {
    return res.status(400).json({ error: `Unknown crop: ${crop}. Valid: Wheat, Rice, Corn` });
  }

  const ETC = 5.0;         // Evapotranspiration constant
  const THRESHOLD = 40.0;  // Soil moisture threshold

  const effectiveSM = soilMoisture - ETC;
  const waterNeeded = Math.max(0, cropData.fieldCapacity - effectiveSM);

  // ---- Decision Matrix (exact C++ logic) ----
  let decision, state;
  if (effectiveSM < THRESHOLD && humidity < 50) {
    decision = "Irrigation ON — Dry Conditions";
    state = "on";
  } else if (effectiveSM < THRESHOLD && humidity >= 50) {
    decision = "Moderate Conditions — Monitor";
    state = "monitor";
  } else {
    decision = "No Irrigation Needed";
    state = "off";
  }

  // ETc-based recommendation
  const etcAdjusted = (temperature > 35) ? ETC + 2 : (temperature < 15) ? ETC - 1 : ETC;

  res.json({
    success: true,
    input: { soilMoisture, humidity, temperature, crop },
    calculated: {
      effectiveSoilMoisture: parseFloat(effectiveSM.toFixed(2)),
      etcLoss: etcAdjusted,
      threshold: THRESHOLD,
      wiltingPoint: cropData.wiltingPoint,
      fieldCapacity: cropData.fieldCapacity,
    },
    decision,
    state,
    waterNeeded: parseFloat(waterNeeded.toFixed(2)),
    recommendation: waterNeeded > 0
      ? `Apply ${waterNeeded.toFixed(1)} units to reach field capacity of ${cropData.fieldCapacity}%`
      : "Soil is sufficiently hydrated. No water application required.",
  });
});

// ─────────────────────────────────────────────────────────
//  GET /api/search?q=ind   — city autocomplete suggestions
// ─────────────────────────────────────────────────────────
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ cities: [] });

  try {
    const response = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct`,
      { params: { q, limit: 7, appid: API_KEY } }
    );
    const cities = response.data.map((c) => ({
      name: c.name,
      country: c.country,
      state: c.state || "",
      lat: c.lat,
      lon: c.lon,
    }));
    res.json({ cities });
  } catch (err) {
    res.json({ cities: [] });
  }
});

// ─────────────────────────────────────────────────────────
//  Catch-all: serve index.html
// ─────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  Precision Irrigation Planner        ║`);
  console.log(`║  Server running on port ${PORT}          ║`);
  console.log(`║  Open: http://localhost:${PORT}          ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});
