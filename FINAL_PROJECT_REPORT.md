# FLOOD-X Final Project Report

## 1. Project Overview

**Project:** FLOOD-X: AI-Powered Urban Flood Nowcasting and Drainage Digital Twin  
**Problem statement:** SIH26085  
**Domain:** Disaster management and urban resilience  
**Pilot area:** Mumbai, Kurla/BKC Basin, approximately 10.5 km2  
**Forecast horizon:** 0 to 180 minutes  
**Technology:** Python, FastAPI, NetworkX, React, TypeScript, Leaflet, Vite, Tailwind CSS

FLOOD-X is a flood-intelligence and emergency decision-support platform. It combines rainfall nowcasting, terrain and road data, drainage-network simulation, explainable flood-risk prediction, population exposure analysis, citizen observations, and flood-aware emergency routing in one operational dashboard.

The central objective is to help authorities move from reactive flood response to proactive action: identify streets likely to flood, understand why they are at risk, estimate drainage stress, prioritize exposed populations, and recommend safer routes for emergency vehicles.

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend language | TypeScript | Type-safe user-interface and API integration code |
| Frontend framework | React 18 | Component-based dashboard and interaction state |
| Build tool | Vite 5 | Development server and production bundling |
| Styling | Tailwind CSS, PostCSS, Autoprefixer | Responsive dashboard styling |
| Map interface | Leaflet and React Leaflet | Interactive flood, road, asset, and risk layers |
| UI icons | Lucide React | Operational controls and visual indicators |
| Backend language | Python 3.10+ | Flood, drainage, routing, and data-service implementation |
| API framework | FastAPI and Pydantic | REST endpoints, request validation, and service delivery |
| Graph and routing | NetworkX plus custom A* search | Drainage graph simulation and flood-aware route selection |
| Data formats | CSV, JSON, GeoJSON | Dataset ingestion, API responses, and map features |
| Web server | Uvicorn | Local and deployable ASGI application server |
| External services | Open-Meteo and OSRM, when available | Weather context and real-road routing alternatives |

The frontend is compiled into `frontend/dist` and can be served by the FastAPI application. The backend engines are organized under `backend/app/engine`, while pilot data and configuration are kept in separate modules.

## 3. Problem Statement

Urban flooding can develop rapidly when intense rainfall exceeds the capacity of storm-water infrastructure. Conventional warning systems often provide broad-area rainfall information without answering the operational questions that matter most:

- Which roads will become hazardous during the next few hours?
- How deep may the water become at street level?
- Is rainfall, terrain, or drainage surcharge the dominant cause?
- Which areas and populations require priority attention?
- Can emergency vehicles reach their destination without entering unsafe roads?

FLOOD-X addresses these questions with a short-horizon, explainable, map-based workflow.

## 4. Objectives

1. Provide a 0-3 hour flood nowcast for monitored roads.
2. Model the interaction between rainfall runoff and underground drainage capacity.
3. Produce street-level water-depth, probability, and risk-class predictions.
4. Explain the major factors contributing to each prediction.
5. Support rainfall and drainage-blockage what-if scenarios.
6. Estimate population exposure and evacuation priority.
7. Calculate flood-aware routes for ambulances, fire and rescue, police, public transport, and citizens.
8. Accept citizen flood reports and municipal or field-survey datasets.
9. Provide a reusable architecture that can later ingest calibrated live data.

## 5. System Architecture

FLOOD-X follows a layered client-server architecture.

### Frontend

The React and TypeScript frontend provides:

- Interactive Leaflet flood-risk map
- Timeline control for NOW through +180 minutes
- KPI summary for active zones, critical roads, drainage stress, and maximum depth
- Street-detail and explainability panel
- What-if rainfall and blockage simulator
- Emergency routing panel with vehicle profiles
- Alert banner and operational warnings
- Population exposure visualization
- Citizen flood-report modal
- Custom data-upload workflow
- India-wide dataset-backed risk and operational layers

### Backend

The FastAPI backend exposes prediction, simulation, routing, alert, exposure, search, report, upload, and map-data services. It serves the compiled frontend bundle when the production build is present.

### Core engines

1. **Rainfall Nowcast Engine**  
   Generates a 16-cell spatial rainfall forecast across the supported time steps: 0, 15, 30, 60, 90, 120, and 180 minutes.

