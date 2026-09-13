# FLOOD-X Presentation Script

## Five-minute demo script

### Slide 1: Title and opening | 0:00-0:30

**On screen:** FLOOD-X dashboard and Mumbai pilot map.

**Say:**

"Good morning. Urban flooding is not only a weather problem. It is a decision problem.

When heavy rain arrives, authorities need answers at street level: Which roads will flood first? How deep will the water become? Which drainage assets are failing? Which people are exposed? And can an ambulance still reach its destination?

FLOOD-X is an AI-powered urban flood nowcasting and drainage digital twin for the Kurla-BKC basin in Mumbai. It forecasts flood risk from now to three hours ahead and turns that forecast into operational decisions."

### Slide 2: The gap in current response | 0:30-1:00

**On screen:** Move from the dashboard overview to the rainfall and risk layers.

**Say:**

"Traditional warnings often tell us that a region may receive heavy rain. They do not tell an emergency operator which street is unsafe, why it is unsafe, or what action should happen next.

FLOOD-X combines rainfall nowcasting, terrain, roads, underground drainage, population exposure, field observations, and emergency routing in one map-based workflow.

The goal is to move from reactive response to proactive, explainable action."

### Slide 3: The digital twin | 1:00-1:45

**On screen:** Show rainfall grid, elevation or terrain layer, and drainage overlay.

**Say:**

"The platform has six cooperating engines.

First, the rainfall engine produces a spatial forecast across sixteen cells and seven time steps, from the current moment to plus 180 minutes.

Second, the surface runoff model estimates how much rain becomes runoff, taking impervious land cover into account.

Third, the drainage digital twin represents pipes and manholes as a directed hydraulic graph. It estimates capacity, utilization, blockage impact, surcharge, retained water, and drainage effectiveness.

The flood engine then combines these physical signals with terrain and flow accumulation to estimate street-level depth, probability, duration, and risk."

### Slide 4: From now to flood peak | 1:45-2:30

**On screen:** Use the timeline control at NOW, +30, +60, and +90 minutes.

**Say:**

"Now let us look at the forecast as a timeline rather than a static warning.

At the current time, risk is concentrated in the lowest and most drainage-stressed locations. As I move to plus thirty, plus sixty, and plus ninety minutes, the map shows the expected spread and intensification of flooding.

The operator can immediately see the active zones, critical roads, drainage stress, maximum predicted depth, and population exposure. This makes the forecast actionable: it supports road closures, drain inspection, resource staging, and evacuation prioritization before conditions peak."

### Slide 5: Explainability and what-if analysis | 2:30-3:30

**On screen:** Select LBS Marg or a critical road, then open the explanation panel.

**Say:**

"A prediction is only useful in an emergency if people can understand it.

When I select this road, FLOOD-X shows the predicted water depth, flood probability, time to flood, drainage status, and confidence. It also breaks the result into contributing factors such as rainfall, terrain depression, flow accumulation, and conduit surcharge.

For this example, the model estimates approximately 74 centimeters of water and a drainage conduit operating above capacity. These are engineering estimates for decision support, not surveyed measurements.

Now I can test an intervention scenario. I will increase drainage blockage to forty percent. The model recalculates surcharge, retained water, water level, affected roads, and exposure. This lets an operator compare scenarios before committing crews or equipment."

### Slide 6: People and response priorities | 3:30-4:00

**On screen:** Show exposure, alerts, critical locations, or response planner.

**Say:**

"FLOOD-X also connects hazard to people and response capacity.

The exposure engine estimates the population affected in each zone and assigns an evacuation priority. The response planner ranks actions, while alerts can be acknowledged and tracked by the operations team.

The system can also combine model predictions with citizen reports and uploaded municipal survey data. That creates a feedback loop between what the model expects and what field teams or residents are actually seeing."

### Slide 7: Flood-safe emergency routing | 4:00-4:45

**On screen:** Open emergency routing and select Ambulance, Asian Heart, and Bail Bazar.

**Say:**

"The final decision is often the most important one: can help get through?

Here I select an ambulance route from Asian Heart to Bail Bazar. The normal shortest route enters flooded segments and exceeds the vehicle's safe wading limit.

