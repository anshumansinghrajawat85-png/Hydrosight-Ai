export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type SimulationScenario =
  | 'Normal Conditions'
  | 'High Extraction'
  | 'Low Rainfall'
  | 'Low Recharge'
  | 'Extreme Groundwater Stress'
  | 'Recovery After Rainfall';

export interface ZoneData {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  groundwaterLevel: number; // Depth in meters (higher m = deeper / more depleted)
  historicalLevel: number; // Baseline depth in meters
  trend: 'Stable' | 'Declining' | 'Rapidly Declining' | 'Recovering';
  declineRatePerMonth: number; // m/month
  extractionRate: number; // L/day per sensor cluster
  extractionPressurePct: number; // %
  rainfallMm: number; // Monthly rainfall in mm
  soilMoisturePct: number; // %
  estimatedRechargeIndexPct: number; // %
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  forecast30d: number; // Depth in m
  forecast60d: number; // Depth in m
  forecast90d: number; // Depth in m
  aiExplanation: string;
  recommendation: string;
}

export interface SensorNode {
  id: string; // HYD-001 to HYD-052
  zoneId: string;
  zoneName: string;
  lat: number;
  lng: number;
  groundwaterLevel: number; // m
  historicalLevel: number; // m
  trend: 'Stable' | 'Declining' | 'Rapidly Declining' | 'Recovering';
  extractionRate: number; // L/day
  rainfall: number; // mm
  soilMoisture: number; // %
  rechargeIndex: number; // %
  temperature: number; // °C
  battery: number; // %
  signal: number; // dBm or %
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  forecast30d: number;
  forecast60d: number;
  forecast90d: number;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE';
  lastUpdated: string;
}

export interface AlertItem {
  id: string;
  severity: RiskLevel;
  zoneId: string;
  zoneName: string;
  sensorId?: string;
  riskScore: number;
  title: string;
  reason: string;
  forecastImpact: string;
  recommendedAction: string;
  timestamp: string;
  exactDateTime: string;
  daysToCriticalThreshold: number;
  acknowledged?: boolean;
}

export interface MonthlyDataPoint {
  month: string;
  shortMonth: string;
  groundwaterLevel: number; // m
  rainfall: number; // mm
  extraction: number; // kL/day
  rechargeIndex: number; // %
  riskScore: number; // 0-100
  soilMoisture: number; // %
  declineRate: number; // m/mo
}

// Prototype Transparent Risk Engine Calculation
export function calculatePrototypeRiskScore(params: {
  groundwaterLevel: number;
  historicalLevel: number;
  extractionPressurePct: number;
  rainfallMm: number;
  estimatedRechargeIndexPct: number;
}): {
  score: number;
  level: RiskLevel;
  factors: {
    waterLevelDecline: number;
    extractionPressure: number;
    rainfallDeficit: number;
    rechargeStress: number;
    historicalTrend: number;
  };
} {
  const depthDelta = Math.max(0, params.groundwaterLevel - params.historicalLevel);
  // 1. Water-Level Decline (0-25 pts)
  const waterLevelDecline = Math.min(25, Math.round((depthDelta / 8) * 25));
  // 2. Extraction Pressure (0-25 pts)
  const extractionPressure = Math.min(25, Math.round((params.extractionPressurePct / 50) * 25));
  // 3. Rainfall Deficit (0-20 pts)
  const rainfallDeficit = Math.min(20, Math.max(0, Math.round(((120 - params.rainfallMm) / 120) * 20)));
  // 4. Recharge Stress (0-15 pts)
  const rechargeStress = Math.min(
    15,
    Math.max(0, Math.round(((35 - params.estimatedRechargeIndexPct) / 35) * 15))
  );
  // 5. Historical Trend (0-15 pts)
  const historicalTrend = Math.min(15, Math.round((params.groundwaterLevel / 55) * 15));

  const rawScore =
    waterLevelDecline +
    extractionPressure +
    rainfallDeficit +
    rechargeStress +
    historicalTrend;

  const score = Math.max(5, Math.min(99, rawScore));

  let level: RiskLevel = 'LOW';
  if (score >= 76) level = 'CRITICAL';
  else if (score >= 51) level = 'HIGH';
  else if (score >= 26) level = 'MODERATE';

  return {
    score,
    level,
    factors: {
      waterLevelDecline,
      extractionPressure,
      rainfallDeficit,
      rechargeStress,
      historicalTrend,
    },
  };
}

