import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface TimelineControlProps {
  currentHorizon: number;
  onSelectHorizon: (minutes: number) => void;
  accumulatedRainMm: number;
}

const HORIZONS = [0, 15, 30, 60, 90, 120, 180];

export const TimelineControl: React.FC<TimelineControlProps> = ({
  currentHorizon,
  onSelectHorizon,
  accumulatedRainMm,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentIndex = HORIZONS.indexOf(currentHorizon);
        if (currentIndex < HORIZONS.length - 1) {
          onSelectHorizon(HORIZONS[currentIndex + 1]);
        } else {
          setIsPlaying(false);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentHorizon, onSelectHorizon]);

  return (
    <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'PAUSE TIMELINE' : 'SIMULATE 0-3H'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onSelectHorizon(0);
          }}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Reset to NOW"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Forecast Horizon:</span>
          <span className="font-semibold text-cyan-300">
            {currentHorizon === 0 ? 'NOW (Live)' : `+${currentHorizon} min`}
          </span>
          <span className="text-slate-500">| Acc: {accumulatedRainMm} mm</span>
        </div>
      </div>

      {/* Horizon Step Selector Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {HORIZONS.map((min) => {
          const isActive = currentHorizon === min;
          return (
            <button
              key={min}
              onClick={() => {
                setIsPlaying(false);
                onSelectHorizon(min);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-400/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
            >
              {min === 0 ? 'NOW' : `+${min}m`}
            </button>
          );
        })}
      </div>
    </div>
  );
};
