import ExcelJS from 'exceljs';
import {
  AssetAlert,
  AssetHealthState,
  HealthSubScores,
  LTAsset,
  TelemetrySample,
} from '../types/ltAssets';

export interface ComputedAssetMetrics {
  apparentKva: number;
  activeKw: number;
  reactiveKvar: number;
  loadPct: number;
  avgVoltageLN: number;
  avgVoltageLL: number;
  avgCurrentA: number;
  unbalancePct: number;
  healthState: AssetHealthState;
  subScores: HealthSubScores;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computePhaseUnbalancePct(iR: number, iY: number, iB: number): number {
  const avg = (iR + iY + iB) / 3;
  if (avg <= 0.5) return 0;
  const maxDev = Math.max(Math.abs(iR - avg), Math.abs(iY - avg), Math.abs(iB - avg));
  return Number(((maxDev / avg) * 100).toFixed(1));
}

export function computeHealthSubScores(
  asset: LTAsset,
  loadPct: number,
  unbalancePct: number,
  avgVoltageLN: number
): HealthSubScores {
  if (!asset.energized) {
    return {
      healthIndex: 0,
      thermalScore: 100,
      loadScore: 100,
      balanceScore: 100,
      powerQualityScore: 100,
      voltageScore: 100,
      insulationScore: clamp(Math.round((asset.insulationIR_MOhm / 500) * 100), 40, 100),
    };
  }

  const { thermal, telemetry, thresholds } = asset;

  // 1. Thermal Score (based on hotspot & primary temp relative to warn/crit)
  const tempRatio =
    (thermal.primaryTempC - thermal.ambientTempC) /
    Math.max(15, thresholds.tempCritC - thermal.ambientTempC);
  const thermalScore = clamp(Math.round(105 - tempRatio * 65), 12, 100);

  // 2. Load Headroom Score
  const loadScore =
    loadPct <= 70
      ? clamp(Math.round(100 - loadPct * 0.12), 85, 100)
      : loadPct <= thresholds.loadWarnPct
        ? clamp(Math.round(92 - (loadPct - 70) * 1.1), 65, 92)
        : clamp(Math.round(68 - (loadPct - thresholds.loadWarnPct) * 2.1), 10, 68);

  // 3. Phase Balance Score
  const balanceScore = clamp(Math.round(100 - unbalancePct * 2.6), 18, 100);

  // 4. Power Quality Score (PF & THD_I)
  const pfPenalty = telemetry.pf < 0.96 ? (0.96 - telemetry.pf) * 240 : 0;
  const thdPenalty = telemetry.thdI > 5 ? (telemetry.thdI - 5) * 3.5 : 0;
  const powerQualityScore = clamp(Math.round(100 - pfPenalty - thdPenalty), 20, 100);

  // 5. Voltage Stability Score (nominal L-N 239.6V for 415V L-L)
  const nominalLN = asset.nominalVoltageV / Math.sqrt(3);
  const vDevPct = (Math.abs(avgVoltageLN - nominalLN) / nominalLN) * 100;
  const voltageScore = clamp(Math.round(100 - vDevPct * 7.5), 25, 100);

  // 6. Insulation & Dielectric Score
  const irComponent = clamp((asset.insulationIR_MOhm / 450) * 75, 25, 75);
  const earthComponent = clamp(25 - Math.max(0, asset.neutralEarthOhm - 0.8) * 10, 5, 25);
  const oilBonus =
    asset.oilBdvKv !== null ? clamp((asset.oilBdvKv - 35) * 0.5, -15, 5) : 0;
  const insulationScore = clamp(Math.round(irComponent + earthComponent + oilBonus), 20, 100);

  const weighted =
    thermalScore * 0.25 +
    loadScore * 0.24 +
    balanceScore * 0.16 +
    powerQualityScore * 0.14 +
    voltageScore * 0.1 +
    insulationScore * 0.11;

  return {
    healthIndex: clamp(Math.round(weighted), 10, 100),
    thermalScore,
    loadScore,
    balanceScore,
    powerQualityScore,
    voltageScore,
    insulationScore,
  };
}

export function computeAssetMetrics(asset: LTAsset): ComputedAssetMetrics {
  if (!asset.energized) {
    const subScores = computeHealthSubScores(asset, 0, 0, 0);
    return {
      apparentKva: 0,
      activeKw: 0,
      reactiveKvar: 0,
      loadPct: 0,
      avgVoltageLN: 0,
      avgVoltageLL: 0,
      avgCurrentA: 0,
      unbalancePct: 0,
      healthState: 'Offline',
      subScores,
    };
  }

  const { vR, vY, vB, iR, iY, iB, pf } = asset.telemetry;
  const apparentKva = Number(((vR * iR + vY * iY + vB * iB) / 1000).toFixed(1));
  const activeKw = Number((apparentKva * pf).toFixed(1));
  const reactiveKvar = Number(
    Math.sqrt(Math.max(0, apparentKva * apparentKva - activeKw * activeKw)).toFixed(1)
  );
  const loadPct = Number(((apparentKva / asset.ratedKva) * 100).toFixed(1));
  const avgVoltageLN = Number(((vR + vY + vB) / 3).toFixed(1));
  const avgVoltageLL = Number((avgVoltageLN * Math.sqrt(3)).toFixed(1));
  const avgCurrentA = Number(((iR + iY + iB) / 3).toFixed(1));
  const unbalancePct = computePhaseUnbalancePct(iR, iY, iB);

  const { thresholds, thermal } = asset;

  let healthState: AssetHealthState = 'Nominal';
  if (
    loadPct >= thresholds.loadCritPct ||
    thermal.primaryTempC >= thresholds.tempCritC ||
    thermal.hotspotTempC >= thresholds.tempCritC + 14 ||
    unbalancePct >= thresholds.unbalanceWarnPct + 8
  ) {
    healthState = 'Critical';
  } else if (
    loadPct >= thresholds.loadWarnPct ||
    thermal.primaryTempC >= thresholds.tempWarnC ||
    unbalancePct >= thresholds.unbalanceWarnPct ||
    pf < thresholds.pfMinWarn
  ) {
    healthState = 'Warning';
  }

  const subScores = computeHealthSubScores(asset, loadPct, unbalancePct, avgVoltageLN);

  return {
    apparentKva,
    activeKw,
    reactiveKvar,
    loadPct,
    avgVoltageLN,
    avgVoltageLL,
    avgCurrentA,
    unbalancePct,
    healthState,
    subScores,
  };
}

export function stepAssetTelemetry(asset: LTAsset, timeLabel: string): LTAsset {
  if (!asset.energized) {
    const cooledPrimary = Number(
      Math.max(
        asset.thermal.ambientTempC + 1.5,
        asset.thermal.primaryTempC - 0.6
      ).toFixed(1)
    );
    const cooledHotspot = Number(
      Math.max(
        asset.thermal.ambientTempC + 2.0,
        asset.thermal.hotspotTempC - 0.8
      ).toFixed(1)
    );
    const sample: TelemetrySample = {
      timestamp: timeLabel,
      loadKva: 0,
      loadPct: 0,
      tempC: cooledPrimary,
      unbalancePct: 0,
      pf: 0,
    };
    return {
      ...asset,
      telemetry: {
        ...asset.telemetry,
        vR: 0,
        vY: 0,
        vB: 0,
        iR: 0,
        iY: 0,
        iB: 0,
        iN: 0,
        thdV: 0,
        thdI: 0,
        freqHz: 0,
      },
      thermal: {
        ...asset.thermal,
        primaryTempC: cooledPrimary,
        hotspotTempC: cooledHotspot,
      },
      history: [...asset.history.slice(-23), sample],
    };
  }

  const { simulation, ratedCurrentA, nominalVoltageV, thermal } = asset;
  const nominalLN = nominalVoltageV / Math.sqrt(3);

  // Target current per phase governed by simulation loadBias + phaseSkew + realistic micro-jitter
  const jitter = () => (Math.random() - 0.5) * 0.032;
  const baseTargetCurrent = ratedCurrentA * 0.62 * simulation.loadBias;

  const targetIR = clamp(
    baseTargetCurrent * simulation.phaseSkewR * (1 + jitter()),
    8,
    ratedCurrentA * 1.45
  );
  const targetIY = clamp(
    baseTargetCurrent * simulation.phaseSkewY * (1 + jitter()),
    8,
    ratedCurrentA * 1.45
  );
  const targetIB = clamp(
    baseTargetCurrent * simulation.phaseSkewB * (1 + jitter()),
    8,
    ratedCurrentA * 1.45
  );

  // Smooth exponential filter for realistic CT current tracking
  const prev = asset.telemetry;
  const iR = Number((prev.iR * 0.45 + targetIR * 0.55).toFixed(1));
  const iY = Number((prev.iY * 0.45 + targetIY * 0.55).toFixed(1));
  const iB = Number((prev.iB * 0.45 + targetIB * 0.55).toFixed(1));

  // Vector sum of 120-degree displaced 3-phase currents: |Ia + Ib*e^-j120 + Ic*e^j120|
  const realN = iR - 0.5 * iY - 0.5 * iB;
  const imagN = (Math.sqrt(3) / 2) * (iY - iB);
  const fundamentalNeutral = Math.sqrt(realN * realN + imagN * imagN);
  const harmonicNeutral = ((iR + iY + iB) / 3) * (prev.thdI / 100) * 0.85;
  const iN = Number((fundamentalNeutral + harmonicNeutral).toFixed(1));

  // Slight voltage droop under heavy loading
  const loadRatio = ((iR + iY + iB) / 3) / ratedCurrentA;
  const droopV = loadRatio * 5.2;
  const vR = Number(
    clamp(nominalLN - droopV * (iR / Math.max(1, ratedCurrentA)) + (Math.random() - 0.5) * 1.8, nominalLN * 0.91, nominalLN * 1.07).toFixed(1)
  );
  const vY = Number(
    clamp(nominalLN - droopV * (iY / Math.max(1, ratedCurrentA)) + (Math.random() - 0.5) * 1.8, nominalLN * 0.91, nominalLN * 1.07).toFixed(1)
  );
  const vB = Number(
    clamp(nominalLN - droopV * (iB / Math.max(1, ratedCurrentA)) + (Math.random() - 0.5) * 1.8, nominalLN * 0.91, nominalLN * 1.07).toFixed(1)
  );

  // Power factor & THD drift slightly with load
  const basePf = asset.category === 'APFC Capacitor Bank' ? 0.98 : 0.94;
  const pfTarget =
    asset.category === 'APFC Capacitor Bank' && simulation.loadBias > 1.1
      ? 0.86
      : basePf - Math.max(0, loadRatio - 0.8) * 0.05;
  const pf = Number(
    clamp(prev.pf * 0.65 + pfTarget * 0.35 + (Math.random() - 0.5) * 0.008, 0.78, 0.999).toFixed(3)
  );
  const thdI = Number(
    clamp(prev.thdI + (Math.random() - 0.5) * 0.35 + Math.max(0, loadRatio - 0.85) * 0.8, 1.8, 16.5).toFixed(1)
  );
  const thdV = Number(clamp(1.6 + thdI * 0.22 + (Math.random() - 0.5) * 0.2, 1.1, 6.2).toFixed(1));
  const freqHz = Number(clamp(50.0 + (Math.random() - 0.5) * 0.09, 49.85, 50.15).toFixed(2));

  // First-order thermal model: ΔT proportional to I^2
  const coolingPenalty = simulation.coolingFault ? 1.48 : 1.0;
  const ratedRise = asset.category === 'Distribution Transformer' ? 44 : 26;
  const steadyPrimaryTemp =
    thermal.ambientTempC + Math.pow(loadRatio, 1.65) * ratedRise * coolingPenalty;
  const primaryTempC = Number(
    clamp(thermal.primaryTempC * 0.84 + steadyPrimaryTemp * 0.16, thermal.ambientTempC + 2, 118).toFixed(1)
  );
  const hotspotTempC = Number(
    clamp(primaryTempC + 8.5 + loadRatio * 9.5 * coolingPenalty, primaryTempC + 4, 134).toFixed(1)
  );

  const nextAsset: LTAsset = {
    ...asset,
    telemetry: {
      vR,
      vY,
      vB,
      iR,
      iY,
      iB,
      iN,
      pf,
      thdV,
      thdI,
      freqHz,
    },
    thermal: {
      ...thermal,
      primaryTempC,
      hotspotTempC,
    },
  };

  const computed = computeAssetMetrics(nextAsset);
  const sample: TelemetrySample = {
    timestamp: timeLabel,
    loadKva: computed.apparentKva,
    loadPct: computed.loadPct,
    tempC: primaryTempC,
    unbalancePct: computed.unbalancePct,
    pf,
  };

  return {
    ...nextAsset,
    history: [...asset.history.slice(-23), sample],
  };
}

export function evaluateAssetAlerts(
  assets: LTAsset[],
  existingAlerts: AssetAlert[],
  timeLabel: string
): AssetAlert[] {
  const newAlerts: AssetAlert[] = [];

  for (const asset of assets) {
    if (!asset.energized) continue;
    const metrics = computeAssetMetrics(asset);
    const { thresholds, thermal, telemetry } = asset;

    const checks: {
      triggered: boolean;
      severity: 'Critical' | 'Warning';
      category: AssetAlert['category'];
      message: string;
      measuredValue: string;
      thresholdLimit: string;
    }[] = [
      {
        triggered: metrics.loadPct >= thresholds.loadWarnPct,
        severity: metrics.loadPct >= thresholds.loadCritPct ? 'Critical' : 'Warning',
        category: 'Overload',
        message:
          metrics.loadPct >= thresholds.loadCritPct
            ? `Sustained loading exceeded critical rating (${metrics.apparentKva} kVA)`
            : `Loading approaching thermal limit (${metrics.apparentKva} kVA)`,
        measuredValue: `${metrics.loadPct.toFixed(1)}%`,
        thresholdLimit: `${
          metrics.loadPct >= thresholds.loadCritPct
            ? thresholds.loadCritPct
            : thresholds.loadWarnPct
        }%`,
      },
      {
        triggered: thermal.primaryTempC >= thresholds.tempWarnC,
        severity: thermal.primaryTempC >= thresholds.tempCritC ? 'Critical' : 'Warning',
        category: 'Thermal Drift',
        message:
          thermal.primaryTempC >= thresholds.tempCritC
            ? `${asset.category === 'Distribution Transformer' ? 'Top-oil' : 'Busbar'} temperature critical`
            : `Elevated ${asset.category === 'Distribution Transformer' ? 'top-oil' : 'enclosure'} thermal rise`,
        measuredValue: `${thermal.primaryTempC.toFixed(1)} °C`,
        thresholdLimit: `${
          thermal.primaryTempC >= thresholds.tempCritC
            ? thresholds.tempCritC
            : thresholds.tempWarnC
        } °C`,
      },
      {
        triggered: metrics.unbalancePct >= thresholds.unbalanceWarnPct,
        severity:
          metrics.unbalancePct >= thresholds.unbalanceWarnPct + 8 ? 'Critical' : 'Warning',
        category: 'Phase Imbalance',
        message: `3-phase current asymmetry driving high neutral current (${telemetry.iN.toFixed(0)} A)`,
        measuredValue: `${metrics.unbalancePct.toFixed(1)}%`,
        thresholdLimit: `${thresholds.unbalanceWarnPct}%`,
      },
      {
        triggered: telemetry.pf < thresholds.pfMinWarn,
        severity: telemetry.pf < thresholds.pfMinWarn - 0.05 ? 'Critical' : 'Warning',
        category: 'Power Factor',
        message: 'Lagging reactive demand below utility power factor floor',
        measuredValue: telemetry.pf.toFixed(3),
        thresholdLimit: thresholds.pfMinWarn.toFixed(2),
      },
    ];

    for (const check of checks) {
      if (!check.triggered) continue;
      const alreadyOpen = existingAlerts.some(
        (a) =>
          a.assetId === asset.id &&
          a.category === check.category &&
          a.status !== 'Resolved'
      );
      const alreadyQueued = newAlerts.some(
        (a) => a.assetId === asset.id && a.category === check.category
      );
      if (!alreadyOpen && !alreadyQueued) {
        newAlerts.push({
          id: `alt-${asset.id}-${check.category.replace(/\s+/g, '')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          assetId: asset.id,
          assetCode: asset.code,
          assetName: asset.name,
          zone: asset.zone,
          severity: check.severity,
          category: check.category,
          message: check.message,
          measuredValue: check.measuredValue,
          thresholdLimit: check.thresholdLimit,
          timestamp: timeLabel,
          status: 'Active',
        });
      }
    }
  }

  return newAlerts.length > 0 ? [...newAlerts, ...existingAlerts].slice(0, 60) : existingAlerts;
}

export function getHealthStateBadge(state: AssetHealthState): {
  glyph: string;
  textClass: string;
  label: string;
} {
  switch (state) {
    case 'Nominal':
      return { glyph: '●', textClass: 'text-emerald-700', label: 'Nominal' };
    case 'Warning':
      return { glyph: '▲', textClass: 'text-amber-700', label: 'Warning' };
    case 'Critical':
      return { glyph: '✖', textClass: 'text-rose-700', label: 'Critical' };
    case 'Offline':
      return { glyph: '○', textClass: 'text-slate-500', label: 'Offline' };
  }
}

export async function exportAssetTelemetryToExcel(
  assets: LTAsset[],
  alerts: AssetAlert[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LT GridWatch';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Live Asset Telemetry');
  summarySheet.columns = [
    { header: 'Asset Code', key: 'code', width: 15 },
    { header: 'Asset Name', key: 'name', width: 28 },
    { header: 'Category', key: 'category', width: 24 },
    { header: 'Zone / Substation', key: 'zone', width: 26 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Rated (kVA)', key: 'ratedKva', width: 13 },
    { header: 'Live Load (kVA)', key: 'loadKva', width: 16 },
    { header: 'Active Power (kW)', key: 'activeKw', width: 17 },
    { header: 'Loading (%)', key: 'loadPct', width: 13 },
    { header: 'Power Factor', key: 'pf', width: 13 },
    { header: 'Primary Temp (°C)', key: 'tempC', width: 17 },
    { header: 'Health Index (%)', key: 'healthIndex', width: 16 },
  ];

  assets.forEach((asset) => {
    const m = computeAssetMetrics(asset);
    summarySheet.addRow({
      code: asset.code,
      name: asset.name,
      category: asset.category,
      zone: asset.zone,
      status: m.healthState,
      ratedKva: asset.ratedKva,
      loadKva: m.apparentKva,
      activeKw: m.activeKw,
      loadPct: m.loadPct,
      pf: asset.energized ? asset.telemetry.pf : 0,
      tempC: asset.thermal.primaryTempC,
      healthIndex: m.subScores.healthIndex,
    });
  });

  const phaseSheet = workbook.addWorksheet('3-Phase & Insulation');
  phaseSheet.columns = [
    { header: 'Asset Code', key: 'code', width: 15 },
    { header: 'V_R (V)', key: 'vR', width: 11 },
    { header: 'V_Y (V)', key: 'vY', width: 11 },
    { header: 'V_B (V)', key: 'vB', width: 11 },
    { header: 'I_R (A)', key: 'iR', width: 11 },
    { header: 'I_Y (A)', key: 'iY', width: 11 },
    { header: 'I_B (A)', key: 'iB', width: 11 },
    { header: 'I_N (A)', key: 'iN', width: 11 },
    { header: 'Imbalance (%)', key: 'unbalance', width: 15 },
    { header: 'THD_I (%)', key: 'thdI', width: 12 },
    { header: 'IR (MOhm)', key: 'ir', width: 13 },
    { header: 'Earth (Ohm)', key: 'earth', width: 13 },
  ];

  assets.forEach((asset) => {
    const m = computeAssetMetrics(asset);
    phaseSheet.addRow({
      code: asset.code,
      vR: asset.telemetry.vR,
      vY: asset.telemetry.vY,
      vB: asset.telemetry.vB,
      iR: asset.telemetry.iR,
      iY: asset.telemetry.iY,
      iB: asset.telemetry.iB,
      iN: asset.telemetry.iN,
      unbalance: m.unbalancePct,
      thdI: asset.telemetry.thdI,
      ir: asset.insulationIR_MOhm,
      earth: asset.neutralEarthOhm,
    });
  });

  const alertSheet = workbook.addWorksheet('Threshold Alerts');
  alertSheet.columns = [
    { header: 'Timestamp', key: 'timestamp', width: 16 },
    { header: 'Asset Code', key: 'assetCode', width: 15 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Measured', key: 'measured', width: 14 },
    { header: 'Limit', key: 'limit', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Message', key: 'message', width: 48 },
  ];

  alerts.forEach((al) => {
    alertSheet.addRow({
      timestamp: al.timestamp,
      assetCode: al.assetCode,
      severity: al.severity,
      category: al.category,
      measured: al.measuredValue,
      limit: al.thresholdLimit,
      status: al.status,
      message: al.message,
    });
  });

  [summarySheet, phaseSheet, alertSheet].forEach((ws) => {
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LT_GridWatch_Telemetry_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
