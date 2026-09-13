import React from 'react';
import { Ambulance, CheckCircle2, Navigation, ShieldAlert } from 'lucide-react';
import { RouteCalculationResponse } from '../types';

interface EmergencyRoutingPanelProps {
  routeOrigin: { name: string; coords: [number, number] } | null;
  routeDestination: { name: string; coords: [number, number] } | null;
  routePickMode: 'origin' | 'destination' | null;
  routeError: string | null;
  routeData: RouteCalculationResponse | null;
  onStartPicking: (mode: 'origin' | 'destination') => void;
  onRecalculateRoute: () => void;
}

export const EmergencyRoutingPanel: React.FC<EmergencyRoutingPanelProps> = ({
  routeOrigin,
  routeDestination,
  routePickMode,
  routeError,
  routeData,
  onStartPicking,
  onRecalculateRoute,
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

      <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-xs space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <Ambulance className="h-4 w-4 text-emerald-300" />
            <div>
              <div className="font-bold text-emerald-100">Ambulance priority mode</div>
              <div className="text-[10px] text-emerald-200/70">Avoid roads above 25 cm water depth</div>
            </div>
          </div>
          <span className="rounded border border-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">ACTIVE</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            <span className="text-slate-400">From</span>
          </div>
          <button
            type="button"
            onClick={() => onStartPicking('origin')}
            className={`truncate rounded border px-2 py-1 text-left text-white ${routePickMode === 'origin' ? 'border-cyan-400 bg-cyan-950/60' : 'border-slate-700 bg-slate-900/60 hover:border-cyan-500'}`}
          >
            {routeOrigin?.name || 'Pick on map'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">To</span>
          </div>
          <button
            type="button"
            onClick={() => onStartPicking('destination')}
            className={`truncate rounded border px-2 py-1 text-left text-white ${routePickMode === 'destination' ? 'border-emerald-400 bg-emerald-950/60' : 'border-slate-700 bg-slate-900/60 hover:border-emerald-500'}`}
          >
            {routeDestination?.name || 'Pick on map'}
          </button>
        </div>
        <button
          type="button"
          onClick={onRecalculateRoute}
          className="w-full rounded-lg bg-emerald-600 px-2.5 py-2 text-[11px] font-bold text-white hover:bg-emerald-500"
        >
          Recalculate safe route
        </button>
        {routeError && <p className="rounded border border-amber-500/40 bg-amber-950/30 p-2 text-[11px] text-amber-200">{routeError}</p>}

        {routeData && (
          <div className="space-y-2 border-t border-slate-700 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-200">Ambulance route decision</span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${routeData.recommended_route ? 'bg-emerald-900/70 text-emerald-200' : 'bg-red-900/70 text-red-200'}`}>
                {routeData.recommended_route ? 'SAFE CORRIDOR FOUND' : 'NO SAFE CORRIDOR'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-red-500/25 bg-red-950/20 p-2">
                <div className="text-[10px] text-slate-400">Normal route</div>
                <div className="font-bold text-red-300">{routeData.normal_route?.max_depth_cm ?? 'N/A'} cm</div>
                <div className="text-[9px] text-slate-500">{routeData.normal_route?.risk_status || 'Unavailable'}</div>
              </div>
              <div className="rounded border border-emerald-500/25 bg-emerald-950/20 p-2">
                <div className="text-[10px] text-slate-400">Safe route</div>
                <div className="font-bold text-emerald-300">{routeData.recommended_route?.max_depth_cm ?? 'N/A'} cm</div>
                <div className="text-[9px] text-slate-500">{routeData.recommended_route?.estimated_duration_min ?? 'N/A'} min</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-200">
              {routeData.recommended_route ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />}
              {routeData.summary.flooded_segments_avoided} flooded segment(s) avoided · limit {routeData.vehicle_profile.wading_depth_limit_cm} cm
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
