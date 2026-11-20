import { LTAsset, LT_ZONES } from '../types/ltAssets';
import { computeAssetMetrics } from '../utils/telemetryEngine';

interface PhaseAnalyticsViewProps {
  assets: LTAsset[];
  onInspectAsset: (asset: LTAsset) => void;
}

export function PhaseAnalyticsView({
  assets,
  onInspectAsset,
}: PhaseAnalyticsViewProps) {
  const energized = assets.filter((a) => a.energized);

  const zoneStats = LT_ZONES.map((zone) => {
    const items = assets.filter((a) => a.zone === zone);
    const active = items.filter((a) => a.energized);
    const ratedKva = active.reduce((s, a) => s + a.ratedKva, 0);
    const liveKva = active.reduce(
      (s, a) => s + computeAssetMetrics(a).apparentKva,
      0
    );
    const avgPf =
      active.length > 0
        ? active.reduce((s, a) => s + a.telemetry.pf, 0) / active.length
        : 0;
    const maxTemp =
      active.length > 0
        ? Math.max(...active.map((a) => a.thermal.primaryTempC))
        : 0;
    const utilization = ratedKva > 0 ? (liveKva / ratedKva) * 100 : 0;
    return {
      zone,
      count: items.length,
      activeCount: active.length,
      ratedKva,
      liveKva,
      reserveKva: Math.max(0, ratedKva - liveKva),
      utilization,
      avgPf,
      maxTemp,
    };
  });

  return (
    <div className="space-y-6">
      {/* Substation Zone Capacity & Headroom */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Zone Capacity &amp; Thermal Headroom
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated LT distribution loading, spinning reserve capacity, and average zone power factor
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {zoneStats.map((z) => (
            <div key={z.zone} className="p-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {z.zone}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {z.activeCount} / {z.count} assets energized
                </p>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {z.utilization.toFixed(1)}%
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {z.liveKva.toFixed(0)} / {z.ratedKva} kVA
                </span>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    z.utilization >= 90
                      ? 'bg-rose-600'
                      : z.utilization >= 75
                        ? 'bg-amber-500'
                        : 'bg-blue-700'
                  }`}
                  style={{ width: `${Math.min(100, z.utilization)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Reserve</span>
                  <div className="font-mono tabular-nums font-medium text-slate-800">
                    {z.reserveKva.toFixed(0)} kVA
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Avg PF / Peak °C</span>
                  <div className="font-mono tabular-nums font-medium text-slate-800">
                    {z.avgPf.toFixed(2)} · {z.maxTemp.toFixed(0)}°C
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-Phase Load Imbalance & Harmonic Compliance */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              3-Phase Current Asymmetry &amp; Neutral Loading
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phase spread across R, Y, B conductors and resulting neutral return current (I_N)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Asset</th>
                  <th className="py-3 px-4 text-right">I_R (A)</th>
                  <th className="py-3 px-4 text-right">I_Y (A)</th>
                  <th className="py-3 px-4 text-right">I_B (A)</th>
                  <th className="py-3 px-4 text-right">I_N (A)</th>
                  <th className="py-3 px-6 text-right">Unbalance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {energized.map((asset) => {
                  const m = computeAssetMetrics(asset);
                  const highUnbalance =
                    m.unbalancePct >= asset.thresholds.unbalanceWarnPct;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onInspectAsset(asset)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="font-mono font-semibold text-slate-900">
                          {asset.code}
                        </div>
                        <div className="text-slate-500 truncate max-w-[180px]">
                          {asset.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">
                        {asset.telemetry.iR.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                        {asset.telemetry.iY.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                        {asset.telemetry.iB.toFixed(1)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          asset.telemetry.iN > asset.ratedCurrentA * 0.2
                            ? 'text-amber-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {asset.telemetry.iN.toFixed(1)}
                      </td>
                      <td
                        className={`py-3 px-6 text-right font-mono tabular-nums font-semibold ${
                          highUnbalance ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {m.unbalancePct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Power Quality &amp; Harmonic Distortion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              IEEE 519 harmonic limits (THD_V &lt; 5%, THD_I &lt; 8%) &amp; PF compliance
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Asset</th>
                  <th className="py-3 px-4 text-right">PF</th>
                  <th className="py-3 px-4 text-right">THD_V</th>
                  <th className="py-3 px-4 text-right">THD_I</th>
                  <th className="py-3 px-6 text-right">Freq</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {energized.map((asset) => {
                  const lowPf = asset.telemetry.pf < asset.thresholds.pfMinWarn;
                  const highThdI = asset.telemetry.thdI >= 8.0;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onInspectAsset(asset)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="font-mono font-semibold text-slate-900">
                          {asset.code}
                        </div>
                        <div className="text-slate-500">{asset.category}</div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          lowPf ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {asset.telemetry.pf.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {asset.telemetry.thdV.toFixed(1)}%
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          highThdI ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {asset.telemetry.thdI.toFixed(1)}%
                      </td>
                      <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-600">
                        {asset.telemetry.freqHz.toFixed(2)} Hz
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
