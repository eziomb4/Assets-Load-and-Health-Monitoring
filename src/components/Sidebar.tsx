import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  RotateCcw,
  Wrench,
  X,
} from 'lucide-react';
import {
  AssetAlert,
  LTAsset,
  MonitoringView,
} from '../types/ltAssets';
import { computeAssetMetrics } from '../utils/telemetryEngine';

interface SidebarProps {
  activeView: MonitoringView;
  onSelectView: (view: MonitoringView) => void;
  assets: LTAsset[];
  alerts: AssetAlert[];
  onResetSimulation: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: MonitoringView;
  label: string;
  icon: typeof Activity;
}[] = [
  { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
  { id: 'assets', label: 'LT Asset Registry', icon: Cpu },
  { id: 'analytics', label: 'Phase & Load Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alarms & Diagnostics', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance Logs', icon: Wrench },
];

export function Sidebar({
  activeView,
  onSelectView,
  assets,
  alerts,
  onResetSimulation,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const counts = assets.reduce(
    (acc, asset) => {
      const m = computeAssetMetrics(asset);
      acc[m.healthState] += 1;
      return acc;
    },
    { Nominal: 0, Warning: 0, Critical: 0, Offline: 0 }
  );

  const openAlertsCount = alerts.filter((a) => a.status === 'Active').length;

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
            LT GridWatch
          </span>
          <p className="text-xs text-slate-500 whitespace-nowrap">
            415V Distribution Telemetry
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelectView(id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{label}</span>
              </span>
              {id === 'alerts' && openAlertsCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-rose-700 ml-2">
                  {openAlertsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-200 space-y-3 bg-slate-50/60">
        <div className="text-xs font-medium text-slate-500">
          Fleet State Summary
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 font-medium">● Nominal</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {counts.Nominal}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-amber-700 font-medium">▲ Warning</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {counts.Warning}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-rose-700 font-medium">✖ Critical</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {counts.Critical}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">○ Offline</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {counts.Offline}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetSimulation}
          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Baseline Data</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
