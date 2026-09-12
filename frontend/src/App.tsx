import React, { useState, useEffect } from 'react';
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
import {
  FloodPredictResponse,
  RoadPrediction,
  RouteCalculationResponse,
  AlertItem,
  CitizenReport,
  PopulationExposureResponse,
  UserLayer,
} from './types';
import { Navigation, Sliders, Sparkles, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [horizonMin, setHorizonMin] = useState<number>(60);
  const [rainScenarioMm, setRainScenarioMm] = useState<number>(85);
  const [blockagePct, setBlockagePct] = useState<number>(0);
  const [selectedRoad, setSelectedRoad] = useState<RoadPrediction | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('AMBULANCE');
  const [showDrainage, setShowDrainage] = useState<boolean>(true);
  const [showCitizenPins, setShowCitizenPins] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'routing' | 'whatif' | 'layers'>('routing');

  // New Section 27 States
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [userLayers, setUserLayers] = useState<UserLayer[]>([]);
  const [exposureData, setExposureData] = useState<PopulationExposureResponse | null>(null);

  const [predictData, setPredictData] = useState<FloodPredictResponse | null>(null);
  const [routeData, setRouteData] = useState<RouteCalculationResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Fetch flood predictions (Section 21)
  const fetchPredictions = async () => {
    try {
      const res = await fetch(
        `/api/flood/predict?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setPredictData(data);
        if (selectedRoad) {
          const updated = data.roads.find((r: RoadPrediction) => r.road_id === selectedRoad.road_id);
          if (updated) setSelectedRoad(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching flood predictions:', err);
    }
  };

  // Fetch emergency routing (Section 10 & 21)
  const fetchRoute = async () => {
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: 'J_ASIAN_HEART',
          destination_id: 'J_BAIL_BAZAR',
          vehicle_type: selectedVehicle,
          forecast_horizon_min: horizonMin,
          rainfall_scenario_mm: rainScenarioMm,
          blockage_pct: blockagePct,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRouteData(data);
      }
    } catch (err) {
      console.error('Error calculating routes:', err);
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

  useEffect(() => {
    Promise.all([fetchPredictions(), fetchRoute(), fetchExposure(), fetchAlerts(), fetchReports(), fetchLayers()]);
  }, [horizonMin, rainScenarioMm, blockagePct, selectedVehicle]);

  // Section 27.1: Geolocation Handler
  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setFlyToCoords(coords);
        },
        () => {
          // Fallback to Kurla Station Hub in pilot area
          const fallback: [number, number] = [19.0685, 72.8790];
          setUserLocation(fallback);
          setFlyToCoords(fallback);
        }
      );
    } else {
      const fallback: [number, number] = [19.0685, 72.8790];
      setUserLocation(fallback);
      setFlyToCoords(fallback);
    }
  };

  // Landmark Selection from Search
  const handleSelectLandmark = (coords: [number, number], name: string) => {
    setFlyToCoords(coords);
    // If landmark matches a monitored road, select it
    if (predictData) {
      const found = predictData.roads.find((r) => r.name.toLowerCase().includes(name.toLowerCase()));
      if (found) setSelectedRoad(found);
    }
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
      />

      {/* Real-time Alerts Ticker */}
      <AlertsBanner alerts={alerts} />

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
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Interactive GIS Map Area */}
        <div className="flex-1 flex flex-col relative h-full">
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
              showDrainageLayer={showDrainage}
              showCitizenReports={showCitizenPins}
              onToggleDrainage={() => setShowDrainage(!showDrainage)}
              onToggleCitizenReports={() => setShowCitizenPins(!showCitizenPins)}
              flyToCoords={flyToCoords}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Initializing Pilot Urban Twin...
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
          <StreetDetailPanel
            road={selectedRoad}
            onClose={() => setSelectedRoad(null)}
            timelineCurve={predictData?.timeline_projections[selectedRoad.road_id]}
          />
        )}

        {/* Prediction vs Field Report Comparison Card (Section 27.8) */}
        {selectedReport && (
          <div className="w-full md:w-96 p-3 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 overflow-y-auto">
            <PredictionComparisonCard
              report={selectedReport}
              road={predictData?.roads[0] || null}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        )}

        {/* Right Sidebar Control Deck */}
        {!selectedRoad && !selectedReport && (
          <div className="w-full md:w-96 bg-slate-900/95 border-l border-slate-800 flex flex-col shadow-2xl z-30 overflow-y-auto">
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
                <EmergencyRoutingPanel
                  routeData={routeData}
                  selectedVehicle={selectedVehicle}
                  onSelectVehicle={(v) => setSelectedVehicle(v)}
                  onRecalculateRoute={fetchRoute}
                />
              )}

              {sidebarTab === 'whatif' && (
                <WhatIfSimulator
                  rainfallScenarioMm={rainScenarioMm}
                  onRainfallChange={(v) => setRainScenarioMm(v)}
                  blockagePct={blockagePct}
                  onBlockageChange={(v) => setBlockagePct(v)}
                  onReset={() => {
                    setRainScenarioMm(85);
                    setBlockagePct(0);
                  }}
                />
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
        onClose={() => setShowUploadModal(false)}
        onLayerApplied={(newLayer) => {
          setUserLayers([...userLayers, newLayer]);
          setSidebarTab('layers');
        }}
      />
    </div>
  );
};

export default App;
