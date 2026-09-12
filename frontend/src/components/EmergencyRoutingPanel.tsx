import React from 'react';
import { Navigation, ShieldCheck, AlertTriangle, ArrowRight, Truck, Car, Shield, CheckCircle2 } from 'lucide-react';
import { RouteCalculationResponse } from '../types';

interface EmergencyRoutingPanelProps {
  routeData: RouteCalculationResponse | null;
  selectedVehicle: string;
  onSelectVehicle: (veh: string) => void;
  onRecalculateRoute: () => void;
}

const VEHICLES = [
  { id: 'AMBULANCE', label: 'Ambulance', icon: Truck, limit: '25 cm' },
  { id: 'FIRE_RESCUE', label: 'Fire & Rescue', icon: Truck, limit: '50 cm' },
  { id: 'POLICE', label: 'Police Patrol', icon: Shield, limit: '30 cm' },
  { id: 'CITIZEN', label: 'Citizen Car', icon: Car, limit: '15 cm' },
];

export const EmergencyRoutingPanel: React.FC<EmergencyRoutingPanelProps> = ({
  routeData,
  selectedVehicle,
  onSelectVehicle,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Flood-Safe Emergency Routing • FR-13/14
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
          Dynamic A* Engine
        </span>
      </div>

      {/* Vehicle Profile Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Vehicle Profile & Wading Clearance:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VEHICLES.map((v) => {
            const Icon = v.icon;
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className={`p-2 rounded-lg text-left border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-600/20 border-emerald-500 text-white'
                    : 'bg-slate-800/50 border-slate-700/70 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">{v.label}</span>
                </div>
                <span className="text-[10px] text-slate-400">Clearance: {v.limit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Origin & Destination Display */}
      {routeData && (
        <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-slate-400">FROM:</span>
            <span className="font-semibold text-white">{routeData.origin.name}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">TO:</span>
            <span className="font-semibold text-white">{routeData.destination.name}</span>
          </div>
        </div>
      )}

      {/* Route Comparison Cards */}
      {routeData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Normal Shortest Route */}
          {routeData.normal_route && (
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              routeData.summary.is_normal_route_trapped
                ? 'bg-red-950/20 border-red-500/40 text-red-200'
                : 'bg-slate-800/40 border-slate-700'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Normal Direct Route</span>
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>HIGH FLOOD RISK</span>
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {routeData.normal_route.estimated_duration_min} min
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({routeData.normal_route.total_distance_km} km)
                  </span>
                </div>
                <p className="text-[11px] text-red-300/80 mt-1">
                  ⛔ Encounters {routeData.normal_route.max_depth_cm} cm water depth across {routeData.normal_route.flooded_segments_count} flooded segments.
                </p>
              </div>
              <div className="mt-2 text-[10px] font-mono bg-red-900/30 text-red-300 px-2 py-1 rounded">
                STATUS: VEHICLE TRAPPED RISK
              </div>
            </div>
          )}

          {/* Recommended Safe Route */}
          {routeData.recommended_route && (
            <div className="p-3 rounded-lg border bg-emerald-950/20 border-emerald-500/50 text-emerald-200 flex flex-col justify-between shadow-lg shadow-emerald-950/20">
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>FLOOD-X Recommended</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">SAFE CORRIDOR</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {routeData.recommended_route.estimated_duration_min} min
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({routeData.recommended_route.total_distance_km} km)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/90 mt-1">
                  ✅ Avoids {routeData.summary.flooded_segments_avoided} flooded segments via elevated SCLR bypass.
                </p>
              </div>
              <div className="mt-2 text-[10px] font-mono bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>100% CLEAR ROAD CLEARANCE</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finishing Quote */}
      <div className="text-[11px] italic text-slate-400 border-l-2 border-emerald-500 pl-2.5 py-0.5">
        "We don't just predict where water will go. We predict where people can safely go."
      </div>
    </div>
  );
};