2. **Drainage Digital Twin**  
   Represents the underground drainage system as a directed NetworkX graph. It estimates runoff, pipe utilization, blockage-adjusted capacity, surcharge, retained volume, estimated water level, and drainage effectiveness.

3. **Hybrid Flood Prediction Engine**  
   Combines rainfall, elevation, slope, flow accumulation, and drainage utilization into a normalized flood-risk score. It also estimates street-level depth, probability, duration, closure status, and confidence.

4. **Explainability Layer**  
   Converts model feature contributions into percentages and generates plain-language reasons such as heavy rainfall, low elevation, high upstream flow, or a surcharged conduit.

5. **Exposure Engine**  
   Uses the pilot population grid to estimate exposed population, exposure percentage, and evacuation priority.

6. **Emergency Routing Engine**  
   Compares the normal shortest route with a flood-aware route. It removes or penalizes roads that exceed a vehicle's wading limit and applies flood-risk and water-depth costs using an A*/Dijkstra-style graph search.

7. **Upload and Citizen Data Services**  
   Supports citizen observations and validation, preview, application, and listing of custom datasets such as drainage surveys.

## 6. Flood-Risk Methodology

The prototype uses a standardized weighted baseline model. Each input is normalized to the range 0 to 1 and combined as follows:

- Rainfall: 30%
- Elevation: 20%
- Slope: 15%
- Flow accumulation: 15%
- Drainage condition and utilization: 20%

The result is mapped to four classes:

| Normalized score | Risk level |
|---|---|
| 0.00-0.29 | Low |
| 0.30-0.59 | Medium |
| 0.60-0.79 | High |
| 0.80-1.00 | Critical |

Water depth is estimated using accumulated rainfall, imperviousness, terrain elevation, slope, flow accumulation, drainage surcharge, overflow, and estimated drainage water level. The result is a decision-support estimate rather than a surveyed measurement.

## 7. Drainage Digital Twin

The drainage model uses a directed graph of nodes and pipes. For each simulation, the platform:

1. Converts rainfall intensity to urban runoff using a rational-method approximation.
2. Applies a blockage-dependent capacity factor to each pipe.
3. Propagates flow through the drainage graph.
4. Identifies pipes operating above capacity.
5. Converts unmet flow into retained floodwater volume.
6. Estimates local water level from retained volume and the modeled storage area.
7. Reports network effectiveness and whether local water levels are rising.

The interface explicitly labels these outputs as engineering estimates. Calibration for operational deployment would require surveyed storage geometry, invert levels, tidal boundary conditions, pump behavior, and observed time-series data.

## 8. Key User Workflows

### Flood monitoring

An operator selects a forecast horizon and scenario. The map updates road colors, flood depth, risk class, closure state, drainage stress, alerts, and KPIs.

### Street investigation

Selecting a road opens its predicted depth, flood probability, time to flood, drainage status, contributing factors, and plain-language explanation.

### What-if analysis

The operator changes rainfall and blockage assumptions to observe how flood zones, drainage surcharge, water level, and exposure change.

### Emergency response

The operator selects a vehicle type and origin/destination. FLOOD-X compares the ordinary route with a route that avoids flooded or unsafe segments according to the vehicle's wading limit and risk penalty.

### Community and municipal data

Citizens can submit observed water depth and road status. Authorized workflows can upload, validate, preview, apply, and display custom municipal layers.

## 9. Data Sources and Prototype Data

The implementation is prepared to represent:

- IMD Doppler radar and AWS rainfall inputs
- NASA GPM IMERG rainfall context
- Copernicus DEM GLO-30 terrain data
- OpenStreetMap and Overpass road information
- WorldPop-style population distribution for the pilot area
- India-wide flood-risk CSV observations
- Open-source road routing through OSRM when available

The current repository contains pilot and demo datasets. Live integrations and formal calibration are deployment requirements rather than claims of the current prototype.

### Repository data inventory

