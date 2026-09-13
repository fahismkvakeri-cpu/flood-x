import React from 'react';
import { AlertTriangle, Database, Navigation, SlidersHorizontal, Users } from 'lucide-react';
import { CriticalLocationPredictor } from './CriticalLocationPredictor';
import { ResponsePlanner } from './ResponsePlanner';
import { EmergencyRoutingPanel } from './EmergencyRoutingPanel';
import { WhatIfSimulator } from './WhatIfSimulator';
import {
  CitizenReport,
  CriticalLocationsResponse,
  DrainageSimulation,
  EvacuationSummaryResponse,
  InterventionImpactResponse,
  OperationsSummaryResponse,
  ResponsePlanResponse,
  RouteCalculationResponse,
  UserLayer,
} from '../types';

export type AppPage = 'overview' | 'brief' | 'response' | 'routing' | 'scenarios' | 'community';

interface MultiPageViewProps {
  page: AppPage;
  criticalLocations: CriticalLocationsResponse | null;
  responsePlan: ResponsePlanResponse | null;
  operationsData: OperationsSummaryResponse | null;
  evacuationData: EvacuationSummaryResponse | null;
  routeOrigin: { name: string; coords: [number, number] } | null;
  routeDestination: { name: string; coords: [number, number] } | null;
  routePickMode: 'origin' | 'destination' | null;
  routeError: string | null;
  routeData: RouteCalculationResponse | null;
  onStartPicking: (mode: 'origin' | 'destination') => void;
  onRecalculateRoute: () => void;
  rainfallScenarioMm: number;
  onRainfallChange: (value: number) => void;
  blockagePct: number;
  onBlockageChange: (value: number) => void;
  drainage: DrainageSimulation | null;
  interventionImpact: InterventionImpactResponse | null;
  onEvaluateIntervention: (type: string) => void;
  onResetScenario: () => void;
  citizenReports: CitizenReport[];
  userLayers: UserLayer[];
  onOpenUpload: () => void;
  onOpenReport: () => void;
  onSelectCriticalLocation: (location: CriticalLocationsResponse['locations'][number]) => void;
}

export const MultiPageView: React.FC<MultiPageViewProps> = (props) => {
  const { page } = props;
  const pageMeta: Record<Exclude<AppPage, 'overview' | 'brief'>, { title: string; description: string; icon: typeof AlertTriangle }> = {
    response: { title: 'Critical Response', description: 'Ranked actions for the roads and populations that need attention first.', icon: AlertTriangle },
    routing: { title: 'Emergency Routing', description: 'Flood-aware ambulance routing with vehicle safety limits.', icon: Navigation },
    scenarios: { title: 'What-If Scenarios', description: 'Test rainfall and drainage interventions before crews move.', icon: SlidersHorizontal },
    community: { title: 'Community Data', description: 'Ground reports and municipal layers strengthen the flood model.', icon: Users },
  };
  const metadata = pageMeta[page as Exclude<AppPage, 'overview' | 'brief'>];
  const HeadingIcon = metadata.icon;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 px-4 py-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-start gap-3 border-b border-slate-800 pb-4">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300"><HeadingIcon className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-bold text-white">{metadata.title}</h2><p className="mt-1 text-sm text-slate-400">{metadata.description}</p></div>
        </div>

        {page === 'response' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {props.criticalLocations && <CriticalLocationPredictor data={props.criticalLocations} onSelectLocation={props.onSelectCriticalLocation} />}
            {props.responsePlan && <ResponsePlanner plan={props.responsePlan} />}
            {props.operationsData && <section className="rounded-xl border border-amber-500/30 bg-slate-900 p-4"><h3 className="mb-3 text-sm font-bold text-amber-200">Field Operations</h3><p className="mb-3 text-xs text-slate-400">{props.operationsData.recommendation}</p><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded bg-slate-800 p-2"><div className="text-slate-400">Critical</div><strong className="text-red-300">{props.operationsData.priority_summary.critical}</strong></div><div className="rounded bg-slate-800 p-2"><div className="text-slate-400">High</div><strong className="text-amber-300">{props.operationsData.priority_summary.high}</strong></div><div className="rounded bg-slate-800 p-2"><div className="text-slate-400">Health</div><strong className="text-emerald-300">{props.operationsData.service_health_pct}%</strong></div></div></section>}
            {props.evacuationData && <section className="rounded-xl border border-violet-500/30 bg-slate-900 p-4"><h3 className="mb-2 text-sm font-bold text-violet-200">Evacuation Decision</h3><div className="text-2xl font-bold text-white">{props.evacuationData.total_exposed_population.toLocaleString()}</div><p className="text-xs text-slate-400">people exposed · {props.evacuationData.evacuation_priority} priority</p><p className="mt-3 text-xs text-violet-200">Recommended: {props.evacuationData.recommended_shelter.name}</p></section>}
          </div>
        )}

        {page === 'routing' && <div className="mx-auto max-w-xl"><EmergencyRoutingPanel {...props} /></div>}
        {page === 'scenarios' && <div className="mx-auto max-w-xl"><WhatIfSimulator rainfallScenarioMm={props.rainfallScenarioMm} onRainfallChange={props.onRainfallChange} blockagePct={props.blockagePct} onBlockageChange={props.onBlockageChange} drainage={props.drainage} interventionImpact={props.interventionImpact} onEvaluateIntervention={props.onEvaluateIntervention} onReset={props.onResetScenario} /></div>}

        {page === 'community' && <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-cyan-500/30 bg-slate-900 p-4"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-bold text-white">Municipal Layers</h3></div><p className="mt-2 text-xs text-slate-400">Upload drainage surveys, emergency assets, rainfall series, or custom road vectors.</p><button type="button" onClick={props.onOpenUpload} className="mt-4 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white">Upload Dataset</button><div className="mt-4 space-y-2">{props.userLayers.map((layer) => <div key={layer.id} className="rounded border border-slate-700 bg-slate-800 p-2 text-xs text-white">{layer.name}<span className="ml-2 text-[10px] text-emerald-300">{layer.feature_count} features</span></div>)}</div></section><section className="rounded-xl border border-amber-500/30 bg-slate-900 p-4"><h3 className="text-sm font-bold text-white">Citizen Observations</h3><p className="mt-2 text-xs text-slate-400">Field reports are fused with model predictions to validate local conditions.</p><button type="button" onClick={props.onOpenReport} className="mt-4 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white">Report Flood</button><div className="mt-4 space-y-2">{props.citizenReports.slice(0, 8).map((report) => <div key={report.id} className="rounded border border-slate-700 bg-slate-800 p-2 text-xs"><div className="flex justify-between text-white"><span>{report.location_name}</span><strong className="text-amber-300">{report.depth_cm} cm</strong></div><div className="mt-1 text-slate-400">{report.road_status} · {report.drain_status}</div></div>)}</div></section></div>}
      </div>
    </main>
  );
};