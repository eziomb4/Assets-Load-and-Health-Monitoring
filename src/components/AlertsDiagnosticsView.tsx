import { useState } from 'react';
import { Check, CheckCircle2, Zap } from 'lucide-react';
import { AlertSeverity, AlertStatus, AssetAlert, LTAsset } from '../types/ltAssets';

interface AlertsDiagnosticsViewProps {
  assets: LTAsset[];
  alerts: AssetAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onResolveAlert: (id: string) => void;
  onInspectAsset: (asset: LTAsset) => void;
  onInjectFaultScenario: (
    assetId: string,
    scenario: 'overload' | 'imbalance' | 'cooling' | 'nominal'
  ) => void;
}

export function AlertsDiagnosticsView({
  assets,
  alerts,
  onAcknowledgeAlert,
  onResolveAlert,
  onInspectAsset,
  onInjectFaultScenario,
}: AlertsDiagnosticsViewProps) {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'All'>('All');
  const [simAssetId, setSimAssetId] = useState<string>(
    () => assets.find((a) => a.energized)?.id ?? assets[0]?.id ?? ''
  );

  const filtered = alerts.filter((a) => {
    const matchSev = severityFilter === 'All' || a.severity === severityFilter;
    const matchStat = statusFilter === 'All' || a.status === statusFilter;
    return matchSev && matchStat;
  });

  return (
    <div className="space-y-6">
      {/* Fault & Load Surge Test Bench */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Threshold &amp; Fault Simulation Bench
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inject load surges, phase skew, or cooling faults on an energized asset to verify real-time thermal drift and alarm triggering
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select asset for fault simulation"
              value={simAssetId}
              onChange={(e) => setSimAssetId(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {assets
                .filter((a) => a.energized)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
            </select>

            <button
              type="button"
              onClick={() => onInjectFaultScenario(simAssetId, 'overload')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate 115% Overload</span>
            </button>

            <button
              type="button"
              onClick={() => onInjectFaultScenario(simAssetId, 'imbalance')}
              className="px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap"
            >
              Phase R Imbalance
            </button>

            <button
              type="button"
              onClick={() => onInjectFaultScenario(simAssetId, 'cooling')}
              className="px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap"
            >
              Cooling Fan Fault
            </button>

            <button
              type="button"
              onClick={() => onInjectFaultScenario(simAssetId, 'nominal')}
              className="px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap"
            >
              Restore Nominal
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Alarms Log */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Threshold Breach &amp; Diagnostics Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acknowledge active incidents or inspect the underlying asset telemetry
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(['All', 'Critical', 'Warning'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    severityFilter === sev
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(['All', 'Active', 'Acknowledged', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No alarms match the selected severity and status filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6 whitespace-nowrap">Time</th>
                  <th className="py-3 px-4 whitespace-nowrap">Severity</th>
                  <th className="py-3 px-4 whitespace-nowrap">Asset &amp; Zone</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category &amp; Event</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Measured / Limit</th>
                  <th className="py-3 px-4 whitespace-nowrap">State</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filtered.map((alert) => {
                  const targetAsset = assets.find((a) => a.id === alert.assetId);
                  return (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {alert.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            alert.severity === 'Critical'
                              ? 'text-rose-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {alert.severity === 'Critical' ? '✖ Critical' : '▲ Warning'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => targetAsset && onInspectAsset(targetAsset)}
                          className="text-left group"
                        >
                          <div className="font-mono font-semibold text-slate-900 group-hover:text-blue-700">
                            {alert.assetCode}
                          </div>
                          <div className="text-slate-500">{alert.zone}</div>
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900">{alert.category}</div>
                        <div className="text-slate-600 mt-0.5">{alert.message}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {alert.measuredValue}
                        </span>
                        <span className="text-slate-400"> / {alert.thresholdLimit}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            alert.status === 'Active'
                              ? 'text-rose-700'
                              : alert.status === 'Acknowledged'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {alert.status === 'Active' && (
                            <button
                              type="button"
                              onClick={() => onAcknowledgeAlert(alert.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100"
                            >
                              <Check className="w-3 h-3" />
                              <span>Acknowledge</span>
                            </button>
                          )}
                          {alert.status !== 'Resolved' && (
                            <button
                              type="button"
                              onClick={() => onResolveAlert(alert.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