| Data item | Current role | Status |
|---|---|---|
| `flood_risk_dataset_india.csv` | India-wide risk observations used for national overview layers | Included dataset |
| Pilot road and junction data | Road geometry, elevation, slope, flow accumulation, and routing graph | Prototype data in `backend/app/data/pilot_dataset.py` |
| Pilot drainage nodes and pipes | Directed drainage network, pipe capacity, and surcharge simulation | Prototype data in `backend/app/data/pilot_dataset.py` |
| DEM contour data | Terrain and depression context for the Mumbai pilot | Prototype data in `backend/app/data/pilot_dataset.py` |
| Pilot population grid | Exposure and evacuation-priority estimation | Configured pilot data in `backend/app/config.py` |
| Citizen reports | Observed water depth, road status, and drain status | Runtime prototype records |
| Uploaded municipal layers | Custom drainage or field-survey data after validation and application | Runtime prototype records |

### Pilot-area reference data

- Location: Mumbai, Maharashtra, India
- Coverage: Kurla/BKC Basin, approximately 10.5 km2
- Approximate center: 19.0680 latitude, 72.8720 longitude
- Configured pilot population: 185,000
- Supported forecast steps: 0, 15, 30, 60, 90, 120, and 180 minutes
- Default scenario: 85 mm rainfall with 0% drainage blockage
- Supported response profiles: ambulance, fire and rescue, police, public transport, and citizen car

The default and pilot values are suitable for demonstration and engineering prototyping. They should be replaced or calibrated with authoritative municipal and sensor data for operational deployment.

## 10. Validation and Testing

The backend validation suite covers the following areas:

- System health and data-source telemetry
- Current rainfall and 16-cell rainfall forecast
- GeoJSON flood-risk map generation
- Location prediction and explainability
- Rainfall and blockage simulation
- Drainage water-level and effectiveness diagnostics
- Flood-aware emergency routing
- Population exposure and evacuation priority
- Location search and citizen reports
- Custom dataset upload, validation, preview, and application
- Presence of the compiled frontend production bundle

The frontend production build is configured through Vite and TypeScript. The recommended validation commands are:

```powershell
cd backend
python test_api.py

cd ..\frontend
npm run build
```

## 11. Expected Impact

FLOOD-X can improve flood operations by:

- Providing actionable street-level intelligence instead of only regional warnings
- Making flood predictions easier to trust through explainable factors
- Highlighting drainage failure before conditions become critical
- Supporting rapid scenario analysis during changing rainfall conditions
- Reducing emergency travel through safer route selection
- Prioritizing response using population exposure
- Combining official models with observations from citizens and field teams

## 12. Current Scope and Limitations

This release is a functional prototype and demonstration platform. The following limitations must be addressed before safety-critical production use:

- Model outputs require calibration against observed water-depth and drainage time series.
- Pilot drainage geometry and storage assumptions are simplified.
- The rainfall nowcast and operational layers are partly simulated or dataset-backed.
- India-wide risk layers are derived from the included CSV and should not be treated as live national monitoring.
- External weather and OSRM requests depend on network availability and service limits.
- The application currently uses an in-process or lightweight data-storage approach for prototype workflows.
- Authentication, authorization, audit trails, high availability, and production observability are not yet presented as completed capabilities.
- Flood predictions should support, not replace, official emergency-management decisions.

## 13. Future Enhancements

1. Ingest live IMD radar, AWS, river, tide, pump, and IoT drain-sensor feeds.
2. Calibrate the model with historical flood depths and verified incident data.
3. Replace pilot geometry with municipal GIS, surveyed drainage, DEM, and land-use layers.
4. Add uncertainty intervals and model monitoring for forecast drift.
5. Introduce role-based access, secure storage, audit logs, and deployment observability.
6. Add offline or cached routing for emergency operations during connectivity loss.
7. Expand from the Kurla/BKC pilot to additional Indian cities.
8. Establish a formal alert governance process with escalation and acknowledgement tracking.

## 14. Conclusion

FLOOD-X demonstrates an end-to-end flood decision-support workflow for urban disaster management. Its main contribution is the combination of near-term rainfall scenarios, terrain-aware flood prediction, drainage digital-twin diagnostics, explainable risk outputs, population exposure, citizen intelligence, and flood-safe routing in a single operational interface.

The project provides a strong foundation for a calibrated municipal deployment. Its next priority is connecting the prototype engines to authoritative live data and validating their estimates against field observations before operational use.
