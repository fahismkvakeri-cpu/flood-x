import React from 'react';
import { Navigation } from 'lucide-react';

interface EmergencyRoutingPanelProps {
  routeOrigin: { name: string; coords: [number, number] } | null;
  routeDestination: { name: string; coords: [number, number] } | null;
  routePickMode: 'origin' | 'destination' | null;
  routeError: string | null;
  onStartPicking: (mode: 'origin' | 'destination') => void;
  onRecalculateRoute: () => void;
}

export const EmergencyRoutingPanel: React.FC<EmergencyRoutingPanelProps> = ({
  routeOrigin,
  routeDestination,
  routePickMode,
  routeError,
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
      </div>

    </div>
  );
};
