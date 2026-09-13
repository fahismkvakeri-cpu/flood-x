import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, CloudRain, Droplets, MapPinned, ShieldAlert } from 'lucide-react';
import { LocationBriefResponse } from '../../types';

export interface FloodBrief {
  id: string;
  title: string;
  subtitle: string;
  rainfall: string;
  depth: string;
  response: string;
  color: string;
}

export interface FloodHeroProps {
  briefs?: FloodBrief[];
  onEnterCommandCenter?: () => void;
  onUseLocation?: () => void;
  onApplyCoordinates?: (latitude: number, longitude: number) => void;
  locationBrief?: LocationBriefResponse | null;
  className?: string;
}

const DEFAULT_BRIEFS: FloodBrief[] = [
  { id: 'now', title: 'Nowcast Window', subtitle: 'Read the next 180 minutes before the streets change.', rainfall: '85 mm scenario', depth: '42 cm peak', response: 'Monitor drainage', color: '#38bdf8' },
  { id: 'surge', title: 'Drainage Surge', subtitle: 'A blocked conduit turns rainfall into backwater ponding.', rainfall: '120 mm + 40% blockage', depth: '77 cm at LBS Marg', response: 'Dispatch drain crew', color: '#fb923c' },
  { id: 'route', title: 'Safe Corridor', subtitle: 'Emergency vehicles move through the elevated network.', rainfall: 'Ambulance profile', depth: 'Under 25 cm', response: 'Use SCLR bypass', color: '#34d399' },
  { id: 'people', title: 'People First', subtitle: 'Exposure becomes a ranked evacuation decision.', rainfall: 'WorldPop grid', depth: '145,648 exposed', response: 'Open Bhabha shelter', color: '#c084fc' },
];

export default function FloodHero({ briefs = DEFAULT_BRIEFS, onEnterCommandCenter, onUseLocation, onApplyCoordinates, locationBrief, className }: FloodHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);
  const active = briefs[activeIndex] || briefs[0];
  const [latitude, setLatitude] = useState('19.0725');
  const [longitude, setLongitude] = useState('72.8765');

  useEffect(() => {
    if (!isPlaying || briefs.length < 2) return undefined;
    timerRef.current = window.setInterval(() => setActiveIndex((index) => (index + 1) % briefs.length), 4200);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isPlaying, briefs.length]);

  const move = (direction: number) => {
    setIsPlaying(false);
    setActiveIndex((index) => (index + direction + briefs.length) % briefs.length);
  };

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#06121a] text-white ${className || ''}`}>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2200&q=85')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,15,24,.98),rgba(3,25,36,.72),rgba(34,18,9,.75))]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 p-2"><Droplets className="h-5 w-5 text-cyan-200" /></div><div><div className="text-sm font-black tracking-[.28em] text-cyan-100">FLOOD-X</div><div className="text-[10px] uppercase tracking-widest text-slate-400">Urban flood intelligence</div></div></div>
          <div className="rounded-full border border-slate-600/70 bg-slate-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">Decision engine online</div>
        </header>

        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-xl">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.25em] text-cyan-300"><CloudRain className="h-4 w-4" /> 0-3 hour command brief</p>
            <h1 className="text-5xl font-black leading-[.95] tracking-tight sm:text-7xl">See the flood<br /><span className="text-cyan-300">before it moves.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">FLOOD-X combines rainfall nowcasting, drainage hydraulics, explainable risk, and ambulance-safe routing into one operational picture for Mumbai.</p>
            <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={onEnterCommandCenter} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300">Enter command center <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={onUseLocation} className="flex items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-950/40 px-4 py-3 text-xs font-bold text-cyan-100 hover:bg-cyan-900/60"><MapPinned className="h-4 w-4" /> Use my location</button></div>
            <div className="mt-4 flex max-w-md flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/45 p-2"><input aria-label="Latitude" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" placeholder="Latitude" /><input aria-label="Longitude" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" placeholder="Longitude" /><button type="button" onClick={() => onApplyCoordinates?.(Number(latitude), Number(longitude))} className="rounded bg-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-slate-600">Brief this location</button></div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-8 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/30 bg-slate-950/60 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.22em] text-slate-500">Live scenario</div><div className="mt-1 text-xl font-black" style={{ color: active.color }}>{active.title}</div></div><button type="button" onClick={() => setIsPlaying((playing) => !playing)} className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-bold text-slate-300">{isPlaying ? 'Pause' : 'Play'}</button></div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5"><div className="text-sm leading-relaxed text-slate-300">{locationBrief ? `Nearest monitored road: ${locationBrief.nearest_road.name} (${locationBrief.nearest_road.distance_km} km)` : active.subtitle}</div><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">Risk / depth</div><div className="mt-1 text-sm font-bold text-white">{locationBrief ? `${locationBrief.risk_level} · ${locationBrief.predicted_depth_cm} cm` : active.rainfall}</div></div><div className="rounded-xl bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">Probability</div><div className="mt-1 text-sm font-bold" style={{ color: active.color }}>{locationBrief ? `${locationBrief.flood_probability_pct}%` : active.depth}</div></div></div><div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-300"><ShieldAlert className="h-4 w-4" style={{ color: active.color }} /> {locationBrief ? locationBrief.recommended_action : `Recommended: ${active.response}`}</div>{locationBrief && <div className="mt-3 text-[10px] text-slate-500">{locationBrief.hazard.hazard_class} hazard · {locationBrief.rainfall.rain_3h} mm GPM-style 3h rain · {locationBrief.confidence_pct}% confidence</div>}</div>
              <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => move(-1)} aria-label="Previous brief" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-300"><ChevronUp className="h-4 w-4" /></button><div className="flex gap-1.5">{briefs.map((brief, index) => <button key={brief.id} type="button" aria-label={`Show ${brief.title}`} onClick={() => { setIsPlaying(false); setActiveIndex(index); }} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-cyan-300' : 'w-2 bg-slate-600'}`} />)}</div><button type="button" onClick={() => move(1)} aria-label="Next brief" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-300"><ChevronDown className="h-4 w-4" /></button></div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5 text-[10px] uppercase tracking-widest text-slate-500"><span>Physics + ML + field intelligence</span><span>MoES / NCMRWF · SIH26085</span></footer>
      </div>
    </main>
  );
}