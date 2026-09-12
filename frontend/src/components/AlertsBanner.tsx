import React, { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp, BellRing } from 'lucide-react';
import { AlertItem } from '../types';

interface AlertsBannerProps {
  alerts: AlertItem[];
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({ alerts }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const primaryAlert = alerts[0];

  return (
    <div className="bg-red-950/40 border-b border-red-500/30 text-red-200">
      <div className="px-4 py-2 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
            <BellRing className="w-3.5 h-3.5" />
            HIGH FLOOD ALERT:
          </span>
          <p className="text-xs font-medium text-red-100 truncate">
            {primaryAlert.message}
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-red-300 hover:text-white flex items-center gap-1 flex-shrink-0 bg-red-900/40 px-2 py-1 rounded transition"
        >
          <span>{alerts.length} Alerts</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="px-4 py-3 bg-red-950/70 border-t border-red-900/40 max-h-48 overflow-y-auto space-y-1.5">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="text-xs flex items-center justify-between p-2 rounded bg-red-900/20 border border-red-800/40"
            >
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-red-100">{a.message}</span>
              </div>
              {a.depth_cm && (
                <span className="text-[11px] font-mono font-bold text-red-400 flex-shrink-0 ml-2">
                  Depth: {a.depth_cm} cm
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
