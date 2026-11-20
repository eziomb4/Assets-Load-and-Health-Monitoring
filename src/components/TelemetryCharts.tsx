import { useState } from 'react';
import { HealthSubScores, LTAsset, TelemetrySample } from '../types/ltAssets';

interface DualAxisLoadTempChartProps {
  history: TelemetrySample[];
  loadWarnPct: number;
  tempWarnC: number;
  height?: number;
}

export function DualAxisLoadTempChart({
  history,
  loadWarnPct,
  tempWarnC,
  height = 230,
}: DualAxisLoadTempChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (history.length < 2) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
        Awaiting telemetry samples…
      </div>
    );
  }

  const width = 680;
  const padL = 46;
  const padR = 46;
  const padT = 18;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxLoad = Math.max(120, Math.ceil(Math.max(...history.map((d) => d.loadPct)) / 10) * 10);
  const maxTemp = Math.max(100, Math.ceil(Math.max(...history.map((d) => d.tempC)) / 10) * 10);
  const minTemp = 20;

  const xAt = (idx: number) =>
    padL + (idx / Math.max(1, history.length - 1)) * innerW;
  const yLoad = (val: number) =>
    padT + innerH - (Math.min(maxLoad, Math.max(0, val)) / maxLoad) * innerH;
  const yTemp = (val: number) =>
    padT +
    innerH -
    ((Math.min(maxTemp, Math.max(minTemp, val)) - minTemp) / (maxTemp - minTemp)) *
      innerH;

  const loadPoints = history
    .map((d, i) => `${xAt(i).toFixed(1)},${yLoad(d.loadPct).toFixed(1)}`)
    .join(' ');
  const tempPoints = history
    .map((d, i) => `${xAt(i).toFixed(1)},${yTemp(d.tempC).toFixed(1)}`)
    .join(' ');

  const areaPoints = `${padL},${padT + innerH} ${loadPoints} ${xAt(history.length - 1).toFixed(1)},${padT + innerH}`;

  const activeSample = hoverIdx !== null ? history[hoverIdx] : history[history.length - 1];
  const activeIdx = hoverIdx !== null ? hoverIdx : history.length - 1;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="w-3 h-0.5 bg-blue-700 inline-block" />
            Loading (%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="w-3 h-0.5 bg-amber-600 inline-block border-t border-dashed border-amber-600" />
            Primary Temp (°C)
          </span>
        </div>
        {activeSample && (
          <div className="font-mono tabular-nums text-slate-600">
            <span>{activeSample.timestamp}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-blue-700 font-semibold">
              {activeSample.loadPct.toFixed(1)}% ({activeSample.loadKva.toFixed(1)} kVA)
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-amber-700 font-semibold">
              {activeSample.tempC.toFixed(1)} °C
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-crosshair select-none overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          const loadTick = Math.round(maxLoad * t);
          const tempTick = Math.round(minTemp + (maxTemp - minTemp) * t);
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {loadTick}%
              </text>
              <text
                x={width - padR + 8}
                y={y + 3}
                textAnchor="start"
                className="fill-amber-600/80 text-[10px] font-mono"
              >
                {tempTick}°
              </text>
            </g>
          );
        })}

        {/* Load warning threshold line */}
        <line
          x1={padL}
          y1={yLoad(loadWarnPct)}
          x2={width - padR}
          y2={yLoad(loadWarnPct)}
          stroke="#dc2626"
          strokeOpacity="0.35"
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        {/* Temp warning reference line */}
        <line
          x1={padL}
          y1={yTemp(tempWarnC)}
          x2={width - padR}
          y2={yTemp(tempWarnC)}
          stroke="#d97706"
          strokeOpacity="0.35"
          strokeDasharray="2 3"
          strokeWidth="1"
        />

        {/* Subtle area fill under Load curve */}
        <polygon points={areaPoints} fill="#1d4ed8" fillOpacity="0.06" />

        {/* Load Curve */}
        <polyline
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="2"
          strokeLinejoin="round"
          points={loadPoints}
        />

        {/* Temp Curve */}
        <polyline
          fill="none"
          stroke="#d97706"
          strokeWidth="1.75"
          strokeDasharray="5 3"
          strokeLinejoin="round"
          points={tempPoints}
        />

        {/* Crosshair indicator */}
        <line
          x1={xAt(activeIdx)}
          y1={padT}
          x2={xAt(activeIdx)}
          y2={padT + innerH}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <circle
          cx={xAt(activeIdx)}
          cy={yLoad(activeSample.loadPct)}
          r="3.5"
          fill="#1d4ed8"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <circle
          cx={xAt(activeIdx)}
          cy={yTemp(activeSample.tempC)}
          r="3.5"
          fill="#d97706"
          stroke="#ffffff"
          strokeWidth="1.5"
        />

        {/* X axis labels (first, middle, last) */}
        {[0, Math.floor((history.length - 1) / 2), history.length - 1].map((idx) => (
          <text
            key={idx}
            x={xAt(idx)}
            y={height - 6}
            textAnchor={idx === 0 ? 'start' : idx === history.length - 1 ? 'end' : 'middle'}
            className="fill-slate-400 text-[10px] font-mono"
          >
            {history[idx]?.timestamp}
          </text>
        ))}

        {/* Interactive hover hit zones */}
        {history.map((_, i) => {
          const segW = innerW / Math.max(1, history.length - 1);
          return (
            <rect
              key={i}
              x={xAt(i) - segW / 2}
              y={padT}
              width={segW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface HealthSpiderChartProps {
  scores: HealthSubScores;
}

export function HealthSpiderChart({ scores }: HealthSpiderChartProps) {
  const axes: { label: string; value: number }[] = [
    { label: 'THERMAL', value: scores.thermalScore },
    { label: 'LOAD', value: scores.loadScore },
    { label: 'BALANCE', value: scores.balanceScore },
    { label: 'PQ / PF', value: scores.powerQualityScore },
    { label: 'VOLTAGE', value: scores.voltageScore },
    { label: 'INSUL.', value: scores.insulationScore },
  ];

  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 76;

  const pointAt = (index: number, pct: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    const r = (pct / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const dataPolygon = axes
    .map((ax, i) => {
      const p = pointAt(i, ax.value);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[235px] mx-auto">
      {[25, 50, 75, 100].map((ring) => {
        const pts = axes
          .map((_, i) => {
            const p = pointAt(i, ring);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={ring}
            points={pts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}

      {axes.map((ax, i) => {
        const edge = pointAt(i, 100);
        const labelPos = pointAt(i, 124);
        return (
          <g key={ax.label}>
            <line
              x1={cx}
              y1={cy}
              x2={edge.x}
              y2={edge.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text
              x={labelPos.x}
              y={labelPos.y + 3}
              textAnchor="middle"
              className="fill-slate-600 text-[9px] font-mono font-medium"
            >
              {ax.label}
            </text>
          </g>
        );
      })}

      <polygon
        points={dataPolygon}
        fill="#1d4ed8"
        fillOpacity="0.16"
        stroke="#1d4ed8"
        strokeWidth="2"
      />

      {axes.map((ax, i) => {
        const p = pointAt(i, ax.value);
        return (
          <circle
            key={ax.label}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#1d4ed8"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}

interface PhaseCurrentComparisonProps {
  asset: LTAsset;
}

export function PhaseCurrentComparison({ asset }: PhaseCurrentComparisonProps) {
  const { iR, iY, iB, iN } = asset.telemetry;
  const maxScale = Math.max(asset.ratedCurrentA * 1.25, iR, iY, iB, 100);
  const ratedPct = (asset.ratedCurrentA / maxScale) * 100;

  const rows = [
    { label: 'Phase R', amps: iR, color: 'bg-rose-600', text: 'text-rose-700' },
    { label: 'Phase Y', amps: iY, color: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'Phase B', amps: iB, color: 'bg-blue-600', text: 'text-blue-700' },
    { label: 'Neutral N', amps: iN, color: 'bg-slate-600', text: 'text-slate-700' },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = Math.min(100, (row.amps / maxScale) * 100);
        const overRated = row.amps > asset.ratedCurrentA && row.label !== 'Neutral N';
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-medium ${row.text}`}>{row.label}</span>
              <span className="font-mono tabular-nums text-slate-800">
                <strong className={overRated ? 'text-rose-700' : 'text-slate-900'}>
                  {row.amps.toFixed(1)} A
                </strong>{' '}
                <span className="text-slate-400">
                  / {row.label === 'Neutral N' ? 'I_N' : `${asset.ratedCurrentA} A`}
                </span>
              </span>
            </div>
            <div className="relative h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
              <div
                className={`h-full ${row.color} transition-all duration-300`}
                style={{ width: `${pct}%` }}
              />
              {row.label !== 'Neutral N' && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-slate-900/50"
                  style={{ left: `${ratedPct}%` }}
                  title={`Rated Current: ${asset.ratedCurrentA} A`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
