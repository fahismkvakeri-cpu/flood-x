import React from 'react';
import { X, TrendingUp, HelpCircle, Info } from 'lucide-react';
import { RoadPrediction } from '../types';

interface StreetDetailPanelProps {
  road: RoadPrediction | null;
  onClose: () => void;
  timelineCurve?: { horizon_min: number; depth_cm: number; risk_score: number; risk_level: string }[];
}

export const StreetDetailPanel: React.FC<StreetDetailPanelProps> = ({
  road,
  onClose,
  timelineCurve,
}) => {
  if (!road) return null;

  return (
    <div className="bg-slate-900 border-l border-slate-800 w-full sm:w-96 flex flex-col h-full shadow-2xl z-40 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-800/40">
        <div>
          <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
            Location Prediction • Section 21
          </span>
          <h3 className="text-base font-bold text-white leading-tight mt-0.5">{road.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Elevation: {road.elevation_m}m AMSL • Length: {road.length_m}m
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Risk & Depth Highlights */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Predicted Depth</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-black ${
                road.predicted_depth_cm >= 30 ? 'text-red-400' : (road.predicted_depth_cm >= 15 ? 'text-amber-400' : 'text-emerald-400')
              }`}>
                {road.predicted_depth_cm}
              </span>
              <span className="text-xs font-semibold text-slate-400">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {road.is_closed ? '⛔ ROAD IMPASSABLE' : 'Passable with caution'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Baseline Risk Model</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className="px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide"
                style={{ backgroundColor: `${road.color}25`, color: road.color }}
              >
                {road.risk_level}
              </span>
              <span className="text-xs font-mono text-cyan-300">
                ({road.risk_score_norm})
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Prob: {road.flood_probability_pct}%
            </span>
          </div>
        </div>

        {/* Plain Language Reason Box (Section 6) */}
        {road.plain_reason && (
          <div className="bg-blue-950/20 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-200/90 space-y-1">
            <div className="flex items-center gap-1 text-blue-400 font-bold text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Hydraulic Analysis</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {road.plain_reason}
            </p>
          </div>
        )}

        {/* Drainage Status Card */}
        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Conduit Hydraulics:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
              road.drain_status === 'SURCHARGED'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {road.drain_status}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Drain Capacity Utilization:</span>
            <span className="font-semibold text-white">{road.drain_utilization_pct}%</span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${
                road.drain_utilization_pct > 100 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, road.drain_utilization_pct)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-500 block">Area water level</span>
              <span className={`font-bold ${road.drainage_water_level_cm >= 15 ? 'text-red-400' : 'text-cyan-300'}`}>
                {road.drainage_water_level_cm} cm
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Drain effectiveness</span>
              <span className={`font-bold ${road.drainage_effectiveness_pct >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {road.drainage_effectiveness_pct}%
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            {road.drainage_area_name} · {road.drainage_level_status.replace(/_/g, ' ')} · {road.drainage_retained_volume_m3} m³ retained
          </div>
        </div>

        {/* Temporal Inundation Curve */}
        {timelineCurve && timelineCurve.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>0-3h Forecast Timeline Progression</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-800/30 p-2 rounded-lg border border-slate-800">
              {timelineCurve.slice(0, 4).map((pt) => (
                <div key={pt.horizon_min} className="text-center bg-slate-800/60 p-1.5 rounded">
                  <span className="text-[10px] text-slate-400 block">+{pt.horizon_min}m</span>
                  <span className="text-xs font-bold text-cyan-300">{pt.depth_cm} cm</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explainable AI Contributing Factors (Section 6 & 8) */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Section 8 Feature Contributions</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Weighted Model</span>
          </div>

          <div className="space-y-2">
            {Object.entries(road.explainability).map(([factor, pct]) => (
              <div key={factor} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 truncate max-w-[210px]">{factor}</span>
                  <span className="font-semibold text-cyan-300">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
