import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RoadPrediction, RouteCalculationResponse, DrainageSimulation, CitizenReport } from '../types';

interface FloodMapProps {
  roads: RoadPrediction[];
  drainage: DrainageSimulation | null;
  citizenReports: CitizenReport[];
  selectedRoad: RoadPrediction | null;
  selectedReport: CitizenReport | null;
  userLocation: [number, number] | null;
  onSelectRoad: (road: RoadPrediction) => void;
  onSelectCitizenReport: (report: CitizenReport) => void;
  routeData: RouteCalculationResponse | null;
  showDrainageLayer: boolean;
  showCitizenReports: boolean;
  onToggleDrainage: () => void;
  onToggleCitizenReports: () => void;
  flyToCoords?: [number, number] | null;
}

export const FloodMap: React.FC<FloodMapProps> = ({
  roads,
  drainage,
  citizenReports,
  selectedRoad,
  selectedReport,
  userLocation,
  onSelectRoad,
  onSelectCitizenReport,
  routeData,
  showDrainageLayer,
  showCitizenReports,
  onToggleDrainage,
  onToggleCitizenReports,
  flyToCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drainageLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reportLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [19.0690, 72.8720],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    roadLayerGroupRef.current = L.layerGroup().addTo(map);
    drainageLayerGroupRef.current = L.layerGroup().addTo(map);
    reportLayerGroupRef.current = L.layerGroup().addTo(map);
    userLocLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Pan / FlyTo
  useEffect(() => {
    if (mapInstanceRef.current && flyToCoords) {
      mapInstanceRef.current.flyTo(flyToCoords, 15, { duration: 1.2 });
    }
  }, [flyToCoords]);

  // Update Road Polylines
  useEffect(() => {
    if (!roadLayerGroupRef.current || !roads) return;
    roadLayerGroupRef.current.clearLayers();

    roads.forEach((r) => {
      const isSelected = selectedRoad?.road_id === r.road_id;
      const isCritical = r.risk_level === 'Critical' || r.risk_level === 'High';

      const polyline = L.polyline(r.coords, {
        color: r.color,
        weight: isSelected ? 8 : (isCritical ? 6 : 4),
        opacity: isSelected ? 1.0 : (isCritical ? 0.9 : 0.75),
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: r.is_closed ? '6, 6' : undefined,
      });

      polyline.bindTooltip(
        `<strong>${r.name}</strong><br/>Predicted Depth: <b style="color:${r.color}">${r.predicted_depth_cm} cm</b> (${r.risk_level} Risk)<br/>Drain Util: ${r.drain_utilization_pct}%`,
        { sticky: true }
      );

      polyline.on('click', () => {
        onSelectRoad(r);
      });

      polyline.addTo(roadLayerGroupRef.current!);
    });
  }, [roads, selectedRoad, onSelectRoad]);

  // Update Drainage Network Layer
  useEffect(() => {
    if (!drainageLayerGroupRef.current) return;
    drainageLayerGroupRef.current.clearLayers();

    if (!showDrainageLayer || !drainage) return;

    Object.values(drainage.nodes).forEach((n) => {
      const isSurcharged = n.is_surcharged;
      const marker = L.circleMarker(n.coords, {
        radius: isSurcharged ? 7 : 4,
        color: isSurcharged ? '#ef4444' : '#38bdf8',
        fillColor: isSurcharged ? '#dc2626' : '#0284c7',
        fillOpacity: 0.9,
        weight: isSurcharged ? 3 : 1.5,
      });

      marker.bindTooltip(
        `<strong>${n.name}</strong><br/>Status: <b>${n.status}</b><br/>Inflow: ${n.inflow_m3s} m³/s`,
        { sticky: true }
      );

      marker.addTo(drainageLayerGroupRef.current!);
    });
  }, [drainage, showDrainageLayer]);

  // Update Citizen Reports Pins (Section 27.3)
  useEffect(() => {
    if (!reportLayerGroupRef.current) return;
    reportLayerGroupRef.current.clearLayers();

    if (!showCitizenReports || !citizenReports) return;

    citizenReports.forEach((rep) => {
      const isSelected = selectedReport?.id === rep.id;
      const marker = L.circleMarker(rep.location, {
        radius: isSelected ? 9 : 7,
        color: '#ffffff',
        fillColor: rep.depth_cm >= 40 ? '#ef4444' : '#f59e0b',
        fillOpacity: 1.0,
        weight: isSelected ? 3 : 2,
      });

      marker.bindTooltip(
        `<strong>🌧️ ${rep.location_name}</strong><br/>Observed Depth: <b>${rep.depth_cm} cm</b> (${rep.water_depth})<br/>Status: ${rep.road_status}<br/><i>Click to compare with model</i>`,
        { sticky: true }
      );

      marker.on('click', () => {
        onSelectCitizenReport(rep);
      });

      marker.addTo(reportLayerGroupRef.current!);
    });
  }, [citizenReports, showCitizenReports, selectedReport, onSelectCitizenReport]);

  // Update User Location Marker (Section 27.1)
  useEffect(() => {
    if (!userLocLayerGroupRef.current) return;
    userLocLayerGroupRef.current.clearLayers();

    if (userLocation) {
      // Pulse outer circle
      L.circleMarker(userLocation, {
        radius: 14,
        color: '#38bdf8',
        fillColor: '#0284c7',
        fillOpacity: 0.25,
        weight: 1.5,
      }).addTo(userLocLayerGroupRef.current);

      // Core blue dot
      L.circleMarker(userLocation, {
        radius: 6,
        color: '#ffffff',
        fillColor: '#0ea5e9',
        fillOpacity: 1.0,
        weight: 2,
      }).bindTooltip('📍 Your Current GPS Location', { permanent: false }).addTo(userLocLayerGroupRef.current);
    }
  }, [userLocation]);

  // Update Emergency Route Overlays (Section 10)
  useEffect(() => {
    if (!routeLayerGroupRef.current) return;
    routeLayerGroupRef.current.clearLayers();

    if (!routeData) return;

    // 1. Normal Route (Red Dashed)
    if (routeData.normal_route && routeData.normal_route.coordinates.length > 0) {
      const normalLine = L.polyline(routeData.normal_route.coordinates, {
        color: '#f87171',
        weight: 5,
        opacity: 0.7,
        dashArray: '8, 8',
      });
      normalLine.bindTooltip(`⚠️ Normal Route: ${routeData.normal_route.estimated_duration_min} min (HIGH RISK)`, {
        sticky: true,
      });
      normalLine.addTo(routeLayerGroupRef.current);
    }

    // 2. Recommended Safe Route (Solid Green with Glow)
    if (routeData.recommended_route && routeData.recommended_route.coordinates.length > 0) {
      L.polyline(routeData.recommended_route.coordinates, {
        color: '#10b981',
        weight: 9,
        opacity: 0.35,
      }).addTo(routeLayerGroupRef.current);

      const safeLine = L.polyline(routeData.recommended_route.coordinates, {
        color: '#34d399',
        weight: 5,
        opacity: 1.0,
      });
      safeLine.bindTooltip(`🛡️ FLOOD-X Safe Route: ${routeData.recommended_route.estimated_duration_min} min (CLEAR)`, {
        sticky: true,
      });
      safeLine.addTo(routeLayerGroupRef.current);
    }

    // 3. Origin / Dest Pins
    L.circleMarker(routeData.origin.coords, {
      radius: 8,
      color: '#ffffff',
      fillColor: '#3b82f6',
      fillOpacity: 1.0,
      weight: 2.5,
    }).bindTooltip(`START: ${routeData.origin.name}`).addTo(routeLayerGroupRef.current);

    L.circleMarker(routeData.destination.coords, {
      radius: 8,
      color: '#ffffff',
      fillColor: '#10b981',
      fillOpacity: 1.0,
      weight: 2.5,
    }).bindTooltip(`DESTINATION: ${routeData.destination.name}`).addTo(routeLayerGroupRef.current);
  }, [routeData]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-slate-950 overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Layer Control Pills (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={onToggleDrainage}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${
            showDrainageLayer
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showDrainageLayer ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>Drainage Graph</span>
        </button>

        <button
          onClick={onToggleCitizenReports}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${
            showCitizenReports
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showCitizenReports ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>Citizen Reports ({citizenReports.length})</span>
        </button>
      </div>

      {/* Section 8 Baseline Risk Legend */}
      <div className="absolute bottom-6 left-6 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-xs shadow-xl space-y-1.5 pointer-events-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Section 8: Baseline Risk Levels
        </span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded bg-emerald-500" />
          <span className="text-slate-300">Low (&lt;0.30 norm / &lt;10cm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded bg-amber-400" />
          <span className="text-slate-300">Medium (0.30-0.60 norm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded bg-orange-500" />
          <span className="text-slate-300">High (0.60-0.80 norm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded bg-red-500" />
          <span className="text-slate-300">Critical (&gt;0.80 norm / Impassable)</span>
        </div>

        {citizenReports.length > 0 && (
          <div className="pt-1.5 border-t border-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
            <span className="text-amber-300 text-[11px]">Citizen Field Pins</span>
          </div>
        )}
      </div>
    </div>
  );
};
