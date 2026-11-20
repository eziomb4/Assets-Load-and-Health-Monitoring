import { useState } from 'react';
import { Plus, Power, Search, SlidersHorizontal } from 'lucide-react';
import {
  AssetHealthState,
  LTAsset,
  LTAssetCategory,
  LT_CATEGORIES,
  LT_ZONES,
} from '../types/ltAssets';
import {
  computeAssetMetrics,
  getHealthStateBadge,
} from '../utils/telemetryEngine';

interface AssetRegistryViewProps {
  assets: LTAsset[];
  onInspectAsset: (asset: LTAsset) => void;
  onToggleEnergized: (assetId: string) => void;
  onOpenRegisterModal: () => void;
}

export function AssetRegistryView({
  assets,
  onInspectAsset,
  onToggleEnergized,
  onOpenRegisterModal,
}: AssetRegistryViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LTAssetCategory | 'All'>('All');
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [stateFilter, setStateFilter] = useState<AssetHealthState | 'All'>('All');

  const filtered = assets.filter((asset) => {
    const m = computeAssetMetrics(asset);
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      asset.code.toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      asset.feederRef.toLowerCase().includes(q) ||
      asset.manufacturer.toLowerCase().includes(q);
    const matchesCat =
      categoryFilter === 'All' || asset.category === categoryFilter;
    const matchesZone = zoneFilter === 'All' || asset.zone === zoneFilter;
    const matchesState =
      stateFilter === 'All' || m.healthState === stateFilter;

    return matchesSearch && matchesCat && matchesZone && matchesState;
  });

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, feeder, or OEM…"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <select
              aria-label="Filter by asset category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as LTAssetCategory | 'All')
              }
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Asset Types</option>
              {LT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by zone"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Zones</option>
              {LT_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by health state"
              value={stateFilter}
              onChange={(e) =>
                setStateFilter(e.target.value as AssetHealthState | 'All')
              }
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All States</option>
              <option value="Nominal">Nominal</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register LT Asset</span>
          </button>
        </div>
      </section>

      {/* Asset Specification & Health Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              LT Distribution Asset Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nameplate ratings, dielectric metrics, cooling configuration, and breaker isolation state
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {filtered.length} of {assets.length} assets
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-900">
              No LT assets match the active filters
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search criteria or register a new LT distribution asset.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('All');
                setZoneFilter('All');
                setStateFilter('All');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6 whitespace-nowrap">Asset &amp; OEM</th>
                  <th className="py-3 px-4 whitespace-nowrap">Feeder &amp; Zone</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Nameplate</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">IR (MΩ)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Oil BDV</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Earth (Ω)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Health</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">State</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filtered.map((asset) => {
                  const m = computeAssetMetrics(asset);
                  const badge = getHealthStateBadge(m.healthState);
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onInspectAsset(asset)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-mono font-semibold text-slate-900">
                          {asset.code}{' '}
                          <span className="font-sans font-medium text-slate-700">
                            · {asset.name}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {asset.category} · {asset.manufacturer} ({asset.installYear})
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800">{asset.feederRef}</div>
                        <div className="text-slate-500 mt-0.5">{asset.zone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="text-slate-900 font-medium">
                          {asset.ratedKva} kVA / {asset.ratedCurrentA} A
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {asset.nominalVoltageV} V · {asset.thermal.coolingMode}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {asset.insulationIR_MOhm} MΩ
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {asset.oilBdvKv !== null ? `${asset.oilBdvKv} kV` : 'Dry Type'}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                          asset.neutralEarthOhm > 1.0
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-700'
                        }`}
                      >
                        {asset.neutralEarthOhm.toFixed(2)} Ω
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {asset.energized ? `${m.subScores.healthIndex}%` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-semibold ${badge.textClass}`}>
                          {badge.glyph} {badge.label}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onToggleEnergized(asset.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                              asset.energized
                                ? 'text-slate-700 bg-white border-slate-200 hover:bg-slate-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{asset.energized ? 'Isolate' : 'Energize'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onInspectAsset(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Tune</span>
                          </button>
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
