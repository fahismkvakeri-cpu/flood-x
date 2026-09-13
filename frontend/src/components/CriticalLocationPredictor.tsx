import React from 'react';
import { AlertTriangle, Clock3, MapPin } from 'lucide-react';
import { CriticalLocation, CriticalLocationsResponse } from '../types';

interface CriticalLocationPredictorProps {
  data: CriticalLocationsResponse;
  onSelectLocation: (location: CriticalLocation) => void;
}

export const CriticalLocationPredictor: React.FC<CriticalLocationPredictorProps> = ({ data, onSelectLocation }) => (
  <div className="space-y-3 rounded-xl border border-red-500/40 bg-slate-800/50 p-3.5">
    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-300" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-200">Critical Location Predictor</h3>
      </div>
      <span className="text-[10px] text-slate-400">Next {data.forecast_horizon_min} min</span>
    </div>
    <p className="text-[11px] leading-relaxed text-slate-400">Ranked by flood risk, predicted depth, and earliest onset for the current scenario.</p>
    <div className="space-y-2">
      {data.locations.map((location) => (
        <button key={location.road_id} type="button" onClick={() => onSelectLocation(location)} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 p-2.5 text-left transition hover:border-red-400/60 hover:bg-red-950/20">
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-200">{location.rank}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-xs font-semibold text-white">{location.name}</span>
                <span className={`shrink-0 text-[10px] font-bold ${location.risk_level === 'Critical' ? 'text-red-300' : 'text-orange-300'}`}>{location.risk_score}/100</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                <span className="text-red-300">{location.predicted_depth_cm} cm</span>
                <span>range {location.depth_lower_cm}-{location.depth_upper_cm}</span>
                <span><Clock3 className="mr-1 inline h-3 w-3" />{location.time_to_flood_min ? `${location.time_to_flood_min} min onset` : 'Already active'}</span>
              </div>
              <div className="mt-1 truncate text-[10px] text-cyan-300">{location.top_factor}</div>
              <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500"><MapPin className="h-3 w-3" />{location.confidence_pct}% confidence · {location.flood_probability_pct}% probability</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);