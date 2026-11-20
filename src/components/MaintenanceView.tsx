import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import { LTAsset, MaintenanceRecord } from '../types/ltAssets';

interface MaintenanceViewProps {
  assets: LTAsset[];
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
}

const TASK_TYPES: MaintenanceRecord['taskType'][] = [
  'IR & Continuity Test',
  'Oil BDV & DGA Sampling',
  'IR Thermography Scan',
  'Neutral Earthing Check',
  'Busbar Torque & Cleaning',
];

export function MaintenanceView({
  assets,
  records,
  onAddRecord,
}: MaintenanceViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '');
  const [engineer, setEngineer] = useState('Mayur Bonde');
  const [taskType, setTaskType] =
    useState<MaintenanceRecord['taskType']>('IR & Continuity Test');
  const [irValueMOhm, setIrValueMOhm] = useState('480');
  const [earthResistanceOhm, setEarthResistanceOhm] = useState('0.65');
  const [outcome, setOutcome] =
    useState<MaintenanceRecord['outcome']>('Passed');
  const [findings, setFindings] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    onAddRecord({
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      zone: asset.zone,
      date: new Date().toISOString().slice(0, 10),
      engineer: engineer.trim() || 'Field Engineer',
      taskType,
      findings:
        findings.trim() ||
        'Routine inspection completed within utility dielectric and thermal tolerances.',
      irValueMOhm: Math.max(10, Number(irValueMOhm) || 400),
      earthResistanceOhm: Math.max(0.1, Number(earthResistanceOhm) || 0.7),
      outcome,
    });

    setFindings('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Preventive Maintenance &amp; Dielectric Inspection Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Insulation resistance (MΩ), neutral earthing impedance (Ω), oil BDV sampling, and IR thermography logs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Close Form' : 'Log Field Inspection'}</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Record Field Inspection &amp; Update Asset Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                LT Asset
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Inspection Type
              </label>
              <select
                value={taskType}
                onChange={(e) =>
                  setTaskType(e.target.value as MaintenanceRecord['taskType'])
                }
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Inspecting Engineer
              </label>
              <input
                type="text"
                value={engineer}
                onChange={(e) => setEngineer(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Measured IR (MΩ)
              </label>
              <input
                type="number"
                value={irValueMOhm}
                onChange={(e) => setIrValueMOhm(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                min={10}
                max={2000}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Neutral Earth (Ω)
              </label>
              <input
                type="number"
                step="0.01"
                value={earthResistanceOhm}
                onChange={(e) => setEarthResistanceOhm(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                min={0.05}
                max={10}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) =>
                  setOutcome(e.target.value as MaintenanceRecord['outcome'])
                }
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
              >
                <option value="Passed">Passed</option>
                <option value="Action Required">Action Required</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Technical Findings &amp; Remarks
            </label>
            <textarea
              rows={2}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Document thermography temperatures, torque checks, or oil dielectric notes…"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              Save Inspection
            </button>
          </div>
        </form>
      )}

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-6 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Asset &amp; Zone</th>
                <th className="py-3 px-4 whitespace-nowrap">Inspection Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Engineer</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">IR (MΩ)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Earth (Ω)</th>
                <th className="py-3 px-4 whitespace-nowrap">Findings</th>
                <th className="py-3 px-6 text-right whitespace-nowrap">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-6 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {rec.date}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-slate-900">
                      {rec.assetCode}
                    </div>
                    <div className="text-slate-500">{rec.zone}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                    {rec.taskType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {rec.engineer}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {rec.irValueMOhm} MΩ
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {rec.earthResistanceOhm.toFixed(2)} Ω
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                    {rec.findings}
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        rec.outcome === 'Passed'
                          ? 'text-emerald-700'
                          : rec.outcome === 'Action Required'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {rec.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
