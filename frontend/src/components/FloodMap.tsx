import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RoadPrediction, RouteCalculationResponse, DrainageSimulation } from '../types';

interface FloodMapProps {
  roads: RoadPrediction[];
  drainage: DrainageSimulation | null;
  selectedRoad: RoadPrediction | null;
  onSelectRoad: (road: RoadPrediction) => void;
  routeData: RouteCalculationResponse | null;
  showDrainageLayer: boolean;
  onToggleDrainage: () => void;
}

export const FloodMap: React.FC<FloodMapProps> = ({
  roads,
  drainage,
  selectedRoad,
  onSelectRoad,
  routeData,
  showDrainageLayer,
  onToggleDrainage,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drainageLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [19.0690, 72.8720],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // High performance Dark Matter tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const roadGroup = L.layerGroup().addTo(map);
    const drainageGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);

    roadLayerGroupRef.current = roadGroup;
    drainageLayerGroupRef.current = drainageGroup;
    routeLayerGroupRef.current = routeGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Road Polylines
  useEffect(() => {
    if (!roadLayerGroupRef.current || !roads) return;
    roadLayerGroupRef.current.clearLayers();

    roads.forEach((r) => {
      const isSelected = selectedRoad?.road_id === r.road_id;
      const isCritical = r.risk_category === 'CRITICAL' || r.risk_category === 'HIGH';

      const polyline = L.polyline(r.coords, {
        color: r.color,
        weight: isSelected ? 8 : (isCritical ? 6 : 4),
        opacity: isSelected ? 1.0 : (isCritical ? 0.9 : 0.75),
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: r.is_closed ? '6, 6' : undefined,
      });

      polyline.bindTooltip(
        `<strong>${r.name}</strong><br/>Depth: <b style="color:${r.color}">${r.predicted_depth_cm} cm</b> (${r.risk_category})<br/>Drain Util: ${r.drain_utilization_pct}%`,
        { sticky: true, className: 'map-tooltip' }
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

    // Draw drainage nodes (manholes & outfalls)
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

  // Update Emergency Route Overlays
  useEffect(() => {
    if (!routeLayerGroupRef.current) return;
    routeLayerGroupRef.current.clearLayers();

    if (!routeData) return;

    // 1. Draw Normal Route (Red dashed)
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

    // 2. Draw Recommended Safe Route (Solid Green Glow)
    if (routeData.recommended_route && routeData.recommended_route.coordinates.length > 0) {
      // Glow underlay
      L.polyline(routeData.recommended_route.coordinates, {
        color: '#10b981',
        weight: 9,
        opacity: 0.4,
      }).addTo(routeLayerGroupRef.current);

      // Core line
      const safeLine = L.polyline(routeData.recommended_route.coordinates, {
        color: '#34d399',
        weight: 5,
        opacity: 1.0,
      });
      safeLine.bindTooltip(`🛡️ FLOOD-X Safe Route: ${routeData.recommended_route.estimated_duration_min} min (100% CLEAR)`, {
        sticky: true,
      });
      safeLine.addTo(routeLayerGroupRef.current);
    }

    // 3. Origin & Destination Markers
    const originMarker = L.circleMarker(routeData.origin.coords, {
      radius: 9,
      color: '#ffffff',
      fillColor: '#3b82f6',
      fillOpacity: 1.0,
      weight: 3,
    }).bindTooltip(`START: ${routeData.origin.name}`, { permanent: false });
    originMarker.addTo(routeLayerGroupRef.current);

    const destMarker = L.circleMarker(routeData.destination.coords, {
      radius: 9,
      color: '#ffffff',
      fillColor: '#10b981',
      fillOpacity: 1.0,
      weight: 3,
    }).bindTooltip(`DESTINATION: ${routeData.destination.name}`, { permanent: false });
    destMarker.addTo(routeLayerGroupRef.current);
  }, [routeData]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-slate-950 overflow-hidden">
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Layer Toggle Floating Button */}
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
          <span>{showDrainageLayer ? 'Drainage Graph: ON' : 'Drainage Graph: OFF'}</span>
        </button>
      </div>

      {/* Legend Card */}
      <div className="absolute bottom-6 left-6 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-xs shadow-xl space-y-1.5 pointer-events-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Inundation Risk Legend
        </span>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded bg-emerald-500" />
          <span className="text-slate-300">Safe (&lt;10 cm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded bg-amber-400" />
          <span className="text-slate-300">Watch (10-20 cm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded bg-orange-500" />
          <span className="text-slate-300">Moderate (20-30 cm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded bg-red-500" />
          <span className="text-slate-300">Critical (&gt;30 cm Impassable)</span>
        </div>
        {routeData && (
          <div className="pt-1.5 border-t border-slate-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 border-t-2 border-dashed border-red-400" />
              <span className="text-red-300 text-[11px]">Normal Trapped Route</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1.5 rounded bg-emerald-400" />
              <span className="text-emerald-300 text-[11px] font-bold">FLOOD-X Safe Corridor</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