FLOOD-X compares that route with a flood-aware alternative. It penalizes or removes unsafe roads based on predicted depth, risk, and vehicle profile, then recommends an elevated corridor that avoids the flooded segments.

This is the difference between predicting a flood and supporting a safe response."

### Slide 8: Closing | 4:45-5:00

**On screen:** Return to the full dashboard with the route and risk layers visible.

**Say:**

"FLOOD-X brings together nowcasting, physics-informed flood prediction, drainage diagnostics, explainability, exposure analysis, community observations, and emergency routing in one operational platform.

The current system is a functional prototype. For production deployment, the next steps are live IMD and sensor feeds, calibrated drainage geometry, observed water-depth validation, uncertainty monitoring, and operational security.

Our closing message is simple: FLOOD-X does not just predict where water will go. It predicts where people can safely go.

Thank you."

## Demo checklist

- Start on the full Mumbai Kurla-BKC dashboard.
- Keep the timeline control visible during the forecast section.
- Select one recognizable critical road for the explainability section.
- Use the same scenario values throughout the demo: 85 mm rainfall initially, then 40% blockage for the what-if example.
- Show both the normal and recommended emergency routes.
- Describe depths and drainage levels as modeled estimates, not live surveyed measurements.
- If live external data is unavailable, state that the prototype is using its pilot and demo datasets.

## One-sentence version

"FLOOD-X is a three-hour, explainable urban flood decision-support platform that combines rainfall, terrain, drainage, population exposure, field observations, and flood-safe routing so authorities can act before the water arrives."

## Evaluation points for judges

### Innovation

FLOOD-X is innovative because it connects several decisions that are usually handled separately:

- It converts rainfall nowcasting into street-level flood depth and risk estimates.
- It models underground drainage as a digital twin, showing pipe utilization, blockage impact, surcharge, retained volume, and drainage effectiveness.
- It explains why a road is at risk instead of presenting only a black-box score.
- It links flood prediction to population exposure and vehicle-safe emergency routing.
- It provides a what-if simulator so an operator can compare rainfall and blockage scenarios before deploying resources.

The innovation is therefore not only a new prediction model. It is an operational chain from forecast to explanation to response.

### Working principle

FLOOD-X works in five steps:

1. **Ingest:** Collect rainfall, terrain, road, drainage, population, citizen-report, and municipal survey inputs.
2. **Nowcast:** Generate rainfall conditions for sixteen spatial cells across seven time steps from now to plus 180 minutes.
3. **Simulate:** Estimate surface runoff and propagate it through the drainage graph, accounting for pipe capacity and blockage.
4. **Predict and explain:** Combine rainfall, elevation, slope, flow accumulation, and drainage stress to estimate water depth, probability, duration, risk, and contributing factors.
5. **Act:** Prioritize exposed areas, test interventions, issue alerts, and recommend routes that respect each vehicle's safe wading limit.

### Social relevance

Urban floods threaten lives, mobility, health, livelihoods, and access to emergency services. FLOOD-X supports social resilience by:

- Giving authorities earlier, location-specific information for road closures and evacuation planning.
- Prioritizing areas by exposed population, not only by rainfall intensity.
- Helping ambulances, fire services, and police avoid dangerous roads.
- Making model reasoning visible to operators through plain-language explanations.
- Allowing citizen observations and field surveys to improve situational awareness.
- Providing a reusable approach for other Indian cities after local calibration.

FLOOD-X supports official emergency decisions; it does not replace them.

### Feasibility

The prototype is feasible because it uses practical and replaceable components: Python and FastAPI for services, React and Leaflet for the operational map, NetworkX for graph simulation, CSV/JSON/GeoJSON data interfaces, and standard routing algorithms. The repository already contains a runnable pilot workflow, API validation, a production frontend build, scenario controls, and demo data.

The deployment path is incremental:

1. Connect authoritative IMD radar, AWS, tide, pump, and IoT drain feeds.
2. Replace pilot geometry with surveyed municipal GIS and drainage data.
3. Calibrate predictions against observed water-depth and drainage time series.
4. Add authentication, audit logs, monitoring, uncertainty intervals, and high-availability hosting.
5. Expand city by city after validation.

### Commercial viability

FLOOD-X can be offered as a municipal and infrastructure-resilience platform with three practical revenue paths:

