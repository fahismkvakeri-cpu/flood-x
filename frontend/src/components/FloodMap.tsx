import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RoadPrediction, RouteCalculationResponse, DrainageSimulation, CitizenReport, IndiaRiskPoint, PlaceDetail } from '../types';

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
  indiaRiskPoints: IndiaRiskPoint[];
  onMapStatusChange: (status: string | null) => void;
  showDatasetPoints: boolean;
  onToggleDatasetPoints: () => void;
  placeDetail: PlaceDetail | null;
  showFloodZones: boolean;
  showSafeCorridors: boolean;
  showEmergencyAssets: boolean;
  onToggleFloodZones: () => void;
  onToggleSafeCorridors: () => void;
  onToggleEmergencyAssets: () => void;
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
  indiaRiskPoints,
  onMapStatusChange,
  showDatasetPoints,
  onToggleDatasetPoints,
  placeDetail,
  showFloodZones,
  showSafeCorridors,
  showEmergencyAssets,
  onToggleFloodZones,
  onToggleSafeCorridors,
  onToggleEmergencyAssets,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drainageLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reportLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const operationalLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5, 79.0],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    const fallbackTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let usingFallbackTiles = false;
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; Esri, OpenStreetMap contributors',
    }).addTo(map);
    tiles.on('tileerror', () => {
      if (!usingFallbackTiles) {
        usingFallbackTiles = true;
        tiles.setUrl(fallbackTileUrl);
        onMapStatusChange('Primary map tiles failed. Switched to OpenStreetMap tiles.');
      } else {
        onMapStatusChange('Map tiles are unavailable. Risk observations remain visible.');
      }
    });
    tiles.on('load', () => onMapStatusChange(null));

    roadLayerGroupRef.current = L.layerGroup().addTo(map);
    drainageLayerGroupRef.current = L.layerGroup().addTo(map);
    reportLayerGroupRef.current = L.layerGroup().addTo(map);
    userLocLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    operationalLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const nationalLayer = L.layerGroup().addTo(mapInstanceRef.current);
    indiaRiskPoints.filter((point) => showDatasetPoints || !point.id.startsWith('INDIA-DATA-')).forEach((point) => {
      const color = point.risk_level === 'Critical' ? '#ef4444' : point.risk_level === 'High' ? '#f97316' : '#f59e0b';
      const isDatasetPoint = point.id.startsWith('INDIA-DATA-');
      L.circleMarker(point.coords, { radius: isDatasetPoint ? 5 : 10, color: '#fff', weight: isDatasetPoint ? 1 : 2, fillColor: color, fillOpacity: 0.85 })
        .bindTooltip(`<strong>${point.name}</strong><br/>${point.risk_level} risk · ${point.predicted_depth_cm} cm projected depth${point.rainfall_mm ? `<br/>Rainfall: ${point.rainfall_mm} mm` : ''}${point.land_cover ? `<br/>Land cover: ${point.land_cover}` : ''}`)
        .addTo(nationalLayer);
    });
    return () => { nationalLayer.remove(); };
  }, [indiaRiskPoints, showDatasetPoints]);

  useEffect(() => {
    if (!operationalLayerGroupRef.current) return;
    operationalLayerGroupRef.current.clearLayers();
    if (!placeDetail) return;
    if (showFloodZones) {
      placeDetail.flood_zones.forEach((zone) => {
        L.polygon(zone.coordinates, { color: '#ef4444', weight: 2, fillColor: '#dc2626', fillOpacity: 0.22 })
          .bindTooltip(`<strong>Flood zone: ${zone.name}</strong><br/>${zone.risk_level} · ${zone.depth_cm} cm projected depth`)
          .addTo(operationalLayerGroupRef.current!);
      });
    }
    if (showSafeCorridors) {
      placeDetail.safe_corridors.forEach((corridor) => {
        L.polyline(corridor.coordinates, { color: '#22c55e', weight: 8, opacity: 0.9, dashArray: '2, 8' })
          .bindTooltip(`<strong>Safe corridor: ${corridor.name}</strong><br/>Emergency access priority`)
          .addTo(operationalLayerGroupRef.current!);
      });
    }
    if (showEmergencyAssets) {
      placeDetail.emergency_assets.forEach((asset) => {
        L.marker(asset.coords, { title: asset.name })
          .bindTooltip(`<strong>${asset.name}</strong><br/>${asset.type}`)
          .addTo(operationalLayerGroupRef.current!);
      });
    }
  }, [placeDetail, showFloodZones, showSafeCorridors, showEmergencyAssets]);

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

      <div className="absolute top-4 left-4 z-20 rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="font-bold text-cyan-300">India-wide flood overview</div>
        <div className="text-[10px] text-slate-400">Select a city or search any Indian place for local context</div>
      </div>

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
          onClick={onToggleDatasetPoints}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${
            showDatasetPoints
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showDatasetPoints ? 'bg-orange-400' : 'bg-slate-500'}`} />
          <span>Dataset Points</span>
        </button>

        <button onClick={onToggleFloodZones} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/50">
          <span>Flood Zones {showFloodZones ? 'ON' : 'OFF'}</span>
        </button>
        <button onClick={onToggleSafeCorridors} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
          <span>Safe Roads {showSafeCorridors ? 'ON' : 'OFF'}</span>
        </button>
        <button onClick={onToggleEmergencyAssets} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/50">
          <span>Emergency Assets {showEmergencyAssets ? 'ON' : 'OFF'}</span>
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
      <div className="absolute top-16 left-4 z-[2000] bg-slate-950 border border-slate-500 p-3 rounded-lg text-xs shadow-2xl space-y-1.5 pointer-events-auto ring-2 ring-slate-950/90">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Flood risk legend
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
