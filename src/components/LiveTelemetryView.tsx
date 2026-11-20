import { useState } from 'react';
import { ArrowUpRight, Check, SlidersHorizontal } from 'lucide-react';
import { AssetAlert, LTAsset, LT_ZONES } from '../types/ltAssets';
import {
  computeAssetMetrics,
  getHealthStateBadge,
} from '../utils/telemetryEngine';
import {
  DualAxisLoadTempChart,
  PhaseCurrentComparison,
} from './TelemetryCharts';

interface LiveTelemetryViewProps {
  assets: LTAsset[];
  alerts: AssetAlert[];
  onInspectAsset: (asset: LTAsset) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onNavigateAlerts: () => void;
}

export function LiveTelemetryView({
  assets,
  alerts,
  onInspectAsset,
  onAcknowledgeAlert,
  onNavigateAlerts,
}: LiveTelemetryViewProps) {
  const [focusedAssetId, setFocusedAssetId] = useState<string>(
    () => assets[1]?.id ?? assets[0]?.id ?? ''
  );
  const [zoneFilter, setZoneFilter] = useState<string>('All');

  const filteredAssets =
    zoneFilter === 'All'
      ? assets
      : assets.filter((a) => a.zone === zoneFilter);

  const energizedAssets = assets.filter((a) => a.energized);
  const computedMap = new Map(
    assets.map((a) => [a.id, computeAssetMetrics(a)])
  );

  const totalLiveKva = energizedAssets.reduce(
    (sum, a) => sum + (computedMap.get(a.id)?.apparentKva ?? 0),
    0
  );
  const totalLiveKw = energizedAssets.reduce(
    (sum, a) => sum + (computedMap.get(a.id)?.activeKw ?? 0),
    0
  );
  const totalRatedKva = energizedAssets.reduce((sum, a) => sum + a.ratedKva, 0);
  const fleetLoadingPct =
    totalRatedKva > 0 ? (totalLiveKva / totalRatedKva) * 100 : 0;

  const avgHealthIndex =
    energizedAssets.length > 0
      ? Math.round(
          energizedAssets.reduce(
            (sum, a) => sum + (computedMap.get(a.id)?.subScores.healthIndex ?? 0),
            0
          ) / energizedAssets.length
        )
      : 0;

  const peakAsset = energizedAssets.reduce<{
    asset: LTAsset | null;
    loadPct: number;
  }>(
    (best, a) => {
      const lp = computedMap.get(a.id)?.loadPct ?? 0;
      return lp > best.loadPct ? { asset: a, loadPct: lp } : best;
    },
    { asset: null, loadPct: 0 }
  );

  const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const criticalCount = activeAlerts.filter(
    (a) => a.severity === 'Critical'
  ).length;
  const warningCount = activeAlerts.filter(
    (a) => a.severity === 'Warning'
  ).length;

  const focusedAsset =
    assets.find((a) => a.id === focusedAssetId) ?? assets[0] ?? null;
  const focusedMetrics = focusedAsset
    ? computedMap.get(focusedAsset.id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section
        aria-label="Live Fleet Telemetry Summary"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Connected Load
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalLiveKva.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">kVA</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {totalLiveKw.toFixed(1)} kW active · {totalRatedKva} kVA rated
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Fleet Capacity Utilization
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {fleetLoadingPct.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">%</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 truncate">
            {peakAsset.asset
              ? `Peak: ${peakAsset.asset.code} at ${peakAsset.loadPct.toFixed(1)}%`
              : 'All feeders de-energized'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Active Threshold Alarms
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {activeAlerts.length}
          </p>
          <p className="mt-1.5 text-xs font-mono tabular-nums">
            <span className="text-rose-700 font-medium">
              {criticalCount} critical
            </span>
            <span className="text-slate-300 mx-1.5">·</span>
            <span className="text-amber-700 font-medium">
              {warningCount} warning
            </span>
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Composite Fleet Health Index
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {avgHealthIndex}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {energizedAssets.length} of {assets.length} LT assets energized
          </p>
        </div>
      </section>

      {/* Main Focal Stage: Live Asset Waveform + Threshold Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900">
                  Live Load &amp; Thermal Telemetry Stream
                </h2>
                {focusedMetrics && (
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      getHealthStateBadge(focusedMetrics.healthState).textClass
                    }`}
                  >
                    {getHealthStateBadge(focusedMetrics.healthState).glyph}{' '}
                    {getHealthStateBadge(focusedMetrics.healthState).label}
                  </span>
                )}
              </div>
              {focusedAsset && (
                <p className="text-xs text-slate-500 mt-1">
                  {focusedAsset.code} · {focusedAsset.name} ·{' '}
                  {focusedAsset.zone}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Select LT asset for live chart"
                value={focusedAsset?.id ?? ''}
                onChange={(e) => setFocusedAssetId(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[240px]"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              {focusedAsset && (
                <button
                  type="button"
                  onClick={() => onInspectAsset(focusedAsset)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              )}
            </div>
          </div>

          {focusedAsset && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8">
                <DualAxisLoadTempChart
                  history={focusedAsset.history}
                  loadWarnPct={focusedAsset.thresholds.loadWarnPct}
                  tempWarnC={focusedAsset.thresholds.tempWarnC}
                />
              </div>

              <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">
                    3-Phase &amp; Neutral Currents
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    PF {focusedAsset.energized ? focusedAsset.telemetry.pf.toFixed(3) : '0.000'}
                  </span>
                </div>

                <PhaseCurrentComparison asset={focusedAsset} />

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500">Hotspot Temp</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {focusedAsset.thermal.hotspotTempC.toFixed(1)} °C
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Phase Unbalance</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {focusedMetrics?.unbalancePct.toFixed(1) ?? '0.0'} %
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">L-L Avg Voltage</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {focusedMetrics?.avgVoltageLL.toFixed(1) ?? '0.0'} V
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Health Index</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {focusedMetrics?.subScores.healthIndex ?? 0} / 100
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Active Threshold Alerts Feed */}
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Active Threshold Alarms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live overload, thermal &amp; imbalance events
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateAlerts}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>All Alarms</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-200 flex-1 overflow-y-auto max-h-[340px]">
            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All monitored LT assets operating within configured thresholds.
              </div>
            ) : (
              activeAlerts.slice(0, 6).map((alert) => {
                const targetAsset = assets.find((a) => a.id === alert.assetId);
                return (
                  <div
                    key={alert.id}
                    className="px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (targetAsset) {
                            setFocusedAssetId(targetAsset.id);
                            onInspectAsset(targetAsset);
                          }
                        }}
                        className="text-left min-w-0 group"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              alert.severity === 'Critical'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {alert.severity === 'Critical' ? '✖' : '▲'}{' '}
                            {alert.severity}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-semibold text-slate-900 group-hover:text-blue-700">
                            {alert.assetCode}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-slate-400">
                            {alert.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                          Measured {alert.measuredValue} (Limit {alert.thresholdLimit})
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        title="Acknowledge alarm"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors shrink-0"
                        aria-label={`Acknowledge alarm for ${alert.assetCode}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Live LT Asset Telemetry Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              LT Asset Live Load &amp; Health Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any asset row to open deep-dive diagnostics, 6-axis health profile, and load simulation controls
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {['All', ...LT_ZONES].map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setZoneFilter(zone)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  zoneFilter === zone
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {zone === 'All' ? 'All Zones' : zone.replace(' District', '').replace(' Zone', '').replace(' Feeder', '').replace(' Substation', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-6 whitespace-nowrap">Asset &amp; Feeder</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Rated</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Load (kVA / %)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">R / Y / B (A)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Neutral (A)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">L-L Volts</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">PF</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Temp (°C)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Health</th>
                <th className="py-3 px-6 text-right whitespace-nowrap">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredAssets.map((asset) => {
                const m = computedMap.get(asset.id)!;
                const badge = getHealthStateBadge(m.healthState);
                const isFocused = asset.id === focusedAsset?.id;

                return (
                  <tr
                    key={asset.id}
                    onClick={() => {
                      setFocusedAssetId(asset.id);
                      onInspectAsset(asset);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isFocused ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {asset.code}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-800 truncate max-w-[210px]">
                          {asset.name}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5 whitespace-nowrap">
                        {asset.category} · {asset.zone}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {asset.ratedKva} kVA
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {m.apparentKva.toFixed(1)} kVA
                      </div>
                      <div
                        className={
                          m.loadPct >= asset.thresholds.loadCritPct
                            ? 'text-rose-700 font-semibold'
                            : m.loadPct >= asset.thresholds.loadWarnPct
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-500'
                        }
                      >
                        {m.loadPct.toFixed(1)}%
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {asset.energized
                        ? `${Math.round(asset.telemetry.iR)} / ${Math.round(
                            asset.telemetry.iY
                          )} / ${Math.round(asset.telemetry.iB)}`
                        : '0 / 0 / 0'}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                        asset.telemetry.iN > asset.ratedCurrentA * 0.2
                          ? 'text-amber-700 font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {asset.telemetry.iN.toFixed(1)} A
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {m.avgVoltageLL.toFixed(1)} V
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                        asset.energized && asset.telemetry.pf < asset.thresholds.pfMinWarn
                          ? 'text-amber-700 font-semibold'
                          : 'text-slate-700'
                      }`}
                    >
                      {asset.energized ? asset.telemetry.pf.toFixed(3) : '—'}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                        asset.thermal.primaryTempC >= asset.thresholds.tempCritC
                          ? 'text-rose-700 font-semibold'
                          : asset.thermal.primaryTempC >= asset.thresholds.tempWarnC
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-700'
                      }`}
                    >
                      {asset.thermal.primaryTempC.toFixed(1)} °C
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {asset.energized ? `${m.subScores.healthIndex}%` : '—'}
                    </td>

                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <span className={`font-semibold ${badge.textClass}`}>
                        {badge.glyph} {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