- **Municipal subscription:** annual access for flood monitoring, alerts, exposure analysis, and response planning.
- **Implementation and calibration services:** paid integration of city GIS, drainage surveys, sensors, and historical flood data.
- **Enterprise and API access:** risk intelligence for hospitals, logistics companies, insurers, transport operators, industrial estates, and large campuses.

The value proposition is measurable: earlier road closures, better crew staging, safer emergency travel, faster drainage intervention, and reduced disruption. A pilot can begin with one basin and a small number of operational users, then scale to additional wards and cities without changing the core architecture.

### Technology stack

FLOOD-X uses a practical full-stack architecture:

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Interactive operational dashboard and application state |
| Styling and UI | Tailwind CSS, PostCSS, Lucide React | Responsive layout, controls, and operational icons |
| Mapping | Leaflet and React Leaflet | Flood-risk, road, drainage, exposure, and routing layers |
| Backend API | Python, FastAPI, Pydantic, Uvicorn | Validated REST services and application delivery |
| Flood and drainage logic | Python, NetworkX, custom physics-informed models | Runoff, drainage graph, surcharge, flood risk, and explainability |
| Routing | A* / Dijkstra-style graph search, OSRM when available | Flood-aware emergency route calculation |
| Data | CSV, JSON, GeoJSON, pilot GIS data | Rainfall, terrain, roads, drainage, population, and reports |
| Machine learning | Scikit-learn model artifact with SHAP-style factor attribution | Risk classification and interpretable prediction support |

The architecture is modular: data sources can be replaced or upgraded without redesigning the operator interface. The current prototype runs locally with a Python API and compiled Vite frontend, and can later be hosted as a secured municipal web service.

## Possible judge questions and answers

### 1. What is the main innovation in FLOOD-X?

Most systems stop at rainfall or broad flood warnings. FLOOD-X connects rainfall nowcasting, terrain, drainage behavior, explainability, exposed population, and safe routing in one workflow. It turns a forecast into a decision.

### 2. Is this a real-time production system?

It is a functional prototype prepared for live integration. The current demonstration uses pilot and dataset-backed inputs. Production use would require authoritative live feeds, local calibration, validation against observed water levels, security, and operational monitoring.

### 3. How accurate are the water-depth predictions?

The displayed values are engineering estimates for decision support, not surveyed measurements. Accuracy must be established through historical and live calibration using observed depths, drainage geometry, storage characteristics, tide levels, and sensor data.

### 4. Why use both physics and AI?

Physics provides interpretable relationships between rainfall, runoff, terrain, and drainage capacity. Machine learning helps combine those signals and identify risk patterns. Together they provide useful predictions while preserving an explanation that an operator can inspect.

### 5. What happens when data is missing or connectivity fails?

The platform can operate with pilot, cached, uploaded, and citizen-provided data for demonstration and continuity. A production deployment should add data-quality indicators, uncertainty warnings, cached routing, and clear fallback procedures for operators.

### 6. How does the drainage digital twin help an authority?

It shows where runoff is likely to exceed modeled pipe capacity, how blockage changes the result, which nodes are surcharging, and where retained water may rise. This helps teams prioritize drain inspection, pumping, barricading, and maintenance.

### 7. How is emergency routing different from normal navigation?

Normal navigation optimizes distance or travel time. FLOOD-X also considers predicted depth, flood risk, road closure status, and the selected vehicle's wading clearance, so the recommended route is safer for the actual emergency vehicle.

### 8. Who would pay for this product?

Municipal disaster-management and urban operations teams are the primary customers. Additional customers include transport authorities, hospitals, logistics operators, insurers, industrial campuses, and infrastructure owners exposed to flood disruption.

### 9. Can this scale beyond Mumbai?

Yes, the software architecture is reusable. Each new city needs local rainfall, terrain, road, drainage, population, and calibration data. The rollout should begin with one validated basin and expand after operational testing.

### 10. What is the next milestone?

The next milestone is a calibrated pilot with one municipal basin: connect live or near-live sensor feeds, validate predicted depth against field observations, measure alert and routing usefulness, and establish an operator feedback loop.

### Closing answer

"FLOOD-X is not claiming that a prototype can replace a city control room. It gives that control room a clearer three-hour view of what may happen, why it may happen, who is affected, and which action is safer."