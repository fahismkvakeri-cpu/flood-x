import React from 'react';
import { Waves, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

interface NavbarProps {
  activeAlertCount: number;
  lastUpdate: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeAlertCount, lastUpdate }) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
          <Waves className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              FLOOD-X
            </h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
              SIH26085 • MoES / NCMRWF
            </span>
          </div>
          <p className="text-xs text-slate-400">
            AI-Powered Urban Flood Nowcasting & Drainage Digital Twin
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Pilot Zone Badge */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-xs">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Pilot Urban Zone:</span>
          <span className="text-slate-200 font-medium">Mumbai Kurla/BKC (10 km²)</span>
        </div>

        {/* Live Radar Pulse */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="font-semibold text-red-400 uppercase tracking-wider text-[11px]">LIVE RADAR</span>
          <span className="text-slate-400 border-l border-slate-700 pl-2">{lastUpdate}</span>
        </div>

        {/* Alerts Pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
          activeAlertCount > 0 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {activeAlertCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeAlertCount} Critical Warnings</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Network Stable</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
