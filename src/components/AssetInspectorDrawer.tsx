import { useState } from 'react';
import { Power, X } from 'lucide-react';
import { AssetThresholds, LTAsset, SimulationProfile } from '../types/ltAssets';
import {
  computeAssetMetrics,
  getHealthStateBadge,
} from '../utils/telemetryEngine';
import {
  DualAxisLoadTempChart,
  HealthSpiderChart,
  PhaseCurrentComparison,
} from './TelemetryCharts';

interface AssetInspectorDrawerProps {
  asset: LTAsset;
  onClose: () => void;
  onToggleEnergized: (assetId: string) => void;
  onUpdateSimulation: (assetId: string, patch: Partial<SimulationProfile>) => void;
  onUpdateThresholds: (assetId: string, thresholds: AssetThresholds) => void;
}

export function AssetInspectorDrawer({
  asset,
  onClose,
  onToggleEnergized,
  onUpdateSimulation,
  onUpdateThresholds,
}: AssetInspectorDrawerProps) {
  const [thresholds, setThresholds] = useState<AssetThresholds>(asset.thresholds);
  const [savedNotice, setSavedNotice] = useState(false);

  const metrics = computeAssetMetrics(asset);
  const badge = getHealthStateBadge(metrics.healthState);

  const handleSaveThresholds = () => {
    onUpdateThresholds(asset.id, thresholds);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label={`Telemetry inspector for ${asset.code}`}
        className="relative z-10 w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {asset.code}
              </span>
              <span className={`text-xs font-semibold ${badge.textClass}`}>
                {badge.glyph} {badge.label}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{asset.feederRef}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900 mt-1 truncate">
              {asset.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {asset.category} · {asset.zone} · {asset.ratedKva} kVA ({asset.ratedCurrentA} A)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleEnergized(asset.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                asset.energized
                  ? 'text-slate-700 bg-white border-slate-200 hover:bg-slate-100'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{asset.energized ? 'Isolate Breaker' : 'Energize Breaker'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-md"
              aria-label="Close inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-7">
          {/* Live Telemetry Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Apparent Load</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {metrics.apparentKva.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">kVA</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500">
                {metrics.loadPct.toFixed(1)}% rated
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Primary / Hotspot</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {asset.thermal.primaryTempC.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">°C</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500">
                Hotspot {asset.thermal.hotspotTempC.toFixed(1)} °C
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Power Factor / THD</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {asset.energized ? asset.telemetry.pf.toFixed(3) : '—'}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500">
                THD_I {asset.telemetry.thdI.toFixed(1)}%
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-xs text-slate-500">Health Index</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {asset.energized ? `${metrics.subScores.healthIndex}` : '—'}
                <span className="text-xs font-normal text-slate-400"> / 100</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500">
                IR {asset.insulationIR_MOhm} MΩ
              </div>
            </div>
          </div>

          {/* Rolling Load & Thermal Chart */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Rolling Load &amp; Temperature Curve
            </h3>
            <DualAxisLoadTempChart
              history={asset.history}
              loadWarnPct={asset.thresholds.loadWarnPct}
              tempWarnC={asset.thresholds.tempWarnC}
              height={200}
            />
          </div>

          {/* Phase Currents & 6-Axis Health Spider Chart */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 border-t border-slate-200">
            <div className="md:col-span-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                3-Phase Voltage &amp; Current Telemetry
              </h3>
              <PhaseCurrentComparison asset={asset} />

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-400">V_RN</span>
                  <div className="font-semibold text-slate-900">
                    {asset.telemetry.vR.toFixed(1)} V
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">V_YN</span>
                  <div className="font-semibold text-slate-900">
                    {asset.telemetry.vY.toFixed(1)} V
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">V_BN</span>
                  <div className="font-semibold text-slate-900">
                    {asset.telemetry.vB.toFixed(1)} V
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                6-Axis Health Diagnostics
              </h3>
              <HealthSpiderChart scores={metrics.subScores} />
            </div>
          </div>

          {/* Interactive Load & Fault Simulation */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Interactive Load &amp; Stress Simulation
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust feeder demand multiplier or toggle cooling fault to observe thermal drift
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-blue-700">
                {(asset.simulation.loadBias * 100).toFixed(0)}% demand bias
              </span>
            </div>

            <input
              type="range"
              min="0.4"
              max="1.8"
              step="0.05"
              value={asset.simulation.loadBias}
              onChange={(e) =>
                onUpdateSimulation(asset.id, {
                  loadBias: Number(e.target.value),
                })
              }
              className="w-full accent-blue-700 cursor-pointer"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateSimulation(asset.id, {
                    loadBias: 0.95,
                    phaseSkewR: 1.0,
                    phaseSkewY: 1.0,
                    phaseSkewB: 1.0,
                    coolingFault: false,
                  })
                }
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
              >
                Nominal Balanced
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateSimulation(asset.id, {
                    loadBias: 1.55,
                    phaseSkewR: 1.24,
                    phaseSkewY: 0.92,
                    phaseSkewB: 0.88,
                  })
                }
                className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
              >
                Peak Overload + Skew
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateSimulation(asset.id, {
                    coolingFault: !asset.simulation.coolingFault,
                  })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                  asset.simulation.coolingFault
                    ? 'text-amber-800 bg-amber-100 border-amber-300'
                    : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {asset.simulation.coolingFault ? 'Cooling Fault Active' : 'Simulate Cooling Fault'}
              </button>
            </div>
          </div>

          {/* Threshold Configuration */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Alarm Threshold Configuration
              </h3>
              {savedNotice && (
                <span className="text-xs font-medium text-emerald-700">
                  Thresholds updated
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <label className="block">
                <span className="text-slate-500">Load Warn (%)</span>
                <input
                  type="number"
                  value={thresholds.loadWarnPct}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      loadWarnPct: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-slate-500">Load Critical (%)</span>
                <input
                  type="number"
                  value={thresholds.loadCritPct}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      loadCritPct: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-slate-500">Temp Warn (°C)</span>
                <input
                  type="number"
                  value={thresholds.tempWarnC}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      tempWarnC: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-slate-500">Temp Critical (°C)</span>
                <input
                  type="number"
                  value={thresholds.tempCritC}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      tempCritC: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-slate-500">Unbalance Warn (%)</span>
                <input
                  type="number"
                  value={thresholds.unbalanceWarnPct}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      unbalanceWarnPct: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-slate-500">PF Min Floor</span>
                <input
                  type="number"
                  step="0.01"
                  value={thresholds.pfMinWarn}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      pfMinWarn: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveThresholds}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
              >
                Apply Thresholds
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
