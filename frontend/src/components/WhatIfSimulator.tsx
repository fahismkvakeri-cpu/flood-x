import React from 'react';
import { Sliders, CloudRain, ShieldAlert, RefreshCw } from 'lucide-react';
import { DrainageSimulation } from '../types';

interface WhatIfSimulatorProps {
  rainfallScenarioMm: number;
  onRainfallChange: (val: number) => void;
  blockagePct: number;
  onBlockageChange: (val: number) => void;
  onReset: () => void;
  drainage?: DrainageSimulation | null;
}

const RAIN_PRESETS = [50, 80, 100, 150];
const BLOCKAGE_PRESETS = [0, 25, 50, 75];

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  rainfallScenarioMm,
  onRainfallChange,
  blockagePct,
  onBlockageChange,
  onReset,
  drainage,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            What-If Scenario Sandbox • FR-12
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
          title="Reset Scenarios"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Rainfall Slider & Presets */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <CloudRain className="w-4 h-4 text-blue-400" />
            Rainfall Storm Accumulation:
          </span>
          <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {rainfallScenarioMm} mm
          </span>
        </div>
        <input
          type="range"
          min="30"
          max="200"
          step="5"
          value={rainfallScenarioMm}
          onChange={(e) => onRainfallChange(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex gap-1.5">
          {RAIN_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onRainfallChange(p)}
              className={`flex-1 py-1 text-[11px] rounded font-medium border transition ${
                rainfallScenarioMm === p
                  ? 'bg-blue-600/30 text-cyan-300 border-cyan-500'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {p} mm
            </button>
          ))}
        </div>
      </div>

      {/* Drainage Blockage Slider & Presets */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Drainage Network Blockage:
          </span>
          <span className="font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
            {blockagePct}% Blocked
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="80"
          step="5"
          value={blockagePct}
          onChange={(e) => onBlockageChange(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer"
        />
        <div className="flex gap-1.5">
          {BLOCKAGE_PRESETS.map((b) => (
            <button
              key={b}
              onClick={() => onBlockageChange(b)}
              className={`flex-1 py-1 text-[11px] rounded font-medium border transition ${
                blockagePct === b
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {b}%
            </button>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
        <span className="text-cyan-400 font-bold">⚡ Digital Twin Live:</span>
        <span>Runoff hydraulics and inundation maps adapt in sub-second time.</span>
      </div>

      {drainage && (
        <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Network effectiveness</span>
            <span className={`font-bold ${drainage.effectiveness_status === 'EFFECTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {drainage.drainage_effectiveness_pct}% · {drainage.effectiveness_status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Retained floodwater</span>
            <span className="font-semibold text-white">{drainage.retained_floodwater_m3} m³</span>
          </div>
          <div className={`rounded border px-2 py-1.5 ${drainage.water_level_rising ? 'border-red-500/40 bg-red-950/30 text-red-300' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'}`}>
            {drainage.water_level_rising
              ? `Water level rising in ${drainage.water_level_rising_nodes.length} area(s); max ${drainage.max_estimated_water_level_cm} cm.`
              : 'No modeled area-level water accumulation.'}
          </div>
        </div>
      )}
    </div>
  );
};
