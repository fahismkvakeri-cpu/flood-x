import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { KPISummary } from './components/KPISummary';
import { FloodMap } from './components/FloodMap';
import { TimelineControl } from './components/TimelineControl';
import { StreetDetailPanel } from './components/StreetDetailPanel';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { EmergencyRoutingPanel } from './components/EmergencyRoutingPanel';
import { AlertsBanner } from './components/AlertsBanner';
import { CitizenReportModal } from './components/CitizenReportModal';
import { DataUploadModal } from './components/DataUploadModal';
import { PredictionComparisonCard } from './components/PredictionComparisonCard';
import { ResponsePlanner } from './components/ResponsePlanner';
import { CriticalLocationPredictor } from './components/CriticalLocationPredictor';
import { AreaAnalysisPanel } from './components/AreaAnalysisPanel';
import { AppPage, MultiPageView } from './components/MultiPageView';
import FloodHero from './components/ui/scroll-locked-video-hero';
import {
  FloodPredictResponse,
  RoadPrediction,
  RouteCalculationResponse,
  AlertItem,
  CitizenReport,
  PopulationExposureResponse,
  EvacuationSummaryResponse,
  OperationsSummaryResponse,
  ResponsePlanResponse,
  InterventionImpactResponse,
  ObservationFusionResponse,
  CriticalLocationsResponse,
  AreaAnalysisResponse,
  LocationBriefResponse,
  UserLayer,
  IndiaRiskPoint,
  PlaceDetail,
} from './types';
import { Navigation, Sliders, Sparkles, Layers, Siren } from 'lucide-react';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AppPage>(() => {
    const page = window.location.hash.replace('#', '') as AppPage;
    return ['overview', 'brief', 'response', 'routing', 'scenarios', 'community'].includes(page) ? page : 'overview';
  });
  const [horizonMin, setHorizonMin] = useState<number>(60);
  const [rainScenarioMm, setRainScenarioMm] = useState<number>(85);
  const [blockagePct, setBlockagePct] = useState<number>(0);
  const [selectedRoad, setSelectedRoad] = useState<RoadPrediction | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('AMBULANCE');
  const [routeOrigin, setRouteOrigin] = useState<{ name: string; coords: [number, number] } | null>(null);
  const [routeDestination, setRouteDestination] = useState<{ name: string; coords: [number, number] } | null>(null);
  const [routePickMode, setRoutePickMode] = useState<'origin' | 'destination' | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showDrainage, setShowDrainage] = useState<boolean>(true);
  const [showCitizenPins, setShowCitizenPins] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'routing' | 'whatif' | 'layers' | 'response'>('routing');

  // New Section 27 States
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [userLayers, setUserLayers] = useState<UserLayer[]>([]);
  const [exposureData, setExposureData] = useState<PopulationExposureResponse | null>(null);
  const [evacuationData, setEvacuationData] = useState<EvacuationSummaryResponse | null>(null);
  const [operationsData, setOperationsData] = useState<OperationsSummaryResponse | null>(null);
  const [responsePlan, setResponsePlan] = useState<ResponsePlanResponse | null>(null);
  const [interventionImpact, setInterventionImpact] = useState<InterventionImpactResponse | null>(null);
  const [observationFusion, setObservationFusion] = useState<ObservationFusionResponse | null>(null);
  const [criticalLocations, setCriticalLocations] = useState<CriticalLocationsResponse | null>(null);
  const [aoiPolygon, setAoiPolygon] = useState<[number, number][]>([]);
  const [aoiDrawing, setAoiDrawing] = useState(false);
  const [areaAnalysis, setAreaAnalysis] = useState<AreaAnalysisResponse | null>(null);
  const [locationBrief, setLocationBrief] = useState<LocationBriefResponse | null>(null);

  const [predictData, setPredictData] = useState<FloodPredictResponse | null>(null);
  const [routeData, setRouteData] = useState<RouteCalculationResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const routeRequestRef = useRef(0);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [indiaRiskPoints, setIndiaRiskPoints] = useState<IndiaRiskPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string | null>(null);
  const [showDatasetPoints, setShowDatasetPoints] = useState<boolean>(true);
  const [showFloodZones, setShowFloodZones] = useState<boolean>(true);
  const [showEmergencyAssets, setShowEmergencyAssets] = useState<boolean>(true);
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null);
  const [selectedRiskPoint, setSelectedRiskPoint] = useState<IndiaRiskPoint | null>(null);

  const navigateToPage = (page: string) => {
    const nextPage = page as AppPage;
    window.location.hash = nextPage === 'overview' ? '' : nextPage;
    setActivePage(nextPage);
  };

  useEffect(() => {
    const syncPage = () => {
      const page = window.location.hash.replace('#', '') as AppPage;
      setActivePage(['overview', 'brief', 'response', 'routing', 'scenarios', 'community'].includes(page) ? page : 'overview');
    };
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  // Fetch flood predictions (Section 21)
  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/flood/risk-map?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (!res.ok) throw new Error(`Risk API returned ${res.status}`);
      const data = await res.json();
      setPredictData(data);
      setApiError(null);
      if (selectedRoad) {
        const updated = data.roads.find((r: RoadPrediction) => r.road_id === selectedRoad.road_id);
        if (updated) setSelectedRoad(updated);
      }
    } catch (err) {
      console.error('Error fetching flood predictions:', err);
      setApiError('Unable to load flood intelligence. Check that the backend is running, then retry.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch emergency routing (Section 10 & 21)
  const fetchRoute = async () => {
    const requestId = ++routeRequestRef.current;
    setRouteLoading(true);
    setRouteData(null);
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: routeOrigin ? undefined : 'J_ASIAN_HEART',
          destination_id: routeDestination ? undefined : 'J_BAIL_BAZAR',
          origin_name: routeOrigin?.name || 'Asian Heart Hospital (BKC)',
          destination_name: routeDestination?.name || 'Bail Bazar Emergency Zone',
          origin_coords: routeOrigin?.coords || [19.0665, 72.8655],
          destination_coords: routeDestination?.coords || [19.0805, 72.8845],
          vehicle_type: selectedVehicle,
          forecast_horizon_min: horizonMin,
          rainfall_scenario_mm: rainScenarioMm,
          blockage_pct: blockagePct,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (requestId !== routeRequestRef.current) return;
        setRouteData(data);
        setRouteError(data.recommended_route ? null : data.summary?.recommendation || 'No safe route is available under the current flood conditions.');
      } else {
        if (requestId !== routeRequestRef.current) return;
        const error = await res.json().catch(() => null);
        setRouteData(null);
        setRouteError(error?.detail || 'No safe route is available for these locations under the current flood conditions.');
      }
    } catch (err) {
      if (requestId !== routeRequestRef.current) return;
      console.error('Error calculating routes:', err);
      setRouteData(null);
      setRouteError('Route service is unavailable. Start the backend and try again.');
    } finally {
      if (requestId === routeRequestRef.current) setRouteLoading(false);
    }
  };

  // Fetch population exposure (Section 19.7)
  const fetchExposure = async () => {
    try {
      const res = await fetch(
        `/api/exposure?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setExposureData(data);
      }
    } catch (err) {
      console.error('Error fetching population exposure:', err);
    }
  };

  const fetchEvacuationSummary = async () => {
    try {
      const res = await fetch(
        `/api/evacuation/summary?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvacuationData(data);
      }
    } catch (err) {
      console.error('Error fetching evacuation summary:', err);
    }
  };

  const fetchOperationsSummary = async () => {
    try {
      const res = await fetch(
        `/api/operations/maintenance?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setOperationsData(data);
      }
    } catch (err) {
      console.error('Error fetching operations summary:', err);
    }
  };

  const fetchResponsePlan = async () => {
    try {
      const res = await fetch(`/api/operations/response-plan?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`);
      if (res.ok) setResponsePlan(await res.json());
    } catch (err) {
      console.error('Error fetching response plan:', err);
    }
  };

  const fetchCriticalLocations = async () => {
    try {
      const res = await fetch(`/api/flood/critical-locations?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}&limit=5`);
      if (res.ok) setCriticalLocations(await res.json());
    } catch (err) {
      console.error('Error fetching critical locations:', err);
    }
  };

  const analyzeAoi = async () => {
    if (aoiPolygon.length < 3) return;
    try {
      const res = await fetch('/api/analysis/area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon: aoiPolygon, forecast_horizon_min: horizonMin, rainfall_scenario_mm: rainScenarioMm, blockage_percent: blockagePct }),
      });
      if (res.ok) {
        setAreaAnalysis(await res.json());
        setAoiDrawing(false);
      }
    } catch (err) {
      console.error('Error analyzing drawn area:', err);
    }
  };

  const evaluateIntervention = async (interventionType: string) => {
    try {
      const res = await fetch('/api/simulation/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rainfall_scenario_mm: rainScenarioMm, blockage_percent: blockagePct, forecast_horizon_min: horizonMin, intervention_type: interventionType }),
      });
      if (res.ok) setInterventionImpact(await res.json());
    } catch (err) {
      console.error('Error evaluating intervention:', err);
    }
  };

  // Fetch citizen reports (Section 27.5)
  const fetchReports = async () => {
    try {
      const res = await fetch('/api/flood/reports');
      if (res.ok) {
        const data = await res.json();
        setCitizenReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching citizen reports:', err);
    }
  };

  // Fetch user layers (Section 27.5)
  const fetchLayers = async () => {
    try {
      const res = await fetch('/api/user/layers');
      if (res.ok) {
        const data = await res.json();
        setUserLayers(data.layers || []);
      }
    } catch (err) {
      console.error('Error fetching user layers:', err);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch(
        `/api/alerts?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const updateAlertWorkflow = async (alertId: string, action: 'ACKNOWLEDGE' | 'ESCALATE') => {
    try {
      const res = await fetch('/api/alerts/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, action }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setAlerts((current) => current.map((alert) => alert.id === alertId ? { ...alert, workflow_status: result.workflow_status, workflow_updated_at: result.updated_at } : alert));
    } catch (err) {
      console.error('Error updating alert workflow:', err);
    }
  };

  const fetchIndiaOverview = async () => {
    try {
      const res = await fetch(`/api/india/risk-overview?rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`);
      if (res.ok) setIndiaRiskPoints((await res.json()).points || []);
    } catch (err) {
      console.error('Error fetching India-wide overview:', err);
    }
  };

  const fetchPlaceDetail = async () => {
    try {
      const res = await fetch(`/api/india/operational-layers?rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`);
      if (res.ok) setPlaceDetail(await res.json());
    } catch (err) {
      console.error('Error fetching India-wide operational layers:', err);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchPredictions(),
      fetchRoute(),
      fetchExposure(),
      fetchEvacuationSummary(),
      fetchOperationsSummary(),
      fetchResponsePlan(),
      fetchCriticalLocations(),
      fetchAlerts(),
      fetchReports(),
      fetchLayers(),
      fetchIndiaOverview(),
      fetchPlaceDetail(),
    ]);
  }, [horizonMin, rainScenarioMm, blockagePct, selectedVehicle, routeOrigin, routeDestination]);

  useEffect(() => {
    if (!selectedReport) {
      setObservationFusion(null);
      return;
    }
    const roadId = selectedRoad?.road_id || predictData?.roads[0]?.road_id || 'ROAD-101';
    fetch(`/api/flood/fusion/${roadId}?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setObservationFusion(data))
      .catch((err) => console.error('Error fetching observation fusion:', err));
  }, [selectedReport, selectedRoad, predictData, horizonMin, rainScenarioMm, blockagePct]);

  // Section 27.1: Geolocation Handler
  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setFlyToCoords(coords);
          fetchLocationBrief(coords[0], coords[1]);
        },
        () => {
          // Fallback to Kurla Station Hub in pilot area
          const fallback: [number, number] = [19.0685, 72.8790];
          setUserLocation(fallback);
          setFlyToCoords(fallback);
          fetchLocationBrief(fallback[0], fallback[1]);
        }
      );
    } else {
      const fallback: [number, number] = [19.0685, 72.8790];
      setUserLocation(fallback);
      setFlyToCoords(fallback);
      fetchLocationBrief(fallback[0], fallback[1]);
    }
  };

  const fetchLocationBrief = async (latitude: number, longitude: number) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    try {
      const res = await fetch(`/api/brief/location?latitude=${latitude}&longitude=${longitude}&t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`);
      if (res.ok) setLocationBrief(await res.json());
    } catch (err) {
      console.error('Error fetching location brief:', err);
    }
  };

  // Landmark Selection from Search
  const handleSelectLandmark = (coords: [number, number], name: string) => {
    setFlyToCoords(coords);
    if (routePickMode === 'origin') {
      setRouteOrigin({ name, coords });
      setRoutePickMode(null);
      return;
    }
    if (routePickMode === 'destination') {
      setRouteDestination({ name, coords });
      setRoutePickMode(null);
      return;
    }
    if (!routeOrigin) {
      setRouteOrigin({ name, coords });
      return;
    }
    if (!routeDestination) {
      setRouteDestination({ name, coords });
      return;
    }

    // Reset the selection flow and start a fresh origin->destination pair.
    if (routeOrigin && routeDestination) {
      setRouteOrigin({ name, coords });
      setRouteDestination(null);
      return;
    }

    // If landmark matches a monitored road, select it
    if (predictData) {
      const found = predictData.roads.find((r) => r.name.toLowerCase().includes(name.toLowerCase()));
      if (found) setSelectedRoad(found);
    }
  };

  const handleSelectAlert = (alert: AlertItem) => {
    if (alert.road_id) {
      const road = predictData?.roads.find((candidate) => candidate.road_id === alert.road_id);
      if (road) setSelectedRoad(road);
    }
    if (alert.coords) setFlyToCoords(alert.coords);
  };

  const handleSelectMapLocation = (coords: [number, number]) => {
    handleSelectLandmark(coords, `Map point ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
  };

  // SIH 10-Step Demo Automation Script (Section 14)
  const triggerDemoStep = (step: number) => {
    if (step === 1) {
      // Step 1: Normal Map
      setHorizonMin(0);
      setRainScenarioMm(30);
      setBlockagePct(0);
      setSelectedRoad(null);
      setSelectedReport(null);
    } else if (step === 2) {
      // Step 2: Introduce Heavy Monsoon Rainfall
      setHorizonMin(30);
      setRainScenarioMm(85);
      setShowDrainage(true);
    } else if (step === 3) {
      // Step 3: Move Timeline to +60 min (Inundation Peak)
      setHorizonMin(60);
      setRainScenarioMm(100);
    } else if (step === 4) {
      // Step 4: Click WHY + 40% Drainage Blockage What-If
      setHorizonMin(60);
      setBlockagePct(40);
      if (predictData && predictData.roads.length > 0) {
        const kurla = predictData.roads.find((r) => r.road_id === 'ROAD-101') || predictData.roads[0];
        setSelectedRoad(kurla);
      }
    } else if (step === 5) {
      // Step 5: Flood-Safe Emergency Routing
      setHorizonMin(60);
      setSelectedVehicle('AMBULANCE');
      setSidebarTab('routing');
    }
  };

  if (activePage === 'brief') {
    return <FloodHero locationBrief={locationBrief} onEnterCommandCenter={() => navigateToPage('overview')} onUseLocation={handleUseMyLocation} onApplyCoordinates={fetchLocationBrief} />;
  }

  if (activePage !== 'overview') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950">
        <Navbar
          activeAlertCount={alerts.length}
          lastUpdate="17:42:00 IST"
          onUseMyLocation={handleUseMyLocation}
          onOpenUploadModal={() => setShowUploadModal(true)}
          onOpenReportModal={() => setShowReportModal(true)}
          onSelectLandmark={handleSelectLandmark}
          activePage={activePage}
          onNavigate={navigateToPage}
        />
        <AlertsBanner alerts={alerts} onSelectAlert={handleSelectAlert} onUpdateAlert={updateAlertWorkflow} />
        <MultiPageView
          page={activePage}
          criticalLocations={criticalLocations}
          responsePlan={responsePlan}
          operationsData={operationsData}
          evacuationData={evacuationData}
          routeOrigin={routeOrigin}
          routeDestination={routeDestination}
          routePickMode={routePickMode}
          routeError={routeError}
          routeData={routeData}
          onStartPicking={(mode) => { setRoutePickMode(mode); navigateToPage('overview'); }}
          onRecalculateRoute={fetchRoute}
          rainfallScenarioMm={rainScenarioMm}
          onRainfallChange={setRainScenarioMm}
          blockagePct={blockagePct}
          onBlockageChange={setBlockagePct}
          drainage={predictData?.drainage || null}
          interventionImpact={interventionImpact}
          onEvaluateIntervention={evaluateIntervention}
          onResetScenario={() => { setRainScenarioMm(85); setBlockagePct(0); setInterventionImpact(null); }}
          citizenReports={citizenReports}
          userLayers={userLayers}
          onOpenUpload={() => setShowUploadModal(true)}
          onOpenReport={() => setShowReportModal(true)}
          onSelectCriticalLocation={(location) => {
            const road = predictData?.roads.find((candidate) => candidate.road_id === location.road_id);
            if (road) setSelectedRoad(road);
            setFlyToCoords(location.coords);
            navigateToPage('overview');
          }}
        />
        <CitizenReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmitSuccess={(newReport) => { setCitizenReports([newReport, ...citizenReports]); setShowReportModal(false); }} defaultCoords={userLocation || [19.0720, 72.8760]} />
        <DataUploadModal isOpen={showUploadModal} currentLocation={userLocation} onClose={() => setShowUploadModal(false)} onLayerApplied={(newLayer) => { setUserLayers([...userLayers, { ...newLayer, user_location: userLocation ? { latitude: userLocation[0], longitude: userLocation[1], label: 'Browser current location' } : null }]); setShowUploadModal(false); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      {/* Top Navigation */}
      <Navbar
        activeAlertCount={alerts.length}
        lastUpdate="17:42:00 IST"
        onUseMyLocation={handleUseMyLocation}
        onOpenUploadModal={() => setShowUploadModal(true)}
        onOpenReportModal={() => setShowReportModal(true)}
        onSelectLandmark={handleSelectLandmark}
        activePage={activePage}
        onNavigate={navigateToPage}
      />

      {/* Real-time Alerts Ticker */}
      <AlertsBanner alerts={alerts} onSelectAlert={handleSelectAlert} onUpdateAlert={updateAlertWorkflow} />

      {/* SIH Section 14 Demo Flow Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-blue-950/70 border-b border-indigo-900/40 px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            Section 14: SIH Demo Script:
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => triggerDemoStep(1)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            1. Normal Map
          </button>
          <button
            onClick={() => triggerDemoStep(2)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            2. Heavy Rain
          </button>
          <button
            onClick={() => triggerDemoStep(3)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            3. +60m Peak
          </button>
          <button
            onClick={() => triggerDemoStep(4)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            4. Why & Block 40%
          </button>
          <button
            onClick={() => triggerDemoStep(5)}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition text-[11px] shadow-sm"
          >
            5. Safe Route
          </button>
        </div>
      </div>

      {/* Main KPI Row with WorldPop Exposure (Section 19.7) */}
      {predictData && (
        <KPISummary
          kpis={predictData.kpis}
          avgRainfall={predictData.nowcast.avg_intensity_mm_hr}
          confidencePct={predictData.nowcast.confidence_pct}
          exposureData={exposureData}
        />
      )}

      {/* Center Layout: Map + Side Control Panels */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-y-auto overflow-x-hidden">
        {/* Interactive GIS Map Area */}
        <div className="flex-1 min-w-0 min-h-[560px] lg:min-h-0 flex flex-col relative h-[62vh] lg:h-full">
          {predictData ? (
            <FloodMap
              roads={predictData.roads}
              drainage={predictData.drainage}
              citizenReports={citizenReports}
              selectedRoad={selectedRoad}
              selectedReport={selectedReport}
              userLocation={userLocation}
              onSelectRoad={(r) => {
                setSelectedRoad(r);
                setSelectedReport(null);
              }}
              onSelectCitizenReport={(rep) => {
                setSelectedReport(rep);
                setSelectedRoad(null);
              }}
              routeData={routeData}
              routeLoading={routeLoading}
              showDrainageLayer={showDrainage}
              showCitizenReports={showCitizenPins}
              onToggleDrainage={() => setShowDrainage(!showDrainage)}
              onToggleCitizenReports={() => setShowCitizenPins(!showCitizenPins)}
              flyToCoords={flyToCoords}
              indiaRiskPoints={indiaRiskPoints}
              onMapStatusChange={setMapStatus}
              showDatasetPoints={showDatasetPoints}
              onToggleDatasetPoints={() => setShowDatasetPoints((visible) => !visible)}
              placeDetail={placeDetail}
              showFloodZones={showFloodZones}
              showEmergencyAssets={showEmergencyAssets}
              onToggleFloodZones={() => setShowFloodZones((visible) => !visible)}
              onToggleEmergencyAssets={() => setShowEmergencyAssets((visible) => !visible)}
              onSelectRiskPoint={setSelectedRiskPoint}
              routePickMode={routePickMode}
              onSelectMapLocation={handleSelectMapLocation}
              onAddAoiPoint={(coords) => {
                setAreaAnalysis(null);
                setAoiPolygon((current) => [...current, coords]);
              }}
              alerts={alerts}
              onSelectAlert={handleSelectAlert}
              aoiPolygon={aoiPolygon}
              aoiDrawing={aoiDrawing}
              onToggleAoiDrawing={() => { setAoiDrawing((drawing) => !drawing); setAreaAnalysis(null); }}
              onAnalyzeAoi={analyzeAoi}
              onClearAoi={() => { setAoiPolygon([]); setAreaAnalysis(null); setAoiDrawing(false); }}
            />

          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
              <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/30 p-5 text-center shadow-xl">
                <h2 className="text-base font-bold text-red-200">Flood data unavailable</h2>
                <p className="mt-2 text-xs text-slate-300">
                  {loading ? 'Connecting to the FLOOD-X decision engine...' : apiError}
                </p>
                {!loading && (
                  <button
                    onClick={fetchPredictions}
                    className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Retry connection
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedRiskPoint && predictData && (
            <div className="absolute bottom-4 left-4 z-[700] w-80 max-w-[calc(100%-2rem)] rounded-xl border border-red-400/40 bg-slate-950/90 p-4 text-xs shadow-2xl backdrop-blur ring-1 ring-slate-800/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Why this region floods</p>
                  <h3 className="mt-1 text-sm font-bold text-white">{selectedRiskPoint.name}</h3>
                  <p className="mt-1 text-slate-400">{selectedRiskPoint.risk_level} risk · {selectedRiskPoint.predicted_depth_cm} cm projected depth</p>
                </div>
                <button onClick={() => setSelectedRiskPoint(null)} className="text-lg leading-none text-slate-400 hover:text-white" aria-label="Close explanation">×</button>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ['Rainfall intensity', selectedRiskPoint.rainfall_mm ? Math.min(100, selectedRiskPoint.rainfall_mm / 3) : 35, selectedRiskPoint.rainfall_mm ? `${selectedRiskPoint.rainfall_mm} mm recorded` : 'Heavy rainfall scenario'],
                  ['Low elevation', selectedRiskPoint.elevation_m !== undefined ? Math.max(5, 100 - selectedRiskPoint.elevation_m / 90) : 45, selectedRiskPoint.elevation_m !== undefined ? `${selectedRiskPoint.elevation_m} m elevation` : 'Terrain data unavailable'],
                  ['River discharge', selectedRiskPoint.river_discharge_m3s ? Math.min(100, selectedRiskPoint.river_discharge_m3s / 50) : 30, selectedRiskPoint.river_discharge_m3s ? `${selectedRiskPoint.river_discharge_m3s} m³/s` : 'Catchment flow contributes'],
                  ['Historical flooding', selectedRiskPoint.flood_occurred ? 85 : 25, selectedRiskPoint.flood_occurred ? 'Flood observed in dataset' : 'No flood label in this record'],
                ].map(([label, value, detail]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-slate-300">{label}</span><span className="text-red-300">{Math.round(Number(value))}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${Math.min(100, Number(value))}%` }} /></div>
                    <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-300">
                Flooding is most likely where intense rain exceeds drainage capacity, water collects in low terrain, and river or upstream discharge adds flow. This is a dataset-based explanation, not an official warning.
              </p>
            </div>
          )}

          {areaAnalysis && <AreaAnalysisPanel analysis={areaAnalysis} onClose={() => setAreaAnalysis(null)} />}

          {mapStatus && (
            <div className="pointer-events-none absolute bottom-24 left-4 z-40 max-w-sm rounded-lg border border-amber-400/40 bg-slate-950/90 px-3 py-2 text-xs text-amber-200 shadow-xl">
              {mapStatus}
            </div>
          )}

          {/* Bottom 0-3h Timeline Scrubber */}
          <TimelineControl
            currentHorizon={horizonMin}
            onSelectHorizon={(min) => setHorizonMin(min)}
            accumulatedRainMm={predictData?.nowcast.accumulated_rainfall_mm || 0}
          />
        </div>

        {/* Selected Road Detail Inspector (Section 21) */}
        {selectedRoad && (
          <div className="w-full lg:w-96 shrink-0">
            <StreetDetailPanel
            road={selectedRoad}
            onClose={() => setSelectedRoad(null)}
            timelineCurve={predictData?.timeline_projections[selectedRoad.road_id]}
            />
          </div>
        )}

        {/* Prediction vs Field Report Comparison Card (Section 27.8) */}
        {selectedReport && (
          <div className="w-full lg:w-96 shrink-0 p-3 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 overflow-y-auto">
            <PredictionComparisonCard
              report={selectedReport}
              road={predictData?.roads[0] || null}
              fusion={observationFusion}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        )}

        {/* Right Sidebar Control Deck */}
        {!selectedRoad && !selectedReport && (
          <div className="w-full lg:w-96 shrink-0 bg-slate-900/95 border-l border-slate-800 flex flex-col shadow-2xl z-30 overflow-y-auto">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
              <button
                onClick={() => setSidebarTab('routing')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'routing'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Safe Routing</span>
              </button>

              <button
                onClick={() => setSidebarTab('response')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'response'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Siren className="w-3.5 h-3.5" />
                <span>Response</span>
              </button>

              <button
                onClick={() => setSidebarTab('whatif')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'whatif'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>What-If</span>
              </button>

              <button
                onClick={() => setSidebarTab('layers')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'layers'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Layers</span>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="p-3 space-y-4 flex-1">
              {sidebarTab === 'routing' && (
                <>
                  <EmergencyRoutingPanel
                    routeOrigin={routeOrigin}
                    routeDestination={routeDestination}
                    routePickMode={routePickMode}
                    routeError={routeError}
                    routeData={routeData}
                    onStartPicking={(mode) => setRoutePickMode(mode)}
                    onRecalculateRoute={fetchRoute}
                  />

                  {evacuationData && (
                    <div className="rounded-xl border border-violet-500/40 bg-slate-800/50 p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-violet-300">Evacuation & Shelter</h3>
                        <span className="rounded border border-violet-700 bg-violet-950/60 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                          {evacuationData.evacuation_priority}
                        </span>
                      </div>

                      <div className="rounded-lg border border-violet-700/40 bg-violet-950/30 p-2.5 text-xs text-violet-100">
                        <div className="font-bold text-white">Recommended shelter</div>
                        <div className="mt-1 text-sm font-semibold">{evacuationData.recommended_shelter.name}</div>
                        <div className="mt-1 text-[11px] text-violet-200/80">{evacuationData.recommended_shelter.available_space} spaces available · {evacuationData.recommended_shelter.distance_km} km away</div>
                      </div>

                      <div className="space-y-2 text-[11px] text-slate-300">
                        {evacuationData.shelters.map((shelter) => (
                          <div key={shelter.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">{shelter.name}</span>
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">{shelter.suitability}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">{shelter.available_space} free / {shelter.capacity} total</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {operationsData && (
                    <div className="rounded-xl border border-amber-500/40 bg-slate-800/50 p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Field Ops & Maintenance</h3>
                        <span className="rounded border border-amber-700 bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                          {operationsData.service_health_pct}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                        <div className="rounded bg-slate-900/60 p-2 border border-slate-700">
                          <div className="text-slate-400">Critical</div>
                          <div className="text-lg font-bold text-red-300">{operationsData.priority_summary.critical}</div>
                        </div>
                        <div className="rounded bg-slate-900/60 p-2 border border-slate-700">
                          <div className="text-slate-400">High</div>
                          <div className="text-lg font-bold text-amber-300">{operationsData.priority_summary.high}</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-[11px] text-slate-300">
                        {operationsData.assets.map((asset) => (
                          <div key={asset.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">{asset.name}</span>
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{asset.priority}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">{asset.location} · {asset.status}</div>
                            <div className="mt-1 text-[10px] text-amber-200">{asset.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {sidebarTab === 'whatif' && (
                <WhatIfSimulator
                  rainfallScenarioMm={rainScenarioMm}
                  onRainfallChange={(v) => setRainScenarioMm(v)}
                  blockagePct={blockagePct}
                  onBlockageChange={(v) => setBlockagePct(v)}
                  drainage={predictData?.drainage}
                  onReset={() => {
                    setRainScenarioMm(85);
                    setBlockagePct(0);
                    setInterventionImpact(null);
                  }}
                  interventionImpact={interventionImpact}
                  onEvaluateIntervention={evaluateIntervention}
                />
              )}

              {sidebarTab === 'response' && (
                <>
                  {criticalLocations && (
                    <CriticalLocationPredictor
                      data={criticalLocations}
                      onSelectLocation={(location) => {
                        const road = predictData?.roads.find((candidate) => candidate.road_id === location.road_id);
                        if (road) setSelectedRoad(road);
                        setFlyToCoords(location.coords);
                      }}
                    />
                  )}
                  {responsePlan && <ResponsePlanner plan={responsePlan} />}
                </>
              )}

              {sidebarTab === 'layers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      User Uploaded Layers (Section 27.5)
                    </h4>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline"
                    >
                      + Add Layer
                    </button>
                  </div>

                  {userLayers.length === 0 ? (
                    <div className="bg-slate-800/40 p-4 rounded-xl text-center text-slate-400 text-xs">
                      No custom datasets uploaded yet. Click "+ Add Layer" to upload municipal surveys or road vectors.
                    </div>
                  ) : (
                    userLayers.map((l) => (
                      <div key={l.id} className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{l.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Category: {l.data_type} • {l.feature_count} features parsed
                        </div>
                      </div>
                    ))
                  )}

                  {/* Citizen Reports List */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Recent Citizen Observations ({citizenReports.length})
                    </h4>
                    {citizenReports.slice(0, 3).map((cr) => (
                      <div
                        key={cr.id}
                        onClick={() => setSelectedReport(cr)}
                        className="p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-lg cursor-pointer transition text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center font-semibold text-white">
                          <span className="truncate">{cr.location_name}</span>
                          <span className="text-amber-400 font-bold">{cr.depth_cm} cm</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{cr.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals (Section 27) */}
      <CitizenReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmitSuccess={(newReport) => {
          setCitizenReports([newReport, ...citizenReports]);
          setSelectedReport(newReport);
          setFlyToCoords(newReport.location);
        }}
        defaultCoords={userLocation || [19.0720, 72.8760]}
      />

      <DataUploadModal
        isOpen={showUploadModal}
        currentLocation={userLocation}
        onClose={() => setShowUploadModal(false)}
        onLayerApplied={(newLayer) => {
          setUserLayers([...userLayers, { ...newLayer, user_location: userLocation ? { latitude: userLocation[0], longitude: userLocation[1], label: 'Browser current location' } : null }]);
          setSidebarTab('layers');
        }}
      />
    </div>
  );
};

export default App;
