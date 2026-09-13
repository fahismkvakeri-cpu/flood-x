import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ExternalLink, Pentagon } from 'lucide-react';
import { RoadPrediction, RouteCalculationResponse, DrainageSimulation, CitizenReport, IndiaRiskPoint, PlaceDetail, AlertItem } from '../types';

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
  routeLoading: boolean;
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
  showEmergencyAssets: boolean;
  onToggleFloodZones: () => void;
  onToggleEmergencyAssets: () => void;
  onSelectRiskPoint: (point: IndiaRiskPoint) => void;
  routePickMode: 'origin' | 'destination' | null;
  onSelectMapLocation: (coords: [number, number]) => void;
  onAddAoiPoint: (coords: [number, number]) => void;
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  aoiPolygon: [number, number][];
  aoiDrawing: boolean;
  onToggleAoiDrawing: () => void;
  onAnalyzeAoi: () => void;
  onClearAoi: () => void;
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
  routeLoading,
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
  showEmergencyAssets,
  onToggleFloodZones,
  onToggleEmergencyAssets,
  onSelectRiskPoint,
  routePickMode,
  onSelectMapLocation,
  onAddAoiPoint,
  alerts,
  onSelectAlert,
  aoiPolygon,
  aoiDrawing,
  onToggleAoiDrawing,
  onAnalyzeAoi,
  onClearAoi,
}) => {
  const [showRiskPoints, setShowRiskPoints] = useState(true);
  const [showNormalRoute, setShowNormalRoute] = useState(true);
  const [showSafeRoute, setShowSafeRoute] = useState(true);
  const [showSclrCorridor, setShowSclrCorridor] = useState(true);
  const [showSatelliteImagery, setShowSatelliteImagery] = useState(false);
  const [showLowRiskAreas, setShowLowRiskAreas] = useState(true);
  const [showMediumRiskAreas, setShowMediumRiskAreas] = useState(true);
  const [showHighRiskAreas, setShowHighRiskAreas] = useState(true);
  const [showCriticalRiskAreas, setShowCriticalRiskAreas] = useState(true);
  const sclrCorridor = roads.find((road) => road.name.toLowerCase().includes('sclr elevated express corridor'));

  const legendItems = [
    { label: 'Risk Points', color: 'bg-red-500', active: showRiskPoints, onToggle: () => setShowRiskPoints((visible) => !visible) },
    { label: 'Drainage Graph', color: 'bg-cyan-400', active: showDrainageLayer, onToggle: onToggleDrainage },
    { label: 'Dataset Points', color: 'bg-orange-400', active: showDatasetPoints, onToggle: onToggleDatasetPoints },
    { label: 'Flood Zones', color: 'bg-red-500', active: showFloodZones, onToggle: onToggleFloodZones },
    { label: 'Flooded Area · Low / Safe', color: 'bg-emerald-400', active: showLowRiskAreas, onToggle: () => setShowLowRiskAreas((visible) => !visible) },
    { label: 'Flooded Area · Medium / Watch', color: 'bg-yellow-400', active: showMediumRiskAreas, onToggle: () => setShowMediumRiskAreas((visible) => !visible) },
    { label: 'Flooded Area · High', color: 'bg-orange-500', active: showHighRiskAreas, onToggle: () => setShowHighRiskAreas((visible) => !visible) },
    { label: 'Flooded Area · Critical', color: 'bg-red-500', active: showCriticalRiskAreas, onToggle: () => setShowCriticalRiskAreas((visible) => !visible) },
    { label: 'SCLR Elevated Express Corridor', detail: `${sclrCorridor?.elevation_m ?? 11.8} m elevated · emergency bypass`, color: 'bg-yellow-300', active: showSclrCorridor, onToggle: () => setShowSclrCorridor((visible) => !visible) },
    { label: 'FLOOD-X Route', color: 'bg-emerald-500', active: showSafeRoute, onToggle: () => setShowSafeRoute((visible) => !visible) },
    { label: 'Normal Route', color: 'bg-red-500', active: showNormalRoute, onToggle: () => setShowNormalRoute((visible) => !visible) },
    { label: 'Emergency Assets', color: 'bg-blue-500', active: showEmergencyAssets, onToggle: onToggleEmergencyAssets },
    { label: 'Citizen Reports', color: 'bg-amber-400', active: showCitizenReports, onToggle: onToggleCitizenReports },
    { label: 'Satellite Imagery', color: 'bg-sky-400', active: showSatelliteImagery, onToggle: () => setShowSatelliteImagery((visible) => !visible) },
  ];

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drainageLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reportLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const operationalLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const mapTileLayerRef = useRef<L.TileLayer | null>(null);

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
    mapTileLayerRef.current = tiles;
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
    alertLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      mapTileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tiles = mapTileLayerRef.current;
    if (!tiles) return;
    const imageryUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const streetUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    tiles.setUrl(showSatelliteImagery ? imageryUrl : streetUrl);
    onMapStatusChange(showSatelliteImagery ? 'Satellite imagery enabled.' : null);
  }, [showSatelliteImagery, onMapStatusChange]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (routePickMode) {
        onSelectMapLocation([event.latlng.lat, event.latlng.lng]);
      } else if (aoiDrawing) {
        onAddAoiPoint([event.latlng.lat, event.latlng.lng]);
      }
    };
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onSelectMapLocation, onAddAoiPoint, routePickMode, aoiDrawing]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layer = L.layerGroup().addTo(mapInstanceRef.current);
    if (aoiPolygon.length >= 2) {
      L.polyline(aoiPolygon, { color: '#22d3ee', weight: 3, dashArray: '8, 6' }).addTo(layer);
      aoiPolygon.forEach((point, index) => L.circleMarker(point, { radius: index === 0 ? 6 : 4, color: '#fff', fillColor: '#06b6d4', fillOpacity: 1, weight: 2 }).addTo(layer));
      if (aoiPolygon.length >= 3) L.polygon(aoiPolygon, { color: '#22d3ee', fillColor: '#0891b2', fillOpacity: 0.12, weight: 1 }).addTo(layer);
    }
    return () => { layer.remove(); };
  }, [aoiPolygon]);

  const handleAoiSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!aoiDrawing || !mapInstanceRef.current || !mapContainerRef.current) return;
    const bounds = mapContainerRef.current.getBoundingClientRect();
    const point = mapInstanceRef.current.containerPointToLatLng([
      event.clientX - bounds.left,
      event.clientY - bounds.top,
    ]);
    onAddAoiPoint([point.lat, point.lng]);
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const nationalLayer = L.layerGroup().addTo(mapInstanceRef.current);
    const riskAreaVisibility: Record<string, boolean> = {
      Low: showLowRiskAreas,
      Medium: showMediumRiskAreas,
      High: showHighRiskAreas,
      Critical: showCriticalRiskAreas,
    };
    const riskAreaColors: Record<string, string> = {
      Low: '#22c55e',
      Medium: '#facc15',
      High: '#f97316',
      Critical: '#ef4444',
    };

    indiaRiskPoints.forEach((point) => {
      if (!riskAreaVisibility[point.risk_level]) return;
      const color = riskAreaColors[point.risk_level];
      const radius = Math.max(350, Math.min(2200, point.predicted_depth_cm * 28));
      L.circle(point.coords, {
        radius,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: point.risk_level === 'Critical' ? 0.28 : 0.18,
      })
        .bindTooltip(
          `<strong>${point.risk_level} flooded area</strong><br/>${point.name}<br/>Projected depth: ${point.predicted_depth_cm} cm`,
          { sticky: true }
        )
        .addTo(nationalLayer);
    });

    indiaRiskPoints.filter((point) => {
      const isDatasetPoint = point.id.startsWith('INDIA-DATA-');
      return isDatasetPoint ? showDatasetPoints : showRiskPoints;
    }).forEach((point) => {
      const color = point.risk_level === 'Critical' ? '#ef4444' : point.risk_level === 'High' ? '#f97316' : '#f59e0b';
      const isDatasetPoint = point.id.startsWith('INDIA-DATA-');
      const marker = L.circleMarker(point.coords, { radius: isDatasetPoint ? 5 : 10, color: '#fff', weight: isDatasetPoint ? 1 : 2, fillColor: color, fillOpacity: 0.85 })
        .bindTooltip(`<strong>${point.name}</strong><br/>${point.risk_level} risk · ${point.predicted_depth_cm} cm projected depth${point.rainfall_mm ? `<br/>Rainfall: ${point.rainfall_mm} mm` : ''}${point.land_cover ? `<br/>Land cover: ${point.land_cover}` : ''}`)
        .addTo(nationalLayer);
      marker.on('click', () => onSelectRiskPoint(point));
    });
    return () => { nationalLayer.remove(); };
  }, [
    indiaRiskPoints,
    showDatasetPoints,
    showRiskPoints,
    showLowRiskAreas,
    showMediumRiskAreas,
    showHighRiskAreas,
    showCriticalRiskAreas,
    onSelectRiskPoint,
  ]);

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
    if (showEmergencyAssets) {
      placeDetail.emergency_assets.forEach((asset) => {
        L.marker(asset.coords, { title: asset.name })
          .bindTooltip(`<strong>${asset.name}</strong><br/>${asset.type}`)
          .addTo(operationalLayerGroupRef.current!);
      });
    }
  }, [placeDetail, showFloodZones, showEmergencyAssets]);

  const openGoogleMapsRoute = () => {
    if (!routeData?.recommended_route) return;
    const routeCoordinates = routeData.recommended_route.coordinates;
    const waypoints = routeCoordinates
      .slice(1, -1)
      .filter((_, index) => index % Math.max(1, Math.ceil(routeCoordinates.length / 8)) === 0)
      .slice(0, 8)
      .map(([latitude, longitude]) => `${latitude},${longitude}`)
      .join('|');
    const params = new URLSearchParams({
      api: '1',
      origin: `${routeData.origin.coords[0]},${routeData.origin.coords[1]}`,
      destination: `${routeData.destination.coords[0]},${routeData.destination.coords[1]}`,
      travelmode: 'driving',
    });
    if (waypoints) params.set('waypoints', waypoints);
    window.open(`https://www.google.com/maps/dir/?${params.toString()}&dir_action=navigate`, '_blank', 'noopener,noreferrer');
  };

  const getRouteCoordinates = (
    route: RouteCalculationResponse['recommended_route'] | RouteCalculationResponse['normal_route']
  ) => {
    if (!route) return [] as [number, number][];
    const validCoordinates = route.coordinates.filter(
      (point): point is [number, number] =>
        Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
    );
    if (validCoordinates.length < 2) return [] as [number, number][];
    const origin = routeData?.origin.coords;
    const destination = routeData?.destination.coords;
    return [origin || validCoordinates[0], ...validCoordinates.slice(1, -1), destination || validCoordinates[validCoordinates.length - 1]];
  };

  // Handle Pan / FlyTo
  useEffect(() => {
    if (mapInstanceRef.current && flyToCoords) {
      mapInstanceRef.current.flyTo(flyToCoords, 15, { duration: 1.2 });
    }
  }, [flyToCoords]);

  useEffect(() => {
    if (!alertLayerGroupRef.current) return;
    alertLayerGroupRef.current.clearLayers();

    alerts.filter((alert) => alert.coords).forEach((alert) => {
      const isCritical = alert.severity === 'CRITICAL';
      const marker = L.circleMarker(alert.coords!, {
        radius: isCritical ? 10 : 8,
        color: '#fff',
        weight: 2,
        fillColor: isCritical ? '#ef4444' : '#f59e0b',
        fillOpacity: 0.95,
      });
      marker.bindTooltip(
        `<strong>${isCritical ? 'Critical alert' : 'Flood alert'}</strong><br/>${alert.road_name || alert.drainage_area_name || alert.pipe_id || 'Affected area'}<br/>${alert.message}`,
        { sticky: true }
      );
      marker.on('click', () => onSelectAlert(alert));
      marker.addTo(alertLayerGroupRef.current!);
    });
  }, [alerts, onSelectAlert]);

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

    if (showSclrCorridor) {
      const sclr = sclrCorridor;
      if (sclr) {
        L.polyline(sclr.coords, {
          color: '#facc15',
          weight: 10,
          opacity: 0.35,
        })
          .bindTooltip(
            `<strong>SCLR Elevated Express Corridor</strong><br/>Elevated emergency bypass<br/>Elevation: ${sclr.elevation_m} m · Depth: ${sclr.predicted_depth_cm} cm<br/>Status: ${sclr.risk_level} risk`,
            { sticky: true }
          )
          .addTo(roadLayerGroupRef.current!);
        L.polyline(sclr.coords, {
          color: '#fde047',
          weight: 5,
          opacity: 1,
          dashArray: '12, 8',
        })
          .bindTooltip('SCLR Elevated Express Corridor · Emergency bypass', { sticky: true })
          .addTo(roadLayerGroupRef.current!);
      }
    }
  }, [roads, selectedRoad, onSelectRoad, showSclrCorridor]);

  // Update Drainage Network Layer
  useEffect(() => {
    if (!drainageLayerGroupRef.current) return;
    drainageLayerGroupRef.current.clearLayers();

    if (!showDrainageLayer || !drainage) return;

    const nodeById = drainage.nodes;
    drainage.pipes.forEach((pipe) => {
      const source = nodeById[pipe.source];
      const destination = nodeById[pipe.destination];
      if (!source || !destination) return;
      const color = pipe.status === 'SURCHARGED' ? '#ef4444' : pipe.status === 'CRITICAL' ? '#f59e0b' : '#22d3ee';
      L.polyline([source.coords, destination.coords], {
        color,
        weight: pipe.status === 'SURCHARGED' ? 5 : 3,
        opacity: 0.85,
        dashArray: pipe.status === 'SURCHARGED' ? '8, 6' : undefined,
      })
        .bindTooltip(
          `<strong>${pipe.pipe_id}</strong><br/>Status: <b>${pipe.status}</b><br/>Flow: ${pipe.current_flow_m3s} / ${pipe.capacity_m3s} m³/s<br/>Utilization: ${pipe.utilization_pct}%`,
          { sticky: true }
        )
        .addTo(drainageLayerGroupRef.current!);
    });

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
        `<strong>${n.name}</strong><br/>Status: <b>${n.status}</b><br/>Water level: ${n.estimated_water_level_cm} cm<br/>Retained water: ${n.retained_volume_m3} m³<br/>Drainage effectiveness: ${n.drainage_effectiveness_pct}%`,
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

    const safeCoordinates = getRouteCoordinates(routeData.recommended_route);
    const normalCoordinates = getRouteCoordinates(routeData.normal_route);
    const routeForBounds = safeCoordinates.length > 1 ? safeCoordinates : normalCoordinates;
    if (routeForBounds.length > 1) {
      mapInstanceRef.current?.fitBounds(L.latLngBounds(routeForBounds), {
        padding: [70, 70],
        maxZoom: 14,
        animate: true,
      });
    }

    // 1. Normal Route (Red Dashed)
    if (showNormalRoute && normalCoordinates.length > 1) {
      const normalLine = L.polyline(normalCoordinates, {
        color: '#f87171',
        weight: 5,
        opacity: 0.7,
        dashArray: '8, 8',
      });
      normalLine.bindTooltip(`⚠️ Normal Route: ${routeData.normal_route?.estimated_duration_min ?? '--'} min (HIGH RISK)`, {
        sticky: true,
      });
      normalLine.addTo(routeLayerGroupRef.current);
    }

    // 2. Recommended Safe Route (Solid Green with Glow)
    if (showSafeRoute && safeCoordinates.length > 1) {
      L.polyline(safeCoordinates, {
        color: '#10b981',
        weight: 9,
        opacity: 0.35,
      }).addTo(routeLayerGroupRef.current);

      const safeLine = L.polyline(safeCoordinates, {
        color: '#34d399',
        weight: 5,
        opacity: 1.0,
      });
      safeLine.bindTooltip(`🛡️ FLOOD-X Safe Route: ${routeData.recommended_route?.estimated_duration_min ?? '--'} min (CLEAR)`, {
        sticky: true,
      });
      safeLine.addTo(routeLayerGroupRef.current);
    }

    // Route endpoint pins follow the route visibility controls.
    if (showNormalRoute || showSafeRoute) {
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
    }

    if (!routeData.recommended_route && routeData.normal_route) {
      L.popup({ closeButton: false, closeOnClick: false, autoClose: false, className: 'floodx-route-warning' })
        .setLatLng(routeData.destination.coords)
        .setContent('<strong>No safe FLOOD-X route</strong><br/>The safest available road is still above the vehicle safety limit.')
        .openOn(mapInstanceRef.current!);
    }
  }, [routeData, showNormalRoute, showSafeRoute]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-slate-950 overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
      {routePickMode && (
        <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-lg border border-cyan-400/50 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-200 shadow-xl">
          Click the map to set your {routePickMode === 'origin' ? 'starting point' : 'destination'}
        </div>
      )}
      {routeLoading && (
        <div className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 rounded-lg border border-emerald-400/50 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-xl">
          Updating safe route...
        </div>
      )}

      <div className="absolute top-4 left-4 z-[1000] rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="font-bold text-cyan-300">India-wide flood overview</div>
        <div className="text-[10px] text-slate-400">Select a city or search any Indian place for local context</div>
      </div>

      <div className="absolute top-28 left-4 z-[1000] flex flex-wrap gap-2">
        <button type="button" onClick={onToggleAoiDrawing} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur ${aoiDrawing ? 'border-cyan-300 bg-cyan-500/30 text-cyan-100' : 'border-cyan-500/50 bg-slate-950/85 text-cyan-300'}`}>
          <Pentagon className="h-3.5 w-3.5" /> {aoiDrawing ? 'Click map to draw' : 'Draw area'}
        </button>
        {aoiPolygon.length >= 3 && <button type="button" onClick={onAnalyzeAoi} className="rounded-lg border border-emerald-400/50 bg-emerald-900/80 px-3 py-1.5 text-xs font-bold text-emerald-100 shadow-lg">Analyze area</button>}
        {aoiPolygon.length > 0 && <button type="button" onClick={onClearAoi} className="rounded-lg border border-slate-600 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-slate-300 shadow-lg">Clear</button>}
      </div>

      {aoiDrawing && <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-lg border border-cyan-400/50 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-200 shadow-xl">Click at least 3 points, then analyze · {aoiPolygon.length} point(s)</div>}

      {aoiDrawing && (
        <div
          className="absolute inset-0 z-[900] cursor-crosshair"
          onPointerDown={handleAoiSurfacePointerDown}
          aria-label="AOI drawing surface"
        />
      )}

      {/* Layer Control Pills (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setShowRiskPoints((visible) => !visible)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${showRiskPoints ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}
        >
          <span className={`w-2 h-2 rounded-full ${showRiskPoints ? 'bg-red-400' : 'bg-slate-500'}`} />
          <span>Risk Points {showRiskPoints ? 'ON' : 'OFF'}</span>
        </button>
        <button
          onClick={onToggleDrainage}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${showDrainageLayer
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${showDrainageLayer ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>Drainage Graph</span>
        </button>

        <button
          onClick={onToggleDatasetPoints}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${showDatasetPoints
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${showDatasetPoints ? 'bg-orange-400' : 'bg-slate-500'}`} />
          <span>Dataset Points</span>
        </button>

        <button onClick={onToggleFloodZones} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showFloodZones ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}>
          <span>Flood Zones {showFloodZones ? 'ON' : 'OFF'}</span>
        </button>
        <button onClick={() => setShowSatelliteImagery((visible) => !visible)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showSatelliteImagery ? 'bg-sky-500/20 text-sky-300 border-sky-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}>
          <span>{showSatelliteImagery ? 'Satellite ON' : 'Street Map'}</span>
        </button>
        <button onClick={() => setShowSafeRoute((visible) => !visible)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showSafeRoute ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}>
          <span>FLOOD-X Route {showSafeRoute ? 'ON' : 'OFF'}</span>
        </button>
        <button onClick={() => setShowNormalRoute((visible) => !visible)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showNormalRoute ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}>
          <span>Normal Route {showNormalRoute ? 'ON' : 'OFF'}</span>
        </button>
        <button onClick={onToggleEmergencyAssets} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showEmergencyAssets ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-slate-900/80 text-slate-400 border-slate-700/60'}`}>
          <span>Emergency Assets {showEmergencyAssets ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={onToggleCitizenReports}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur shadow-lg border transition flex items-center gap-1.5 ${showCitizenReports
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${showCitizenReports ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>Citizen Reports ({citizenReports.length})</span>
        </button>
      </div>

      {routeData?.recommended_route && (
        <div className="absolute bottom-28 left-4 z-[1000] flex items-center gap-2">
          <div className="rounded-lg border border-emerald-400/50 bg-emerald-950/90 px-3 py-2 text-[11px] font-semibold text-emerald-200 shadow-xl backdrop-blur">
            Dynamic safe route
          </div>
          <button
            type="button"
            onClick={openGoogleMapsRoute}
            className="flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-950/90 px-3 py-2 text-xs font-bold text-cyan-200 shadow-xl backdrop-blur transition hover:bg-cyan-900"
            title="Open the FLOOD-X safe route in Google Maps navigation"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Navigate
          </button>
        </div>
      )}

      <div className="absolute bottom-28 right-4 z-[1000] w-64 rounded-xl border border-slate-700/80 bg-slate-950/90 p-3 text-xs shadow-2xl backdrop-blur ring-1 ring-slate-800/80">
        <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Map legend</span>
          <span className="rounded-full border border-slate-600 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">{legendItems.filter((item) => item.active).length} on</span>
        </div>
        <div className="space-y-2">
          {legendItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onToggle}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-left transition hover:border-slate-600 hover:bg-slate-800/80"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${item.color} ${item.active ? 'opacity-100' : 'opacity-40'}`} />
                <span className={item.active ? 'text-slate-200' : 'text-slate-500'}>{item.label}</span>
                {'detail' in item && <span className="text-[9px] text-slate-500">{item.detail}</span>}
              </div>
              <span className={`text-[9px] uppercase tracking-wide ${item.active ? 'text-emerald-300' : 'text-slate-500'}`}>
                {item.active ? 'On' : 'Off'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