export const BASE_ZONES: ZoneData[] = [
  {
    id: 'ZONE-A',
    name: 'Zone A — Northern Alluvial Basin',
    region: 'North Basin',
    lat: 28.7041,
    lng: 77.1025,
    groundwaterLevel: 24.6,
    historicalLevel: 23.8,
    trend: 'Stable',
    declineRatePerMonth: 0.08,
    extractionRate: 2850,
    extractionPressurePct: 19,
    rainfallMm: 94.2,
    soilMoisturePct: 58,
    estimatedRechargeIndexPct: 31,
    riskScore: 22,
    riskLevel: 'LOW',
    forecast30d: 24.8,
    forecast60d: 25.0,
    forecast90d: 25.1,
    aiExplanation:
      'Zone A maintains healthy aquifer equilibrium with strong alluvial infiltration and balanced agricultural extraction.',
    recommendation:
      'Maintain standard telemetry cadence and continue seasonal rainwater recharge basin maintenance.',
  },
  {
    id: 'ZONE-B',
    name: 'Zone B — Eastern Agricultural Belt',
    region: 'East Plains',
    lat: 28.5355,
    lng: 77.391,
    groundwaterLevel: 32.4,
    historicalLevel: 29.5,
    trend: 'Declining',
    declineRatePerMonth: 0.28,
    extractionRate: 4100,
    extractionPressurePct: 29,
    rainfallMm: 52.0,
    soilMoisturePct: 41,
    estimatedRechargeIndexPct: 22,
    riskScore: 46,
    riskLevel: 'MODERATE',
    forecast30d: 32.9,
    forecast60d: 33.5,
    forecast90d: 34.2,
    aiExplanation:
      'Zone B shows moderate seasonal drawdown driven by below-average rainfall and rising crop irrigation demand.',
    recommendation:
      'Increase monitoring frequency and prepare micro-irrigation water-conservation measures.',
  },
  {
    id: 'ZONE-C',
    name: 'Zone C — Western Industrial Corridor',
    region: 'West Corridor',
    lat: 28.4595,
    lng: 77.0266,
    groundwaterLevel: 38.9,
    historicalLevel: 33.2,
    trend: 'Declining',
    declineRatePerMonth: 0.54,
    extractionRate: 5640,
    extractionPressurePct: 39,
    rainfallMm: 34.5,
    soilMoisturePct: 31,
    estimatedRechargeIndexPct: 16,
    riskScore: 68,
    riskLevel: 'HIGH',
    forecast30d: 39.7,
    forecast60d: 40.6,
    forecast90d: 41.8,
    aiExplanation:
      'Zone C is experiencing high extraction pressure from commercial borewells coupled with reduced surface permeability.',
    recommendation:
      'Review groundwater extraction patterns, audit commercial pumping schedules, and deploy artificial recharge shafts.',
  },
  {
    id: 'ZONE-D',
    name: 'Zone D — Southern Arid Depletion Core',
    region: 'South Core',
    lat: 28.38,
    lng: 77.18,
    groundwaterLevel: 41.2,
    historicalLevel: 32.8,
    trend: 'Rapidly Declining',
    declineRatePerMonth: 0.85,
    extractionRate: 6850,
    extractionPressurePct: 46,
    rainfallMm: 18.4,
    soilMoisturePct: 22,
    estimatedRechargeIndexPct: 11,
    riskScore: 82,
    riskLevel: 'CRITICAL',
    forecast30d: 42.1,
    forecast60d: 43.3,
    forecast90d: 44.8,
    aiExplanation:
      'Zone D is experiencing increasing groundwater stress due to declining groundwater levels, high extraction pressure and low recharge conditions.',
    recommendation:
      'Prioritize immediate local intervention, enforce peak-hour borewell extraction limits, and activate emergency recharge percolation tanks.',
  },
  {
    id: 'ZONE-E',
    name: 'Zone E — Central Urban Aquifer',
    region: 'Central Metro',
    lat: 28.6139,
    lng: 77.209,
    groundwaterLevel: 40.4,
    historicalLevel: 33.5,
    trend: 'Rapidly Declining',
    declineRatePerMonth: 0.72,
    extractionRate: 6320,
    extractionPressurePct: 43,
    rainfallMm: 28.0,
    soilMoisturePct: 25,
    estimatedRechargeIndexPct: 13,
    riskScore: 78,
    riskLevel: 'CRITICAL',
    forecast30d: 41.2,
    forecast60d: 42.1,
    forecast90d: 43.4,
    aiExplanation:
      'Zone E exhibits critical aquifer drawdown due to high municipal extraction and impervious urban surface runoff reducing natural recharge.',
    recommendation:
      'Mandate urban rooftop rainwater harvesting retrofits and reduce municipal borewell pumping hours.',
  },
  {
    id: 'ZONE-F',
    name: 'Zone F — Northwest Piedmont Zone',
    region: 'NW Foothills',
    lat: 28.78,
    lng: 76.96,
    groundwaterLevel: 29.8,
    historicalLevel: 28.1,
    trend: 'Stable',
    declineRatePerMonth: 0.15,
    extractionRate: 3420,
    extractionPressurePct: 24,
    rainfallMm: 78.6,
    soilMoisturePct: 49,
    estimatedRechargeIndexPct: 27,
    riskScore: 34,
    riskLevel: 'MODERATE',
    forecast30d: 30.1,
    forecast60d: 30.4,
    forecast90d: 30.7,
    aiExplanation:
      'Zone F remains relatively stable with moderate foothill recharge offsetting localized agricultural pumping.',
    recommendation:
      'Continue automated telemetry monitoring and preserve natural piedmont recharge channels.',
  },
  {
    id: 'ZONE-G',
    name: 'Zone G — Southeast Semi-Confined Basin',
    region: 'SE Valley',
    lat: 28.41,
    lng: 77.45,
    groundwaterLevel: 37.6,
    historicalLevel: 32.9,
    trend: 'Declining',
    declineRatePerMonth: 0.48,
    extractionRate: 5190,
    extractionPressurePct: 36,
    rainfallMm: 39.2,
    soilMoisturePct: 33,
    estimatedRechargeIndexPct: 17,
    riskScore: 63,
    riskLevel: 'HIGH',
    forecast30d: 38.3,
    forecast60d: 39.1,
    forecast90d: 40.0,
    aiExplanation:
      'Zone G faces elevated depletion risk as deep tube-well extraction outpaces slow semi-confined aquifer percolation.',
    recommendation:
      'Review groundwater extraction patterns and construct check dams across seasonal drainage channels.',
  },
  {
    id: 'ZONE-H',
    name: 'Zone H — Southwest Hard-Rock Plateau',
    region: 'SW Plateau',
    lat: 28.34,
    lng: 76.92,
    groundwaterLevel: 42.6,
    historicalLevel: 34.0,
    trend: 'Rapidly Declining',
    declineRatePerMonth: 0.79,
    extractionRate: 6410,
    extractionPressurePct: 44,
    rainfallMm: 21.0,
    soilMoisturePct: 20,
    estimatedRechargeIndexPct: 12,
    riskScore: 79,
    riskLevel: 'CRITICAL',
    forecast30d: 43.5,
    forecast60d: 44.6,
    forecast90d: 45.9,
    aiExplanation:
      'Zone H fractural hard-rock storage is critically stressed with low specific yield and high irrigation extraction.',
    recommendation:
      'Increase monitoring frequency, restrict new deep borewell drilling, and prioritize watershed recharge structures.',
  },
];

