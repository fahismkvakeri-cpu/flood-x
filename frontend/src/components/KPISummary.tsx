import React from 'react';
import { AlertCircle, Droplets, GitFork, Gauge, Users } from 'lucide-react';
import { KPIs, PopulationExposureResponse } from '../types';

interface KPISummaryProps {
  kpis: KPIs;
  avgRainfall: number;
  confidencePct: number;
  exposureData: PopulationExposureResponse | null;
}

export const KPISummary: React.FC<KPISummaryProps> = ({
  kpis,
  avgRainfall,
  confidencePct,
  exposureData,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-slate-900/60 border-b border-slate-800/80">
      {/* Active Flood Zones */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Active Flood Zones</span>
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{kpis.active_flood_zones}</span>
          <span className="text-[11px] text-slate-400">/ {kpis.total_monitored_roads} roads</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.active_flood_zones / (kpis.total_monitored_roads || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Critical Roads */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Critical Roads (High Risk)</span>
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${kpis.critical_roads > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {kpis.critical_roads}
          </span>
          <span className="text-[11px] text-slate-400">impassable</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="bg-red-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.critical_roads / (kpis.total_monitored_roads || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Surcharged Drains */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Surcharged Drains</span>
          <GitFork className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${kpis.surcharged_drains > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {kpis.surcharged_drains}
          </span>
          <span className="text-[11px] text-slate-400">nodes (&gt;100% cap)</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, kpis.surcharged_drains * 25)}%` }}
          />
        </div>
      </div>

      {/* Maximum Water Depth */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Peak Predicted Depth</span>
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${kpis.max_water_depth_cm > 40 ? 'text-red-400' : (kpis.max_water_depth_cm > 20 ? 'text-amber-400' : 'text-cyan-400')}`}>
            {kpis.max_water_depth_cm}
          </span>
          <span className="text-[11px] text-slate-400">cm water</span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (kpis.max_water_depth_cm / 100) * 100)}%` }}
          />
        </div>
      </div>

      {/* Section 19.7: WorldPop Population Exposure */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600 transition col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>WorldPop Exposed Pop.</span>
          <Users className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-purple-300">
            {exposureData ? exposureData.total_exposed_population.toLocaleString() : '145,000'}
          </span>
          <span className="text-[10px] text-purple-400/90 font-bold px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800">
            {exposureData?.evacuation_priority || 'CRITICAL'}
          </span>
        </div>
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="bg-purple-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${exposureData?.exposure_percentage || 78}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
          <span>{avgRainfall} mm/h</span>
          <span>{confidencePct}% conf</span>
        </div>
      </div>
    </div>
  );
};
