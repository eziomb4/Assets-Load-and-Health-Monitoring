import { useEffect, useRef, useState } from 'react';
import { Download, Menu, Pause, Play, Plus } from 'lucide-react';
import {
  INITIAL_ALERTS,
  INITIAL_LT_ASSETS,
  INITIAL_MAINTENANCE_RECORDS,
} from './data/ltAssetsSeed';
import {
  AssetAlert,
  AssetThresholds,
  LTAsset,
  MaintenanceRecord,
  MonitoringView,
  SimulationProfile,
} from './types/ltAssets';
import {
  evaluateAssetAlerts,
  exportAssetTelemetryToExcel,
  stepAssetTelemetry,
} from './utils/telemetryEngine';
import { Sidebar } from './components/Sidebar';
import { LiveTelemetryView } from './components/LiveTelemetryView';
import { AssetRegistryView } from './components/AssetRegistryView';
import { PhaseAnalyticsView } from './components/PhaseAnalyticsView';
import { AlertsDiagnosticsView } from './components/AlertsDiagnosticsView';
import { MaintenanceView } from './components/MaintenanceView';
import { AssetInspectorDrawer } from './components/AssetInspectorDrawer';
import { RegisterAssetModal } from './components/RegisterAssetModal';

const STORAGE_KEYS = {
  assets: 'lt_gridwatch_assets_v1',
  alerts: 'lt_gridwatch_alerts_v1',
  maintenance: 'lt_gridwatch_maintenance_v1',
};

function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

const VIEW_TITLES: Record<MonitoringView, string> = {
  telemetry: 'Live Telemetry Console',
  assets: 'LT Asset Registry',
  analytics: 'Phase & Load Analytics',
  alerts: 'Alarms & Diagnostics',
  maintenance: 'Maintenance & Dielectric Logs',
};

