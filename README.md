# FLOOD-X: AI-Powered Urban Flood Nowcasting & Drainage Digital Twin

> **SIH Problem Statement**: SIH26085  
> **Organization**: Ministry of Earth Sciences (MoES)  
> **Department**: National Centre for Medium Range Weather Forecasting (NCMRWF)  
> **Theme**: Disaster Management  
> **Prediction Horizon**: 0–3 Hours (Nowcasting)  
> **Pilot Urban Area**: Mumbai – Kurla/BKC Basin ($10\text{ km}^2$)

---

## 🌊 Overview

FLOOD-X transitions urban flood management from **reactive disaster response** to **proactive, explainable nowcasting (0–3 hours ahead)**. Rather than relying solely on coarse regional rainfall forecasts, FLOOD-X fuses:
- **Doppler Weather Radar Nowcasting** (0–180 min advective storm track)
- **High-Resolution Digital Elevation Models (DEM)** & terrain depression analysis
- **Underground Drainage Network Graph** with Manning pipe hydraulics and surcharge detection
- **Hybrid Physics + AI Flood Engine** estimating street-level water depth ($cm$), inundation probability ($\%$), and risk category
- **Explainable AI (XAI)** decomposing flood causes (rainfall $\%$, conduit surcharge $\%$, depression $\%$, impervious surface $\%$)
- **Dynamic Emergency Routing** calculating flood-safe bypass corridors for emergency vehicles (Ambulance, Fire & Rescue, Police, Citizens)

---

## 🏛️ Six Core Engines

1. **Data Engine**: Pilot GIS model with DEM contours, road geometries, and drainage manholes & conduits.
2. **Rainfall Nowcast Engine**: 16-cell Doppler spatial nowcasting grid over $t=0, 15, 30, 60, 90, 120, 180$ minutes.
3. **Surface Runoff Engine**: SCS-CN / Rational method calculating catchment runoff from impervious land cover.
4. **Drainage Digital Twin**: NetworkX directed hydraulic graph calculating pipe capacity, utilization percentage, and manhole surcharging.
5. **Hybrid AI Flood Prediction Engine**: Physics-informed machine learning surrogate predicting water depth, risk classification, and SHAP factor attribution.
6. **Routing & Decision Engine**: Dynamic Dijkstra/A* routing with vehicle wading clearance constraints and "What-If" scenario sandbox.

---

## 🚀 Quickstart (Running the MVP)

### Prerequisites
- Python 3.10+
- Node.js 18+ (already compiled into `frontend/dist`)

### 1. Launch the Server (1-Click)
Double-click `run_flood_x.bat` or run:
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\flood-x\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Access the Platform
Open your browser and navigate to:
**`http://127.0.0.1:8000`**

- **Interactive GIS Map**: Click any road to inspect street details, water depth curves, and XAI cause breakdowns.
- **0–3h Timeline Slider**: Scrub from `NOW` to `+180m` or click `SIMULATE 0-3H` to watch roads turn from Green $\to$ Yellow $\to$ Orange $\to$ Red.
- **What-If Sandbox**: Adjust rainfall storms ($50\text{ mm}$ to $150\text{ mm}$) and drain blockage ($0\%$ to $75\%$) to observe immediate flood expansion.
- **Drainage Effectiveness**: Inspect each drainage area for estimated retained floodwater, modeled water level, conveyed runoff, and effectiveness. `WATER_LEVEL_RISING` means the modeled local storage is receiving more water than the connected network can convey.
- **Flood-Safe Emergency Routing**: Compare standard shortest route (trapped in $74\text{ cm}$ water) vs. recommended elevated corridor ($100\%$ clear, $3$ flooded segments avoided).
- **Interactive SIH Judge Walkthrough**: Click the minute-by-minute demo buttons in the top banner (`Min 0-1`, `Min 1-2`, `Min 2-3`, `Min 3-4`, `Min 5`).

---

## 🧪 Running Automated Tests

Run the built-in validation suite:
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\flood-x\backend
python test_api.py
```
Outputs:
- `[PASS] /api/status`
- `[PASS] /api/weather`
- `[PASS] /api/rainfall`
- `[PASS] /api/forecast`
- `[PASS] /api/flood/predict`
- `[PASS] /api/flood/{road_id}`
- `[PASS] /api/drainage`
- `[PASS] /api/routes/calculate`
- `[PASS] /api/alerts`
- `[PASS] Frontend production build verified`

---

## 🏆 SIH Judge 5-Minute Winning Demo Flow (PRD Section 36)

- **Minute 0–1 (The Problem)**: Show baseline city with approaching severe monsoon cloudburst.
- **Minute 1–2 (The Digital Twin)**: Showcase unified radar nowcast + DEM elevation slope + drainage graph overlay.
- **Minute 2–3 (0–3h Flood Peak)**: Scrub timeline from $0 \to +30 \to +60 \to +90$ min, watching low-elevation roads submerge.
- **Minute 3–4 (Explain & Simulate)**: Click LBS Marg / Kurla road to reveal $74\text{ cm}$ depth, $134\%$ surcharge, and XAI factor attribution. Adjust drain blockage slider to $40\%$ to demonstrate backwater ponding expansion.
- **Minute 5 (Emergency Safe Routing)**: Select Ambulance route from Asian Heart to Bail Bazar. Show normal route trapped in deep water, while FLOOD-X safe corridor routes via elevated SCLR bypass.
- **Closing Punchline**: *"We don't just predict where water will go. We predict where people can safely go."*

### Drainage diagnostic assumptions

The drainage digital twin reports a transparent engineering estimate, not a surveyed water-level measurement. It uses the pilot catchment assumption of 6.5 hectares per node and a one-hour simulation interval to convert unmet runoff into retained volume and estimated surface level. Effectiveness is the percentage of generated runoff conveyed by the modeled network; blockage and pipe capacity reduce that percentage. Calibrated levels require node storage geometry, invert levels, tidal boundary conditions, and observed time-series data.