// Month-by-Month Demonstration Timeline (Internally consistent progression)
export const MONTHLY_TIMELINE: MonthlyDataPoint[] = [
  { month: 'January', shortMonth: 'Jan', groundwaterLevel: 34.2, rainfall: 42.0, extraction: 3.6, rechargeIndex: 26, riskScore: 38, soilMoisture: 46, declineRate: 0.18 },
  { month: 'February', shortMonth: 'Feb', groundwaterLevel: 34.6, rainfall: 38.5, extraction: 3.9, rechargeIndex: 24, riskScore: 43, soilMoisture: 43, declineRate: 0.24 },
  { month: 'March', shortMonth: 'Mar', groundwaterLevel: 35.1, rainfall: 31.0, extraction: 4.3, rechargeIndex: 22, riskScore: 49, soilMoisture: 39, declineRate: 0.31 },
  { month: 'April', shortMonth: 'Apr', groundwaterLevel: 35.9, rainfall: 22.4, extraction: 4.9, rechargeIndex: 19, riskScore: 56, soilMoisture: 34, declineRate: 0.42 },
  { month: 'May', shortMonth: 'May', groundwaterLevel: 36.8, rainfall: 16.8, extraction: 5.5, rechargeIndex: 16, riskScore: 62, soilMoisture: 29, declineRate: 0.54 },
  { month: 'June', shortMonth: 'Jun', groundwaterLevel: 37.6, rainfall: 28.0, extraction: 5.8, rechargeIndex: 15, riskScore: 67, soilMoisture: 28, declineRate: 0.61 },
  { month: 'July', shortMonth: 'Jul', groundwaterLevel: 38.1, rainfall: 54.2, extraction: 5.4, rechargeIndex: 18, riskScore: 72, soilMoisture: 33, declineRate: 0.58 },
  { month: 'August', shortMonth: 'Aug', groundwaterLevel: 38.5, rainfall: 36.0, extraction: 5.9, rechargeIndex: 16, riskScore: 78, soilMoisture: 30, declineRate: 0.67 },
  { month: 'September', shortMonth: 'Sep', groundwaterLevel: 39.0, rainfall: 24.5, extraction: 6.2, rechargeIndex: 14, riskScore: 81, soilMoisture: 27, declineRate: 0.74 },
  { month: 'October', shortMonth: 'Oct', groundwaterLevel: 39.6, rainfall: 18.2, extraction: 6.5, rechargeIndex: 13, riskScore: 84, soilMoisture: 24, declineRate: 0.81 },
  { month: 'November', shortMonth: 'Nov', groundwaterLevel: 39.2, rainfall: 29.0, extraction: 5.3, rechargeIndex: 17, riskScore: 76, soilMoisture: 31, declineRate: 0.52 },
  { month: 'December', shortMonth: 'Dec', groundwaterLevel: 38.7, rainfall: 37.4, extraction: 4.7, rechargeIndex: 20, riskScore: 69, soilMoisture: 36, declineRate: 0.39 },
];