export default function App() {
  const [activeView, setActiveView] = useState<MonitoringView>('telemetry');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);

  const [assets, setAssets] = useState<LTAsset[]>(() =>
    loadArray(STORAGE_KEYS.assets, INITIAL_LT_ASSETS)
  );
  const [alerts, setAlerts] = useState<AssetAlert[]>(() =>
    loadArray(STORAGE_KEYS.alerts, INITIAL_ALERTS)
  );
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >(() => loadArray(STORAGE_KEYS.maintenance, INITIAL_MAINTENANCE_RECORDS));

  const [inspectingAssetId, setInspectingAssetId] = useState<string | null>(
    null
  );
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  // Persist changes safely
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
    } catch {
      // ignore storage quota errors
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
    } catch {
      // ignore storage quota errors
    }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.maintenance,
        JSON.stringify(maintenanceRecords)
      );
    } catch {
      // ignore storage quota errors
    }
  }, [maintenanceRecords]);

  // Live 2-second telemetry polling loop
  useEffect(() => {
    if (!isStreaming) return;
    const interval = window.setInterval(() => {
      const timeLabel = new Date().toTimeString().slice(0, 8);
      const updatedAssets = assetsRef.current.map((asset) =>
        stepAssetTelemetry(asset, timeLabel)
      );
      setAssets(updatedAssets);
      setAlerts((prevAlerts) =>
        evaluateAssetAlerts(updatedAssets, prevAlerts, timeLabel)
      );
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isStreaming]);

  const inspectingAsset =
    assets.find((a) => a.id === inspectingAssetId) ?? null;

  const handleToggleEnergized = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== assetId) return a;
        const nextEnergized = !a.energized;
        const nominalLN = Number((a.nominalVoltageV / Math.sqrt(3)).toFixed(1));
        const initI = Number((a.ratedCurrentA * 0.55).toFixed(1));
        return {
          ...a,
          energized: nextEnergized,
          breakerOpsCount: a.breakerOpsCount + 1,
          telemetry: nextEnergized
            ? {
                ...a.telemetry,
                vR: nominalLN,
                vY: nominalLN,
                vB: nominalLN,
                iR: initI,
                iY: initI,
                iB: initI,
                iN: 12.0,
                pf: 0.95,
                thdV: 2.0,
                thdI: 3.8,
                freqHz: 50.0,
              }
            : a.telemetry,
        };
      })
    );
  };

  const handleUpdateSimulation = (
    assetId: string,
    patch: Partial<SimulationProfile>
  ) => {
    const timeLabel = new Date().toTimeString().slice(0, 8);
    setAssets((prev) => {
      const next = prev.map((a) => {
        if (a.id !== assetId) return a;
        const patched: LTAsset = {
          ...a,
          simulation: { ...a.simulation, ...patch },
        };
        return stepAssetTelemetry(patched, timeLabel);
      });
      setAlerts((prevAlerts) =>
        evaluateAssetAlerts(next, prevAlerts, timeLabel)
      );
      return next;
    });
  };

  const handleUpdateThresholds = (
    assetId: string,
    thresholds: AssetThresholds
  ) => {
    const timeLabel = new Date().toTimeString().slice(0, 8);
    setAssets((prev) => {
      const next = prev.map((a) =>
        a.id === assetId ? { ...a, thresholds } : a
      );
      setAlerts((prevAlerts) =>
        evaluateAssetAlerts(next, prevAlerts, timeLabel)
      );
      return next;
    });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((al) =>
        al.id === alertId ? { ...al, status: 'Acknowledged' } : al
      )
    );
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((al) => (al.id === alertId ? { ...al, status: 'Resolved' } : al))
    );
  };

  const handleInjectFaultScenario = (
    assetId: string,
    scenario: 'overload' | 'imbalance' | 'cooling' | 'nominal'
  ) => {
    if (scenario === 'overload') {
      handleUpdateSimulation(assetId, {
        loadBias: 1.85,
        phaseSkewR: 1.04,
        phaseSkewY: 1.0,
        phaseSkewB: 0.98,
      });
    } else if (scenario === 'imbalance') {
      handleUpdateSimulation(assetId, {
        loadBias: 1.28,
        phaseSkewR: 1.38,
        phaseSkewY: 0.86,
        phaseSkewB: 0.82,
      });
    } else if (scenario === 'cooling') {
      handleUpdateSimulation(assetId, {
        loadBias: 1.35,
        coolingFault: true,
      });
    } else {
      handleUpdateSimulation(assetId, {
        loadBias: 0.95,
        phaseSkewR: 1.0,
        phaseSkewY: 0.99,
        phaseSkewB: 1.01,
        coolingFault: false,
      });
    }
  };

  const handleAddMaintenanceRecord = (
    record: Omit<MaintenanceRecord, 'id'>
  ) => {
    const created: MaintenanceRecord = {
      ...record,
      id: `mnt-${Date.now()}`,
    };
    setMaintenanceRecords((prev) => [created, ...prev]);

    // Sync measured IR, Earth resistance, and maintenance date onto asset
    setAssets((prev) =>
      prev.map((a) =>
        a.id === record.assetId
          ? {
              ...a,
              insulationIR_MOhm: record.irValueMOhm,
              neutralEarthOhm: record.earthResistanceOhm,
              lastMaintenanceDate: record.date,
            }
          : a
      )
    );
  };

  const handleCommissionAsset = (asset: LTAsset) => {
    setAssets((prev) => [asset, ...prev]);
    setRegisterModalOpen(false);
    setInspectingAssetId(asset.id);
  };

  const handleResetSimulation = () => {
    setAssets(INITIAL_LT_ASSETS);
    setAlerts(INITIAL_ALERTS);
    setMaintenanceRecords(INITIAL_MAINTENANCE_RECORDS);
    setInspectingAssetId(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        assets={assets}
        alerts={alerts}
        onResetSimulation={handleResetSimulation}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                LT Distribution
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate whitespace-nowrap">
                {VIEW_TITLES[activeView]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsStreaming((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isStreaming
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                  : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              title={
                isStreaming
                  ? 'Pause 2-second live telemetry polling'
                  : 'Resume 2-second live telemetry polling'
              }
            >
              {isStreaming ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <Pause className="w-3 h-3" />
                  <span className="font-mono">Live · 2s</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span className="font-mono">Paused</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                void exportAssetTelemetryToExcel(assets, alerts);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Asset</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeView === 'telemetry' && (
            <LiveTelemetryView
              assets={assets}
              alerts={alerts}
              onInspectAsset={(asset) => setInspectingAssetId(asset.id)}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onNavigateAlerts={() => setActiveView('alerts')}
            />
          )}

          {activeView === 'assets' && (
            <AssetRegistryView
              assets={assets}
              onInspectAsset={(asset) => setInspectingAssetId(asset.id)}
              onToggleEnergized={handleToggleEnergized}
              onOpenRegisterModal={() => setRegisterModalOpen(true)}
            />
          )}

          {activeView === 'analytics' && (
            <PhaseAnalyticsView
              assets={assets}
              onInspectAsset={(asset) => setInspectingAssetId(asset.id)}
            />
          )}

          {activeView === 'alerts' && (
            <AlertsDiagnosticsView
              assets={assets}
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onResolveAlert={handleResolveAlert}
              onInspectAsset={(asset) => setInspectingAssetId(asset.id)}
              onInjectFaultScenario={handleInjectFaultScenario}
            />
          )}

          {activeView === 'maintenance' && (
            <MaintenanceView
              assets={assets}
              records={maintenanceRecords}
              onAddRecord={handleAddMaintenanceRecord}
            />
          )}
        </main>
      </div>

      {inspectingAsset && (
        <AssetInspectorDrawer
          key={inspectingAsset.id}
          asset={inspectingAsset}
          onClose={() => setInspectingAssetId(null)}
          onToggleEnergized={handleToggleEnergized}
          onUpdateSimulation={handleUpdateSimulation}
          onUpdateThresholds={handleUpdateThresholds}
        />
      )}

      {registerModalOpen && (
        <RegisterAssetModal
          onClose={() => setRegisterModalOpen(false)}
          onSave={handleCommissionAsset}
        />
      )}
    </div>
  );
}
