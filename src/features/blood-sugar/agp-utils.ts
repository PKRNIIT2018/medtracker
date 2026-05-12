export interface AgpReading {
  level: number;
  time: string;
  date: string;
}

export interface AgpBin {
  time: string;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface AgpMetrics {
  avgGlucose: number;
  gmi: number;
  timeInRange: number;
  timeAboveLevel1: number;
  timeAboveLevel2: number;
  timeBelowLevel1: number;
  timeBelowLevel2: number;
  cv: number;
  sd: number;
  readings: number;
  days: number;
}

const MGDL_TO_MMOLL = 18.0182;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const k = (p / 100) * (sorted.length - 1);
  const f = Math.floor(k);
  const c = Math.ceil(k);
  if (f === c) return sorted[f];
  return sorted[f] * (c - k) + sorted[c] * (k - f);
}

export function computePercentiles(values: number[]): {
  p5: number; p25: number; p50: number; p75: number; p95: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p5: percentile(sorted, 5),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
  };
}

function roundTo(n: number, d: number): number {
  return Math.round(n * 10 ** d) / 10 ** d;
}

export function computeGmi(avgMmolL: number): number {
  const avgMgdl = avgMmolL * MGDL_TO_MMOLL;
  return roundTo(3.31 + 0.02392 * avgMgdl, 1);
}

export function computeSd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((s, d) => s + d, 0) / (values.length - 1));
}

export function computeAgpMetrics(readings: AgpReading[]): AgpMetrics {
  const levels = readings.map((r) => r.level);
  const avgGlucose = roundTo(levels.reduce((s, v) => s + v, 0) / levels.length, 1);
  const sd = computeSd(levels);
  const cv = avgGlucose > 0 ? roundTo((sd / avgGlucose) * 100, 1) : 0;
  const uniqueDays = new Set(readings.map((r) => r.date)).size;

  const total = readings.length;
  let below2 = 0, below1 = 0, inRange = 0, above1 = 0, above2 = 0;

  for (const r of readings) {
    if (r.level < 3.0) below2++;
    else if (r.level < 3.9) below1++;
    else if (r.level <= 10.0) inRange++;
    else if (r.level <= 13.9) above1++;
    else above2++;
  }

  return {
    avgGlucose,
    gmi: computeGmi(avgGlucose),
    timeInRange: roundTo((inRange / total) * 100, 1),
    timeAboveLevel1: roundTo((above1 / total) * 100, 1),
    timeAboveLevel2: roundTo((above2 / total) * 100, 1),
    timeBelowLevel1: roundTo((below1 / total) * 100, 1),
    timeBelowLevel2: roundTo((below2 / total) * 100, 1),
    cv,
    sd: roundTo(sd, 2),
    readings: total,
    days: uniqueDays,
  };
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface AgpChartData {
  bins: AgpBin[];
  maxY: number;
}

export function computeAgpModalDay(readings: AgpReading[]): AgpChartData {
  const withTime = readings.filter((r) => r.time);
  if (withTime.length === 0) return { bins: [], maxY: 0 };

  const bins: Map<number, number[]> = new Map();
  const binInterval = 30;

  for (let m = 0; m < 1440; m += binInterval) {
    bins.set(m, []);
  }

  for (const r of withTime) {
    const mins = parseMinutes(r.time);
    const binStart = Math.floor(mins / binInterval) * binInterval;
    const bin = bins.get(binStart);
    if (bin) bin.push(r.level);
  }

  const result: AgpBin[] = [];
  let maxY = 0;

  for (let m = 0; m < 1440; m += binInterval) {
    const values = bins.get(m) ?? [];
    if (values.length < 3) {
      result.push({ time: formatMinutes(m), p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 });
      continue;
    }
    const p = computePercentiles(values);
    result.push({ time: formatMinutes(m), ...p });
    maxY = Math.max(maxY, p.p95);
  }

  return { bins: result, maxY: Math.ceil(maxY) + 1 };
}