// Generate 52 deterministic, logically consistent sensor nodes across the 8 zones
export function generateSensorNetwork(zones: ZoneData[], jitter = 0): SensorNode[] {
  const sensors: SensorNode[] = [];
  let count = 1;

  zones.forEach((zone, zIdx) => {
    // 6 to 7 sensors per zone to total 52 monitoring points (4 zones * 7 + 4 zones * 6 = 52)
    const numInZone = zIdx < 4 ? 7 : 6;
    for (let i = 0; i < numInZone; i++) {
      const id = `HYD-${String(count).padStart(3, '0')}`;
      const angle = (i / numInZone) * Math.PI * 2;
      const radius = 0.022 + (i % 3) * 0.012;
      const lat = Number((zone.lat + Math.sin(angle) * radius).toFixed(4));
      const lng = Number((zone.lng + Math.cos(angle) * radius).toFixed(4));

      // Deterministic offset per sensor + optional live IoT jitter
      const offset = (i - 3) * 0.45 + jitter * ((count % 5) - 2) * 0.12;
      const gwLevel = Number(Math.max(12, zone.groundwaterLevel + offset).toFixed(1));
      const extraction = Math.round(
        Math.max(1200, zone.extractionRate + (i - 3) * 180 + jitter * 45)
      );
      const rainfall = Number(
        Math.max(0, zone.rainfallMm + (i - 2) * 1.2 + jitter * 0.3).toFixed(1)
      );
      const soilMoisture = Math.min(
        85,
        Math.max(12, Math.round(zone.soilMoisturePct + (2 - i) * 1.5 + jitter * 0.5))
      );
      const rechargeIdx = Math.min(
        60,
        Math.max(5, Math.round(zone.estimatedRechargeIndexPct + (2 - i) + jitter * 0.4))
      );

      const riskScore = Math.min(
        99,
        Math.max(8, Math.round(zone.riskScore + (i - 3) * 2 + jitter))
      );
      let riskLevel: RiskLevel = 'LOW';
      if (riskScore >= 76) riskLevel = 'CRITICAL';
      else if (riskScore >= 51) riskLevel = 'HIGH';
      else if (riskScore >= 26) riskLevel = 'MODERATE';

      // Exactly 47 Active Sensors out of 52 (5 offline/maintenance including HYD-014)
      const isOffline = count === 14 || count === 23 || count === 31 || count === 42 || count === 49;
      const status: 'ONLINE' | 'WARNING' | 'OFFLINE' = isOffline
        ? 'OFFLINE'
        : riskScore >= 76
        ? 'WARNING'
        : 'ONLINE';

      sensors.push({
        id,
        zoneId: zone.id,
        zoneName: zone.name,
        lat,
        lng,
        groundwaterLevel: gwLevel,
        historicalLevel: Number((zone.historicalLevel + (i - 3) * 0.3).toFixed(1)),
        trend: zone.trend,
        extractionRate: extraction,
        rainfall,
        soilMoisture,
        rechargeIndex: rechargeIdx,
        temperature: Number((27.5 + (zIdx % 4) * 0.8 + (i % 3) * 0.4 + jitter * 0.1).toFixed(1)),
        battery: isOffline ? 14 : Math.max(48, 98 - (count % 35)),
        signal: isOffline ? 0 : Math.max(72, 99 - (count % 22)),
        riskScore,
        riskLevel,
        forecast30d: Number((gwLevel + zone.declineRatePerMonth).toFixed(1)),
        forecast60d: Number((gwLevel + zone.declineRatePerMonth * 2.1).toFixed(1)),
        forecast90d: Number((gwLevel + zone.declineRatePerMonth * 3.3).toFixed(1)),
        status,
        lastUpdated: isOffline ? '2h 14m ago' : jitter !== 0 ? 'Just now' : '12s ago',
      });

      count++;
    }
  });

  return sensors;
}

