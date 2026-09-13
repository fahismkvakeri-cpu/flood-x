import React from 'react';
import { MapPinned, X } from 'lucide-react';
import { AreaAnalysisResponse } from '../types';

interface AreaAnalysisPanelProps {
  analysis: AreaAnalysisResponse;
  onClose: () => void;
}

export const AreaAnalysisPanel: React.FC<AreaAnalysisPanelProps> = ({ analysis, onClose }) => (
  <div className="absolute bottom-24 left-4 z-[800] w-80 max-w-[calc(100%-2rem)] rounded-xl border border-cyan-400/40 bg-slate-950/95 p-4 text-xs shadow-2xl backdrop-blur">
    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2">
      <div className="flex items-center gap-2">
        <MapPinned className="h-4 w-4 text-cyan-300" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Area Of Interest</div>
          <div className="text-sm font-bold text-white">Drawn area analyzed</div>
        </div>
      </div>
      <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close area analysis"><X className="h-4 w-4" /></button>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded border border-red-500/30 bg-red-950/20 p-2"><div className="text-[10px] text-slate-400">Critical roads</div><strong className="text-lg text-red-300">{analysis.critical_roads}</strong><div className="text-[10px] text-slate-500">of {analysis.roads_in_area} monitored</div></div>
      <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-2"><div className="text-[10px] text-slate-400">Peak depth</div><strong className="text-lg text-cyan-300">{analysis.max_predicted_depth_cm} cm</strong><div className="text-[10px] text-slate-500">ML P(flood) {analysis.ml_flood_probability_pct}%</div></div>
    </div>
    <div className="mt-2 space-y-1 text-[10px] text-slate-300">
      <div className="flex justify-between"><span>Population exposed</span><strong className="text-amber-300">{analysis.exposure.total_exposed_population.toLocaleString()}</strong></div>
      <div className="flex justify-between"><span>Hazard context</span><strong className="text-orange-300">{analysis.bhuvan_hazard.hazard_class}</strong></div>
      <div className="flex justify-between"><span>GPM-style 3h rain</span><strong className="text-blue-300">{analysis.gpm_imerg.rain_3h} mm</strong></div>
    </div>
    <p className="mt-2 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-400">{analysis.summary}</p>
  </div>
);