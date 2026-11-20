export type LTAssetCategory =
  | 'Distribution Transformer'
  | 'LT Feeder Pillar'
  | 'LT Main Switchboard'
  | 'APFC Capacitor Bank'
  | 'Bus Coupler Panel';

export type AssetHealthState = 'Nominal' | 'Warning' | 'Critical' | 'Offline';

export type CoolingMode = 'ONAN' | 'Forced Air' | 'Natural Convection';

export type MonitoringView =
  | 'telemetry'
  | 'assets'
  | 'analytics'
  | 'alerts'
  | 'maintenance';

export interface TelemetrySample {
  timestamp: string;
  loadKva: number;
  loadPct: number;
  tempC: number;
  unbalancePct: number;
  pf: number;
}

export interface PhaseTelemetry {
  vR: number; // Line-to-Neutral Volts (nominal ~235-242V for 415V L-L system)
  vY: number;
  vB: number;
  iR: number; // Phase R current (A)
  iY: number; // Phase Y current (A)
  iB: number; // Phase B current (A)
  iN: number; // Neutral current (A)
  pf: number; // Power factor (0.00 - 1.00)
  thdV: number; // Voltage THD (%)
  thdI: number; // Current THD (%)
  freqHz: number; // Grid frequency (Hz)
}

export interface ThermalTelemetry {
  primaryTempC: number; // Top Oil Temp (DT) or Busbar Temp (Panels)
  hotspotTempC: number; // Winding Hot-Spot or Termination Hot-Spot
  ambientTempC: number;
  coolingMode: CoolingMode;
}

export interface AssetThresholds {
  loadWarnPct: number;
  loadCritPct: number;
  tempWarnC: number;
  tempCritC: number;
  unbalanceWarnPct: number;
  pfMinWarn: number;
}

export interface HealthSubScores {
  healthIndex: number; // 0 - 100 composite
  thermalScore: number;
  loadScore: number;
  balanceScore: number;
  powerQualityScore: number;
  voltageScore: number;
  insulationScore: number;
}

export interface SimulationProfile {
  loadBias: number; // multiplier around nominal (e.g. 1.0 = normal, 1.35 = overload)
  phaseSkewR: number; // imbalance factor per phase
  phaseSkewY: number;
  phaseSkewB: number;
  coolingFault: boolean;
}

export interface LTAsset {
  id: string;
  code: string;
  name: string;
  category: LTAssetCategory;
  zone: string;
  feederRef: string;
  ratedKva: number;
  ratedCurrentA: number;
  nominalVoltageV: number; // e.g., 415V or 433V
  energized: boolean;
  installYear: number;
  manufacturer: string;
  insulationIR_MOhm: number;
  oilBdvKv: number | null; // null for dry panels/feeders
  neutralEarthOhm: number;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  breakerOpsCount: number;
  telemetry: PhaseTelemetry;
  thermal: ThermalTelemetry;
  thresholds: AssetThresholds;
  simulation: SimulationProfile;
  history: TelemetrySample[];
}

export type AlertSeverity = 'Critical' | 'Warning';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';

export interface AssetAlert {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  zone: string;
  severity: AlertSeverity;
  category:
    | 'Overload'
    | 'Thermal Drift'
    | 'Phase Imbalance'
    | 'Power Factor'
    | 'Voltage Deviation'
    | 'Harmonics';
  message: string;
  measuredValue: string;
  thresholdLimit: string;
  timestamp: string;
  status: AlertStatus;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  zone: string;
  date: string;
  engineer: string;
  taskType:
    | 'IR & Continuity Test'
    | 'Oil BDV & DGA Sampling'
    | 'IR Thermography Scan'
    | 'Neutral Earthing Check'
    | 'Busbar Torque & Cleaning';
  findings: string;
  irValueMOhm: number;
  earthResistanceOhm: number;
  outcome: 'Passed' | 'Action Required' | 'Scheduled';
}

export const LT_ZONES = [
  'North Industrial Zone',
  'Central Commercial District',
  'East Residential Feeder',
  'Tech Park Substation',
] as const;

export const LT_CATEGORIES: LTAssetCategory[] = [
  'Distribution Transformer',
  'LT Feeder Pillar',
  'LT Main Switchboard',
  'APFC Capacitor Bank',
  'Bus Coupler Panel',
];
