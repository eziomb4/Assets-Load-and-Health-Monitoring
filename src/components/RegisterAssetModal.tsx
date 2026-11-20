import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import {
  CoolingMode,
  LTAsset,
  LTAssetCategory,
  LT_CATEGORIES,
  LT_ZONES,
} from '../types/ltAssets';

interface RegisterAssetModalProps {
  onClose: () => void;
  onSave: (asset: LTAsset) => void;
}

export function RegisterAssetModal({
  onClose,
  onSave,
}: RegisterAssetModalProps) {
  const [code, setCode] = useState('DT-400-05');
  const [name, setName] = useState('West Commercial 400 kVA Transformer');
  const [category, setCategory] =
    useState<LTAssetCategory>('Distribution Transformer');
  const [zone, setZone] = useState<string>(LT_ZONES[0]);
  const [feederRef, setFeederRef] = useState('FDR-11K-W03');
  const [ratedKva, setRatedKva] = useState('400');
  const [nominalVoltageV, setNominalVoltageV] = useState('415');
  const [manufacturer, setManufacturer] = useState('ABB / Hitachi Energy');
  const [coolingMode, setCoolingMode] = useState<CoolingMode>('ONAN');

  const kvaNum = Math.max(25, Number(ratedKva) || 250);
  const vNum = Math.max(230, Number(nominalVoltageV) || 415);
  const ratedCurrentA = Math.round((kvaNum * 1000) / (Math.sqrt(3) * vNum));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nowLabel = new Date().toTimeString().slice(0, 8);
    const nominalLN = Number((vNum / Math.sqrt(3)).toFixed(1));
    const initialPhaseI = Number((ratedCurrentA * 0.56).toFixed(1));

    const newAsset: LTAsset = {
      id: `asset-${Date.now()}`,
      code: code.trim() || `LT-${Date.now().toString().slice(-4)}`,
      name: name.trim() || 'LT Distribution Asset',
      category,
      zone,
      feederRef: feederRef.trim() || 'FDR-LT-NEW',
      ratedKva: kvaNum,
      ratedCurrentA,
      nominalVoltageV: vNum,
      energized: true,
      installYear: 2026,
      manufacturer: manufacturer.trim() || 'OEM Standard',
      insulationIR_MOhm: 500,
      oilBdvKv: category === 'Distribution Transformer' ? 62 : null,
      neutralEarthOhm: 0.58,
      lastMaintenanceDate: new Date().toISOString().slice(0, 10),
      nextMaintenanceDue: '2027-05-20',
      breakerOpsCount: 1,
      telemetry: {
        vR: nominalLN,
        vY: nominalLN,
        vB: nominalLN,
        iR: initialPhaseI,
        iY: initialPhaseI,
        iB: initialPhaseI,
        iN: 11.2,
        pf: 0.96,
        thdV: 1.9,
        thdI: 3.5,
        freqHz: 50.0,
      },
      thermal: {
        primaryTempC: 46.5,
        hotspotTempC: 54.0,
        ambientTempC: 31.0,
        coolingMode,
      },
      thresholds: {
        loadWarnPct: 80,
        loadCritPct: 95,
        tempWarnC: category === 'Distribution Transformer' ? 72 : 65,
        tempCritC: category === 'Distribution Transformer' ? 85 : 78,
        unbalanceWarnPct: 15,
        pfMinWarn: 0.9,
      },
      simulation: {
        loadBias: 0.92,
        phaseSkewR: 1.0,
        phaseSkewY: 0.99,
        phaseSkewB: 1.01,
        coolingFault: false,
      },
      history: [
        {
          timestamp: nowLabel,
          loadKva: Number((kvaNum * 0.56).toFixed(1)),
          loadPct: 56.0,
          tempC: 46.5,
          unbalancePct: 1.2,
          pf: 0.96,
        },
      ],
    };

    onSave(newAsset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Register LT Distribution Asset
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect a new transformer, feeder pillar, switchboard, or APFC bank to live telemetry
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="block">
              <span className="font-medium text-slate-700">Asset Code</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Feeder Reference</span>
              <input
                type="text"
                value={feederRef}
                onChange={(e) => setFeederRef(e.target.value)}
                className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="font-medium text-slate-700">Asset Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LTAssetCategory)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                {LT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Substation / Zone</span>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                {LT_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Rated Capacity (kVA)</span>
              <input
                type="number"
                value={ratedKva}
                onChange={(e) => setRatedKva(e.target.value)}
                min={25}
                max={2500}
                className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">
                Nominal L-L Voltage (V)
              </span>
              <input
                type="number"
                value={nominalVoltageV}
                onChange={(e) => setNominalVoltageV(e.target.value)}
                min={220}
                max={440}
                className="mt-1 w-full font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Cooling Mode</span>
              <select
                value={coolingMode}
                onChange={(e) => setCoolingMode(e.target.value as CoolingMode)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                <option value="ONAN">ONAN</option>
                <option value="Forced Air">Forced Air</option>
                <option value="Natural Convection">Natural Convection</option>
              </select>
            </label>

            <label className="block">
              <span className="font-medium text-slate-700">Manufacturer</span>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center justify-between">
            <span>Computed Rated Phase Current:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {ratedCurrentA} A
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              Commission Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