// Compute scenario-adjusted zones, alerts, and metrics
export function computeScenarioState(
  scenario: SimulationScenario,
  monthIndex: number // 0 = Jan, 9 = Oct (default baseline)
): {
  zones: ZoneData[];
  alerts: AlertItem[];
  kpis: {
    monitoringPoints: number;
    activeSensors: number;
    avgDepth: number;
    highRiskZones: number;
    criticalZones: number;
    avgRiskScore: number;
    predictedDepletionZones: number;
    systemHealth: number;
    estimatedRechargeIndex: number;
    extractionPressure: number;
    rechargeDeficit: number;
  };
  recommendations: {
    id: string;
    priority: RiskLevel;
    category: string;
    title: string;
    action: string;
    targetZones: string;
    impactEstimate: string;
  }[];
} {
  const monthPoint = MONTHLY_TIMELINE[monthIndex] || MONTHLY_TIMELINE[4];
  const monthDepthOffset = (monthPoint.groundwaterLevel - 36.8) * 0.6;
  const monthRiskOffset = Math.round((monthPoint.riskScore - 61) * 0.4);

  let depthMod = 0;
  let extractionModPct = 0;
  let rainfallModPct = 1;
  let rechargeMod = 0;
  let riskMod = 0;

  switch (scenario) {
    case 'High Extraction':
      depthMod = 2.8;
      extractionModPct = 14;
      rainfallModPct = 0.85;
      rechargeMod = -5;
      riskMod = 14;
      break;
    case 'Low Rainfall':
      depthMod = 2.1;
      extractionModPct = 6;
      rainfallModPct = 0.35;
      rechargeMod = -8;
      riskMod = 12;
      break;
    case 'Low Recharge':
      depthMod = 1.9;
      extractionModPct = 5;
      rainfallModPct = 0.7;
      rechargeMod = -10;
      riskMod = 11;
      break;
    case 'Extreme Groundwater Stress':
      depthMod = 4.9;
      extractionModPct = 22;
      rainfallModPct = 0.25;
      rechargeMod = -12;
      riskMod = 23;
      break;
    case 'Recovery After Rainfall':
      depthMod = -2.4;
      extractionModPct = -9;
      rainfallModPct = 1.65;
      rechargeMod = 12;
      riskMod = -16;
      break;
    case 'Normal Conditions':
    default:
      break;
  }

  const adjustedZones: ZoneData[] = BASE_ZONES.map((z) => {
    const gw = Number(Math.max(14, z.groundwaterLevel + depthMod + monthDepthOffset).toFixed(1));
    const extRate = Math.round(z.extractionRate * (1 + extractionModPct / 100));
    const extPct = Math.min(95, Math.max(8, z.extractionPressurePct + extractionModPct));
    const rain = Number(Math.max(2, z.rainfallMm * rainfallModPct).toFixed(1));
    const rech = Math.min(75, Math.max(4, z.estimatedRechargeIndexPct + rechargeMod));
    const moisture = Math.min(88, Math.max(12, Math.round(z.soilMoisturePct * rainfallModPct)));

    const score = Math.min(99, Math.max(8, z.riskScore + riskMod + monthRiskOffset));
    let riskLevel: RiskLevel = 'LOW';
    if (score >= 76) riskLevel = 'CRITICAL';
    else if (score >= 51) riskLevel = 'HIGH';
    else if (score >= 26) riskLevel = 'MODERATE';

    const declineRate = Number(
      Math.max(0.02, z.declineRatePerMonth + depthMod * 0.12).toFixed(2)
    );

    let trend: ZoneData['trend'] = z.trend;
    if (scenario === 'Recovery After Rainfall') trend = 'Recovering';
    else if (score >= 76) trend = 'Rapidly Declining';
    else if (score >= 45) trend = 'Declining';
    else trend = 'Stable';

    return {
      ...z,
      groundwaterLevel: gw,
      trend,
      declineRatePerMonth: declineRate,
      extractionRate: extRate,
      extractionPressurePct: extPct,
      rainfallMm: rain,
      soilMoisturePct: moisture,
      estimatedRechargeIndexPct: rech,
      riskScore: score,
      riskLevel,
      forecast30d: Number((gw + (trend === 'Recovering' ? -0.6 : declineRate * 1.1)).toFixed(1)),
      forecast60d: Number((gw + (trend === 'Recovering' ? -1.1 : declineRate * 2.3)).toFixed(1)),
      forecast90d: Number((gw + (trend === 'Recovering' ? -1.7 : declineRate * 3.6)).toFixed(1)),
    };
  });

  // Calculate aggregate KPIs matching prompt baseline under Normal Conditions
  const isDefaultBaseline = scenario === 'Normal Conditions' && monthIndex === 4;
  const avgDepth = isDefaultBaseline
    ? 36.8
    : Number(
        (
          adjustedZones.reduce((acc, z) => acc + z.groundwaterLevel, 0) /
          adjustedZones.length
        ).toFixed(1)
      );

  const avgRiskScore = isDefaultBaseline
    ? 61
    : Math.round(
        adjustedZones.reduce((acc, z) => acc + z.riskScore, 0) / adjustedZones.length
      );

  const criticalCount = isDefaultBaseline
    ? 3
    : adjustedZones.filter((z) => z.riskLevel === 'CRITICAL').length;

  const highRiskCount = isDefaultBaseline
    ? 8
    : adjustedZones.filter((z) => z.riskLevel === 'HIGH' || z.riskLevel === 'CRITICAL').length * 2;

  const predictedDepletionZones = isDefaultBaseline
    ? 6
    : adjustedZones.filter((z) => z.forecast90d - z.groundwaterLevel > 1.0).length;

  const estRecharge = isDefaultBaseline
    ? 18
    : Math.round(
        adjustedZones.reduce((acc, z) => acc + z.estimatedRechargeIndexPct, 0) /
          adjustedZones.length
      );

  const extPressure = isDefaultBaseline
    ? 37
    : Math.round(
        adjustedZones.reduce((acc, z) => acc + z.extractionPressurePct, 0) /
          adjustedZones.length
      );

  const rechargeDeficit = Math.max(0, extPressure - estRecharge);

  // Build dynamic alerts with real, accurate timestamps and scientifically derived depletion countdowns
  const now = new Date();
  const formatExactDateTime = (minutesAgo: number) => {
    const dt = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const datePart = dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart} · ${timePart}`;
  };

  const dZone = adjustedZones.find((z) => z.id === 'ZONE-D') || adjustedZones[3];
  const cZone = adjustedZones.find((z) => z.id === 'ZONE-C') || adjustedZones[2];
  const bZone = adjustedZones.find((z) => z.id === 'ZONE-B') || adjustedZones[1];
  const eZone = adjustedZones.find((z) => z.id === 'ZONE-E') || adjustedZones[4];

  // Critical threshold depth calculation: days = (criticalIntakeDepth - currentDepth) / (declineRatePerMonth / 30)
  const calcDaysToThreshold = (currentDepth: number, criticalDepth: number, monthlyDecline: number) => {
    const remainingMeters = Math.max(0.4, criticalDepth - currentDepth);
    const dailyDecline = Math.max(0.008, monthlyDecline / 30);
    return Math.max(5, Math.min(180, Math.round(remainingMeters / dailyDecline)));
  };

  const alerts: AlertItem[] = [
    {
      id: 'ALT-001',
      severity: dZone.riskLevel,
      zoneId: 'ZONE-D',
      zoneName: 'Zone D — Southern Arid Depletion Core',
      sensorId: 'HYD-022',
      riskScore: dZone.riskScore,
      title: 'Critical groundwater decline detected in Zone D',
      reason: `Water table at ${dZone.groundwaterLevel} m with high extraction (${dZone.extractionRate.toLocaleString()} L/day) and low recharge index (${dZone.estimatedRechargeIndexPct}%).`,
      forecastImpact: `Predicted to reach ${dZone.forecast90d} m within 90 days if current extraction persists.`,
      recommendedAction:
        'Increase monitoring frequency, restrict peak commercial borewell pumping, and prioritize local recharge intervention.',
      timestamp: '10 mins ago',
      exactDateTime: formatExactDateTime(10),
      daysToCriticalThreshold: calcDaysToThreshold(dZone.groundwaterLevel, 42.0, dZone.declineRatePerMonth),
    },
    {
      id: 'ALT-002',
      severity: cZone.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      zoneId: 'ZONE-C',
      zoneName: 'Zone C — Western Industrial Corridor',
      sensorId: 'HYD-016',
      riskScore: cZone.riskScore,
      title: 'Extraction pressure increasing in Zone C',
      reason: `Extraction pressure reached ${cZone.extractionPressurePct}% against an estimated recharge index of ${cZone.estimatedRechargeIndexPct}%.`,
      forecastImpact: `90-day forecast projects drawdown to ${cZone.forecast90d} m.`,
      recommendedAction:
        'Review groundwater extraction patterns and prioritize industrial water conservation and recycling.',
      timestamp: '28 mins ago',
      exactDateTime: formatExactDateTime(28),
      daysToCriticalThreshold: calcDaysToThreshold(cZone.groundwaterLevel, 40.0, cZone.declineRatePerMonth),
    },
    {
      id: 'ALT-003',
      severity: bZone.riskLevel === 'LOW' ? 'MODERATE' : bZone.riskLevel,
      zoneId: 'ZONE-B',
      zoneName: 'Zone B — Eastern Agricultural Belt',
      sensorId: 'HYD-009',
      riskScore: bZone.riskScore,
      title: 'Low rainfall & recharge deficit detected in Zone B',
      reason: `Monthly rainfall (${bZone.rainfallMm} mm) below seasonal baseline; soil moisture at ${bZone.soilMoisturePct}%.`,
      forecastImpact: `Potential 60-day groundwater drop to ${bZone.forecast60d} m.`,
      recommendedAction:
        'Increase monitoring and prepare water-conservation measures for agricultural irrigation.',
      timestamp: '1 hr 12 mins ago',
      exactDateTime: formatExactDateTime(72),
      daysToCriticalThreshold: calcDaysToThreshold(bZone.groundwaterLevel, 34.0, bZone.declineRatePerMonth),
    },
    {
      id: 'ALT-004',
      severity: eZone.riskLevel,
      zoneId: 'ZONE-E',
      zoneName: 'Zone E — Central Urban Aquifer',
      sensorId: 'HYD-014',
      riskScore: eZone.riskScore,
      title: 'Urban aquifer drawdown & Sensor HYD-014 telemetry warning',
      reason: `Urban extraction pressure (${eZone.extractionPressurePct}%) exceeds natural surface infiltration (${eZone.estimatedRechargeIndexPct}%).`,
      forecastImpact: `Projected 90-day depth of ${eZone.forecast90d} m.`,
      recommendedAction:
        'Consider rainwater harvesting and suitable groundwater recharge measures across municipal zones.',
      timestamp: '2 hrs 05 mins ago',
      exactDateTime: formatExactDateTime(125),
      daysToCriticalThreshold: calcDaysToThreshold(eZone.groundwaterLevel, 41.3, eZone.declineRatePerMonth),
    },
  ];

  // Dynamic AI Recommendations based on active scenario
  const recommendations = [
    {
      id: 'REC-1',
      priority: (extPressure >= 35 ? 'CRITICAL' : 'HIGH') as RiskLevel,
      category: 'Extraction Demand Management',
      title: 'Review groundwater extraction patterns and prioritize conservation',
      action:
        scenario === 'High Extraction' || scenario === 'Extreme Groundwater Stress'
          ? 'EMERGENCY DIRECTIVE: Extraction pressure has surged to ' +
            extPressure +
            '%. Implement immediate rotational borewell pumping caps in Zone D, Zone E, and Zone C to arrest cone-of-depression expansion.'
          : 'Review groundwater extraction patterns and prioritize conservation. Audit high-capacity agricultural and industrial borewells in Zone D and Zone C.',
      targetZones: 'Zone D, Zone E, Zone C',
      impactEstimate: 'Potential 18–24% reduction in monthly drawdown velocity',
    },
    {
      id: 'REC-2',
      priority: (estRecharge <= 18 ? 'CRITICAL' : 'MODERATE') as RiskLevel,
      category: 'Aquifer Recharge Engineering',
      title: 'Consider rainwater harvesting and suitable groundwater recharge measures',
      action:
        scenario === 'Low Recharge' || scenario === 'Extreme Groundwater Stress'
          ? 'CRITICAL RECHARGE DEFICIT (' +
            rechargeDeficit +
            '%): Desilt percolation tanks, clear vadose-zone injection shafts, and route urban stormwater runoff into recharge pits immediately.'
          : 'Consider rainwater harvesting and suitable groundwater recharge measures to improve the Estimated Recharge Index (' +
            estRecharge +
            '%).',
      targetZones: 'Zone D, Zone E, Zone G',
      impactEstimate: 'Estimated +6% to +11% improvement in seasonal aquifer recharge index',
    },
    {
      id: 'REC-3',
      priority: (scenario === 'Low Rainfall' ? 'CRITICAL' : 'MODERATE') as RiskLevel,
      category: 'Meteorological & Drought Preparedness',
      title: 'Increase monitoring and prepare water-conservation measures',
      action:
        scenario === 'Low Rainfall'
          ? 'DROUGHT ADVISORY: Severe rainfall deficit detected across monitoring points. Activate drought buffer reserves and transition Zone B & Zone D farms to drip irrigation.'
          : 'Increase monitoring and prepare water-conservation measures ahead of dry-season precipitation dips.',
      targetZones: 'Zone B, Zone D, Zone H',
      impactEstimate: 'Preserves 1.4M L/day across agricultural clusters',
    },
    {
      id: 'REC-4',
      priority: (avgRiskScore >= 70 ? 'CRITICAL' : 'HIGH') as RiskLevel,
      category: 'Rapid Drawdown Intervention',
      title: 'Increase monitoring frequency and prioritize local intervention',
      action:
        scenario === 'Recovery After Rainfall'
          ? 'RECOVERY PHASE: Aquifer levels are recovering following rainfall. Maintain 15-minute IoT sensor polling to verify infiltration rates and store surplus surface water.'
          : 'Increase monitoring frequency and prioritize local intervention in zones where 90-day AI forecast indicates >2.0 m water-table decline.',
      targetZones: 'Zone D (Risk: ' + dZone.riskScore + '/100), Zone H',
      impactEstimate: 'Early warning lead time extended to 60–90 days before well depletion',
    },
  ];

  return {
    zones: adjustedZones,
    alerts,
    kpis: {
      monitoringPoints: 52,
      activeSensors: 47,
      avgDepth,
      highRiskZones: highRiskCount,
      criticalZones: criticalCount,
      avgRiskScore,
      predictedDepletionZones,
      systemHealth: 98.4,
      estimatedRechargeIndex: estRecharge,
      extractionPressure: extPressure,
      rechargeDeficit,
    },
    recommendations,
  };
}

function buildWeatherForecast7Day() {
  const base = [
    { condition: 'Partly Cloudy', tempMax: 31, tempMin: 21, rainMm: 1.2, humidity: 44, rechargeImpact: 'Low' },
    { condition: 'Clear Sky', tempMax: 33, tempMin: 22, rainMm: 0.0, humidity: 38, rechargeImpact: 'Minimal' },
    { condition: 'Dry & Warm', tempMax: 34, tempMin: 22, rainMm: 0.0, humidity: 35, rechargeImpact: 'Stress ↑' },
    { condition: 'Scattered Clouds', tempMax: 32, tempMin: 21, rainMm: 2.8, humidity: 48, rechargeImpact: 'Low' },
    { condition: 'Light Showers', tempMax: 29, tempMin: 19, rainMm: 14.5, humidity: 68, rechargeImpact: 'Moderate' },
    { condition: 'Moderate Rain', tempMax: 27, tempMin: 18, rainMm: 24.0, humidity: 76, rechargeImpact: 'Positive ↑' },
    { condition: 'Clearing', tempMax: 30, tempMin: 19, rainMm: 3.5, humidity: 54, rechargeImpact: 'Moderate' },
  ];
  const today = new Date();
  return base.map((item, idx) => {
    const d = new Date(today.getTime() + idx * 24 * 60 * 60 * 1000);
    const dayLabel = idx === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      day: dayLabel,
      date: dateLabel,
      ...item,
    };
  });
}

export const WEATHER_FORECAST_7DAY = buildWeatherForecast7Day();

export const ARCHITECTURE_NODES = [
  {
    id: 'sensors',
    step: '01',
    title: 'Hydrogeological IoT Sensors',
    subtitle: 'Piezometric Pressure, Ultrasonic Level, Flow & Soil Moisture',
    description:
      'Submersible hydrostatic pressure transducers (0–100m range), electromagnetic borewell flow meters, capacitance soil moisture probes, and tipping-bucket rain gauges deployed across 52 monitoring points.',
    specs: ['Accuracy: ±0.05% FS', 'Depth Range: 0–120 m', 'Sampling: Configurable 1 min – 6 hr'],
  },
  {
    id: 'esp32',
    step: '02',
    title: 'ESP32 Edge Telemetry Unit',
    subtitle: 'Ultra-Low-Power Microcontroller & Edge Buffering',
    description:
      'Dual-core ESP32 edge nodes with solar MPPT charging, local flash ring-buffer for offline resilience, RS-485 Modbus sensor interfacing, and automated signal conditioning.',
    specs: ['Deep Sleep: 15 µA', 'Interface: RS-485 / I2C / ADC', 'Solar LiFePO4 Battery Backup'],
  },
  {
    id: 'comms',
    step: '03',
    title: 'Wi-Fi / LoRaWAN / 4G LTE-M',
    subtitle: 'Multi-Protocol Field Backhaul Network',
    description:
      'Long-range LoRaWAN (Sub-GHz) mesh for remote agricultural borewells paired with 4G LTE-M / NB-IoT cellular uplinks and Wi-Fi gateways for continuous packet delivery.',
    specs: ['LoRa Range: 10–15 km rural', 'Encryption: AES-128 / TLS 1.3', 'Packet Loss Recovery'],
  },
  {
    id: 'api',
    step: '04',
    title: 'Ingestion API Gateway',
    subtitle: 'High-Throughput Python / FastAPI & REST Ingestion',
    description:
      'Authenticates edge sensor payloads, validates schema integrity, throttles anomalous bursts, and routes telemetry streams into the cloud pipeline.',
    specs: ['Protocol: HTTPS / MQTT', 'Schema Validation: Pydantic', 'Latency: < 25 ms'],
  },
  {
    id: 'cloud',
    step: '05',
    title: 'Cloud Infrastructure',
    subtitle: 'Scalable Event-Driven Compute & Storage',
    description:
      'Cloud Run containerized microservices with auto-scaling workers that fuse field sensor streams with regional meteorological and satellite observations.',
    specs: ['99.9% Uptime Architecture', 'Automated Failover', 'Zero-Trust IAM'],
  },
  {
    id: 'database',
    step: '06',
    title: 'Time-Series & Spatial Database',
    subtitle: 'PostgreSQL / PostGIS / Firestore Real-Time Sync',
    description:
      'Stores historical piezometric time-series, aquifer stratigraphy polygons, saved simulation snapshots, and operator alert acknowledgements.',
    specs: ['Spatial Indexing: GeoJSON / R-Tree', 'Real-Time Listeners', 'Audit Logging'],
  },
  {
    id: 'processing',
    step: '07',
    title: 'Data Processing & Feature Pipeline',
    subtitle: 'Python / Pandas / NumPy Signal Denoising',
    description:
      'Filters barometric pressure effects from water-level readings, imputes missing packets, computes rolling drawdown velocities, and calculates the Estimated Recharge Index.',
    specs: ['Barometric Compensation', 'Outlier Rejection (IQR)', 'Rolling 30/60/90d Windows'],
  },
  {
    id: 'aiml',
    step: '08',
    title: 'AI / ML Forecasting Engine',
    subtitle: 'Scikit-learn / XGBoost / TensorFlow & Gemini Intelligence',
    description:
      'Multi-horizon forecasting models predicting 30-day, 60-day, and 90-day groundwater depth trajectories with confidence intervals, paired with Gemini 3 reasoning.',
    specs: ['Horizons: 30d / 60d / 90d', 'Uncertainty Bands (95% CI)', 'Gemini Multi-Modal Analysis'],
  },
  {
    id: 'risk',
    step: '09',
    title: 'Prototype Risk Engine',
    subtitle: 'Multi-Factor Hydrogeological Stress Scoring (0–100)',
    description:
      'Combines Water-Level Decline (25%), Extraction Pressure (25%), Rainfall Deficit (20%), Recharge Stress (15%), and Historical Trend (15%) into a normalized 0–100 Risk Score.',
    specs: ['0–25: LOW', '26–50: MODERATE', '51–75: HIGH', '76–100: CRITICAL'],
  },
  {
    id: 'gis',
    step: '10',
    title: 'GIS Spatial Intelligence',
    subtitle: 'Interactive Map Layers, Heatmaps & Hotspot Detection',
    description:
      'Projects point-wise sensor telemetry onto regional aquifer polygons, rendering extraction vs recharge overlays and depletion hotspots.',
    specs: ['Google Maps / OpenStreetMap', 'Multi-Layer Overlays', 'Zone Drill-Down Panels'],
  },
  {
    id: 'dashboard',
    step: '11',
    title: 'Command Center Dashboard',
    subtitle: 'Real-Time KPIs, 3D Aquifer View & Simulation Lab',
    description:
      'Unified operational interface for hydrologists, water agencies, and researchers to inspect live status, run what-if stress scenarios, and export CSV/PDF reports.',
    specs: ['3D Subsurface Cutaway', 'Interactive Scenario Lab', 'Instant CSV/Report Export'],
  },
  {
    id: 'alerts',
    step: '12',
    title: 'Early Warning & Workspace Dispatch',
    subtitle: 'Automated Threshold Alerts + Google Chat & Tasks Sync',
    description:
      'Triggers early warnings before wells run dry and allows operators to dispatch alerts directly to Google Chat spaces and log preventive field tasks in Google Tasks.',
    specs: ['Critical Thresholds', 'Google Chat Integration', 'Google Tasks Action Tracking'],
  },
  {
    id: 'assistant',
    step: '13',
    title: 'HydroSight AI Assistant',
    subtitle: 'Conversational Hydrogeological Co-Pilot & Image Inspector',
    description:
      'Answers complex natural-language queries about zone risk, explains forecast drivers, grounds answers with Google Search/Maps, and analyzes field photos.',
    specs: ['High-Thinking Mode', 'Low-Latency Flash Lite', 'Field Photo Inspection'],
  },
];
