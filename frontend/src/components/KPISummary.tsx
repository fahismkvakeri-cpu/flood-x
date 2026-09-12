import React from 'react';
import { AlertCircle, Droplets, GitFork, Gauge, Activity } from 'lucide-react';
import { KPIs } from '../types';

interface KPISummaryProps {
  kpis: KPIs;
  avgRainfall: number;
  confidencePct: number;
}

export const KPISummary: React.FC<KPISummaryProps> = ({ kpis, avgRainfall, confidencePct }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-slate-900/60 border-b border-slate-800/80">
      {/* Active Flood Zones */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Active Flood Zones</span>
          <Droplets className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{kpis.active_flood_zones}</span>
          <span className="text-xs text-slate-400">/ {kpis.total_monitored_roads} roads</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.active_flood_zones / (kpis.total_monitored_roads || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Critical Roads */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Critical Roads (High Risk)</span>
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${kpis.critical_roads > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {kpis.critical_roads}
          </span>
          <span className="text-xs text-slate-400">impassable/high</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-red-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.critical_roads / (kpis.total_monitored_roads || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Surcharged Drains */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Surcharged Drains</span>
          <GitFork className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${kpis.surcharged_drains > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {kpis.surcharged_drains}
          </span>
          <span className="text-xs text-slate-400">nodes (&gt;100% util)</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, kpis.surcharged_drains * 20)}%` }}
          />
        </div>
      </div>

      {/* Maximum Water Depth */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Peak Water Depth</span>
          <Gauge className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${kpis.max_water_depth_cm > 40 ? 'text-red-400' : (kpis.max_water_depth_cm > 20 ? 'text-amber-400' : 'text-cyan-400')}`}>
            {kpis.max_water_depth_cm}
          </span>
          <span className="text-xs text-slate-400">cm predicted</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.max_water_depth_cm / 100) * 100)}%` }}
          />
        </div>
      </div>

      {/* Rainfall & AI Confidence */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 hover:border-slate-600 transition col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Nowcast Intensity</span>
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-indigo-300">{avgRainfall}</span>
          <span className="text-xs text-slate-400">mm/h • {confidencePct}% conf</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
