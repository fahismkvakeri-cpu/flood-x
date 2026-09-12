import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { KPISummary } from './components/KPISummary';
import { FloodMap } from './components/FloodMap';
import { TimelineControl } from './components/TimelineControl';
import { StreetDetailPanel } from './components/StreetDetailPanel';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { EmergencyRoutingPanel } from './components/EmergencyRoutingPanel';
import { AlertsBanner } from './components/AlertsBanner';
import { FloodPredictResponse, RoadPrediction, RouteCalculationResponse, AlertItem } from './types';
import { Navigation, Sliders, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [horizonMin, setHorizonMin] = useState<number>(60);
  const [rainScenarioMm, setRainScenarioMm] = useState<number>(85);
  const [blockagePct, setBlockagePct] = useState<number>(0);
  const [selectedRoad, setSelectedRoad] = useState<RoadPrediction | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('AMBULANCE');
  const [showDrainage, setShowDrainage] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'routing' | 'whatif' | 'demo'>('routing');

  const [predictData, setPredictData] = useState<FloodPredictResponse | null>(null);
  const [routeData, setRouteData] = useState<RouteCalculationResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Fetch flood predictions
  const fetchPredictions = async () => {
    try {
      const res = await fetch(
        `/api/flood/predict?t=${horizonMin}&rain_mm=${rainScenarioMm}&blockage_pct=${blockagePct}`
      );
      if (res.ok) {
        const data = await res.json();
        setPredictData(data);
        // If a road is currently selected, refresh its state
        if (selectedRoad) {
          const updated = data.roads.find((r: RoadPrediction) => r.road_id === selectedRoad.road_id);
          if (updated) setSelectedRoad(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching flood predictions:', err);
    }
  };

  // Fetch emergency routing
  const fetchRoute = async () => {
    try {
      const res = await fetch('/api/routes/calculate', {
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
    Promise.all([fetchPredictions(), fetchRoute(), fetchAlerts()]);
  }, [horizonMin, rainScenarioMm, blockagePct, selectedVehicle]);

  // SIH 5-Minute Pitch Automation triggers (PRD Section 36)
  const triggerDemoStep = (step: number) => {
    if (step === 1) {
      // Min 0-1: Initial Storm Approaching
      setHorizonMin(0);
      setRainScenarioMm(60);
      setBlockagePct(0);
      setSelectedRoad(null);
    } else if (step === 2) {
      // Min 1-2: Digital twin loaded
      setHorizonMin(30);
      setShowDrainage(true);
      setRainScenarioMm(85);
    } else if (step === 3) {
      // Min 2-3: Peak nowcast (+60 to +90 min)
      setHorizonMin(60);
      setRainScenarioMm(100);
    } else if (step === 4) {
      // Min 3-4: Explainable AI & Drain Blockage
      setHorizonMin(90);
      setBlockagePct(40);
      if (predictData && predictData.roads.length > 0) {
        const kurla = predictData.roads.find((r) => r.road_id === 'ROAD-101') || predictData.roads[0];
        setSelectedRoad(kurla);
      }
    } else if (step === 5) {
      // Min 5: Emergency routing demonstration
      setHorizonMin(60);
      setSelectedVehicle('AMBULANCE');
      setSidebarTab('routing');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      {/* Top Navigation */}
      <Navbar activeAlertCount={alerts.length} lastUpdate="14:32:00 IST" />

      {/* Real-time Alerts Ticker */}
      <AlertsBanner alerts={alerts} />

      {/* SIH Judge Demo Shortcut Bar */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-blue-950/70 border-b border-indigo-900/40 px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-bold uppercase tracking-wider text-[11px]">SIH Judge Demo Walkthrough:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => triggerDemoStep(1)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            Min 0-1: The Problem
          </button>
          <button
            onClick={() => triggerDemoStep(2)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            Min 1-2: Digital Twin
          </button>
          <button
            onClick={() => triggerDemoStep(3)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            Min 2-3: 0-3h Flood Peak
          </button>
          <button
            onClick={() => triggerDemoStep(4)}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition text-[11px]"
          >
            Min 3-4: Explain & Surcharge
          </button>
          <button
            onClick={() => triggerDemoStep(5)}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition text-[11px] shadow-sm shadow-emerald-700/50"
          >
            Min 5: Safe Routing
          </button>
        </div>
      </div>

      {/* Main KPI Row */}
      {predictData && (
        <KPISummary
          kpis={predictData.kpis}
          avgRainfall={predictData.nowcast.avg_intensity_mm_hr}
          confidencePct={predictData.nowcast.confidence_pct}
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
              selectedRoad={selectedRoad}
              onSelectRoad={(r) => setSelectedRoad(r)}
              routeData={routeData}
              showDrainageLayer={showDrainage}
              onToggleDrainage={() => setShowDrainage(!showDrainage)}
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

        {/* Selected Road Detail Inspector (Slides in when road is clicked) */}
        {selectedRoad && (
          <StreetDetailPanel
            road={selectedRoad}
            onClose={() => setSelectedRoad(null)}
            timelineCurve={predictData?.timeline_projections[selectedRoad.road_id]}
          />
        )}

        {/* Right Sidebar Control Deck (Routing / What-If) */}
        {!selectedRoad && (
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
                <span>What-If Sandbox</span>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
