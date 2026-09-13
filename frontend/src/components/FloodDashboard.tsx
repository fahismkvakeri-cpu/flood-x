import React from 'react';
import { Activity, CloudRain, Droplets, Gauge, History, Siren, Waves } from 'lucide-react';
import { FloodPredictResponse, KPIs } from '../types';

interface ForecastPoint {
  horizon_min: number;
  avg_intensity_mm_hr: number;
  accumulated_mm: number;
  confidence_pct: number;
}

interface HistoricalObservation {
  rainfall_mm?: number;
  flood_occurred?: number;
  water_level_m?: number;
  river_discharge_m3s?: number;
  latitude?: number;
  longitude?: number;
}

interface HistoricalRainfall {
  status?: string;
  hours?: number[];
  latest_timestamp?: string | null;
  joined_flood_observations?: HistoricalObservation[];
}

interface FloodDashboardProps {
  predictData: FloodPredictResponse;
  forecast: ForecastPoint[];
  historical: HistoricalRainfall | null;
  kpis: KPIs;
  onOpenMap: () => void;
}

const chartPath = (values: number[], width: number, height: number, maxValue: number) => {
  if (!values.length) return '';
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Math.max(0, value) / Math.max(maxValue, 1)) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);

export const FloodDashboard: React.FC<FloodDashboardProps> = ({ predictData, forecast, historical, kpis, onOpenMap }) => {
  const recentRain = historical?.hours?.slice(-12) || [];
  const forecastRain = forecast.map((point) => point.avg_intensity_mm_hr);
  const depthValues = Object.values(predictData.timeline_projections).flatMap((series) => series.map((point) => point.depth_cm));
  const maxDepth = Math.max(...depthValues, 1);
  const observations = historical?.joined_flood_observations || [];
  const floodObservations = observations.filter((observation) => observation.flood_occurred === 1).length;
  const nodeValues = Object.values(predictData.drainage.nodes).map((node) => node.estimated_water_level_cm);
  const maxNodeLevel = Math.max(...nodeValues, 1);
  const topRoad = [...predictData.roads].sort((first, second) => second.predicted_depth_cm - first.predicted_depth_cm)[0];

  return (
    <section className="border-b border-slate-800 bg-[#111722] px-4 py-5 lg:px-8" aria-label="Flood and drainage dashboard">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300"><Activity className="h-3.5 w-3.5" /> Flood intelligence dashboard</div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Past patterns, live drainage, future risk</h2>
            <p className="mt-1 text-xs text-slate-400">Historical observations and model projections for the Mumbai pilot zone.</p>
          </div>
          <button type="button" onClick={onOpenMap} className="rounded-md border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20">Open live map</button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Current flood zones', value: kpis.active_flood_zones, detail: `${kpis.total_monitored_roads} roads monitored`, icon: Droplets, color: 'text-cyan-300', accent: 'from-cyan-500/30' },
            { label: 'Peak forecast depth', value: `${formatNumber(kpis.max_water_depth_cm)} cm`, detail: `at +${predictData.forecast_horizon_min} min`, icon: Waves, color: 'text-rose-300', accent: 'from-rose-500/30' },
            { label: 'Surcharged drains', value: predictData.drainage.surcharged_count, detail: `${formatNumber(predictData.drainage.drainage_effectiveness_pct)}% effective`, icon: Gauge, color: 'text-amber-300', accent: 'from-amber-500/30' },
            { label: 'Historical flood records', value: observations.length, detail: `${floodObservations} marked flooded`, icon: History, color: 'text-violet-300', accent: 'from-violet-500/30' },
          ].map(({ label, value, detail, icon: Icon, color, accent }) => (
            <div key={label} className={`rounded-lg border border-slate-700/70 bg-gradient-to-br ${accent} to-slate-900/60 p-4`}>
              <div className="flex items-start justify-between"><span className="text-xs text-slate-400">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div>
              <div className={`mt-3 text-2xl font-bold ${color}`}>{value}</div>
              <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_.9fr]">
          <ChartCard title="Historical rainfall" subtitle={`${historical?.status || 'ARCHIVE'} · last 12 hourly readings`} icon={<History className="h-4 w-4 text-violet-300" />}>
            <div className="flex h-44 items-end gap-1 border-b border-l border-slate-700/80 px-3 pb-2 pt-3">
              {recentRain.length ? recentRain.map((value, index) => <div key={`${value}-${index}`} className="group relative flex h-full flex-1 items-end"><div className="w-full rounded-t-sm bg-violet-400/75 transition group-hover:bg-violet-300" style={{ height: `${Math.max(5, (value / Math.max(...recentRain, 1)) * 100)}%` }} title={`${value.toFixed(1)} mm`} /></div>) : <EmptyChart label="No historical rainfall series available" />}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>Older</span><span>{historical?.latest_timestamp || 'Latest observation unavailable'}</span></div>
          </ChartCard>

          <ChartCard title="Future rainfall and depth" subtitle="0 to 180 minute model horizon" icon={<CloudRain className="h-4 w-4 text-cyan-300" />}>
            <div className="relative h-44 border-b border-l border-slate-700/80 px-3 pb-2 pt-3">
              <svg viewBox="0 0 320 150" className="h-full w-full overflow-visible" role="img" aria-label="Future rainfall and flood depth chart">
                <path d={chartPath(forecastRain, 300, 125, Math.max(...forecastRain, 1))} fill="none" stroke="#38bdf8" strokeWidth="3" />
                <path d={chartPath(depthValues.slice(0, 6), 300, 125, maxDepth)} fill="none" stroke="#fb7185" strokeWidth="3" strokeDasharray="6 5" />
              </svg>
              <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[9px] text-slate-500"><span>NOW</span><span>+60m</span><span>+120m</span><span>+180m</span></div>
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-slate-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />Rainfall intensity</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Projected depth</span></div>
          </ChartCard>

          <ChartCard title="Drainage system" subtitle="Live digital twin status" icon={<Gauge className="h-4 w-4 text-amber-300" />}>
            <div className="space-y-3">
              <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-3"><div className="flex items-center justify-between text-xs"><span className="text-slate-300">Water retention</span><strong className="text-amber-200">{formatNumber(predictData.drainage.retained_floodwater_m3)} m³</strong></div><Progress value={Math.min(100, predictData.drainage.drainage_effectiveness_pct)} color="bg-amber-400" /></div>
              <div className="space-y-2">{Object.values(predictData.drainage.nodes).slice(0, 4).map((node) => <div key={node.id}><div className="flex justify-between text-[10px]"><span className="truncate text-slate-300">{node.name}</span><span className={node.is_surcharged ? 'text-rose-300' : 'text-emerald-300'}>{node.estimated_water_level_cm} cm</span></div><Progress value={(node.estimated_water_level_cm / maxNodeLevel) * 100} color={node.is_surcharged ? 'bg-rose-400' : 'bg-emerald-400'} /></div>)}</div>
              <div className="flex items-center gap-2 border-t border-slate-800 pt-3 text-[10px] text-slate-400"><Siren className="h-3.5 w-3.5 text-rose-300" /> {predictData.drainage.water_level_rising ? 'Water levels rising at monitored nodes' : 'Water levels currently stable'}</div>
            </div>
          </ChartCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-white">Most exposed roads</h3><p className="mt-1 text-[10px] text-slate-500">Current model ranking with future depth projection</p></div><span className="text-[10px] uppercase tracking-widest text-slate-500">Live model</span></div>
            <div className="space-y-2">{[...predictData.roads].sort((first, second) => second.predicted_depth_cm - first.predicted_depth_cm).slice(0, 4).map((road) => <div key={road.road_id} className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2"><span className="w-5 text-xs font-bold text-slate-500">{road.risk_level === 'Critical' ? '!' : '·'}</span><span className="min-w-0 flex-1 truncate text-xs text-slate-200">{road.name}</span><span className="text-[10px] text-slate-500">{road.drain_utilization_pct}% drain</span><strong className="text-xs" style={{ color: road.color }}>{road.predicted_depth_cm} cm</strong></div>)}</div>
            {topRoad && <div className="mt-3 text-[10px] text-slate-500">Highest projected impact: <span className="text-slate-300">{topRoad.name}</span></div>}
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-bold text-white">Historical flood signal</h3></div><p className="mt-2 text-xs leading-relaxed text-slate-400">The archive joins nearby India flood observations with rainfall and water-level context. Use the live map below to inspect the exact locations.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md bg-slate-950/60 p-3"><div className="text-[10px] text-slate-500">Flooded records</div><div className="mt-1 text-xl font-bold text-violet-300">{floodObservations}</div></div><div className="rounded-md bg-slate-950/60 p-3"><div className="text-[10px] text-slate-500">Peak archive rain</div><div className="mt-1 text-xl font-bold text-cyan-300">{observations.length ? `${Math.max(...observations.map((item) => item.rainfall_mm || 0)).toFixed(0)} mm` : '--'}</div></div></div></div>
        </div>
      </div>
    </section>
  );
};

const ChartCard: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, children }) => <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4"><div className="mb-3 flex items-start gap-2">{icon}<div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-[10px] text-slate-500">{subtitle}</p></div></div>{children}</div>;
const Progress: React.FC<{ value: number; color: string }> = ({ value, color }) => <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} /></div>;
const EmptyChart: React.FC<{ label: string }> = ({ label }) => <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">{label}</div>;