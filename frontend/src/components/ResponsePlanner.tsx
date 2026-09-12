import React from 'react';
import { CheckCircle2, Siren, Users } from 'lucide-react';
import { ResponsePlanResponse } from '../types';

interface ResponsePlannerProps {
  plan: ResponsePlanResponse;
}

export const ResponsePlanner: React.FC<ResponsePlannerProps> = ({ plan }) => (
  <div className="space-y-3 rounded-xl border border-rose-500/40 bg-slate-800/50 p-3.5">
    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
      <div className="flex items-center gap-2">
        <Siren className="h-4 w-4 text-rose-300" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-rose-200">AI Response Planner</h3>
      </div>
      <span className="rounded border border-rose-700 bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">LIVE PRIORITY</span>
    </div>

    <p className="text-[11px] leading-relaxed text-slate-300">{plan.decision_summary}</p>
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2 text-xs text-emerald-200">
      <Users className="h-4 w-4" />
      <span><strong>{plan.total_population_protected.toLocaleString()}</strong> modeled protection opportunities</span>
    </div>

    <div className="space-y-2">
      {plan.actions.map((action, index) => (
        <div key={action.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2.5">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-200">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-white">{action.title}</div>
                <span className="shrink-0 rounded bg-rose-950/70 px-1.5 py-0.5 text-[9px] font-bold text-rose-200">{action.urgency}</span>
              </div>
              <div className="mt-1 text-[10px] text-cyan-200">Target: {action.target}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{action.reason}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
                <span className="text-emerald-300"><CheckCircle2 className="mr-1 inline h-3 w-3" />{action.population_protected.toLocaleString()} protected</span>
                {action.expected_depth_reduction_cm > 0 && <span className="text-cyan-300">-{action.expected_depth_reduction_cm} cm modeled</span>}
              </div>
              <div className="mt-1 text-[9px] text-slate-500">{action.evidence}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);