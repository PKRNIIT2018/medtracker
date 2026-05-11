import levels from "@/config/vitals-levels.json";
import { toDisplayUnit } from "@/lib/vitals-colors";

export interface VitalsSummary {
  category: string;
  label: string;
  summary: string;
  previousValue?: string;
  currentValue: string;
  trend: "improved" | "unchanged" | "worse";
}

function findLevel(config: { levels: { min: number; max: number; label: string; summary: string }[] }, value: number) {
  return config.levels.find((l) => value >= l.min && value < l.max);
}

function getTrend(current: number, previous: number | undefined, lowerIsBetter: boolean): "improved" | "unchanged" | "worse" {
  if (previous === undefined) return "unchanged";
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "unchanged";
  if (lowerIsBetter) return diff < 0 ? "improved" : "worse";
  return diff > 0 ? "improved" : "worse";
}

const trendArrow = { improved: "↓", unchanged: "→", worse: "↑" };

function bpOverallStatus(systolic: number, diastolic: number) {
  if (systolic >= 180 || diastolic >= 120) return "very_high";
  if (systolic >= 140 || diastolic >= 90) return "high";
  if (systolic >= 130 || diastolic >= 80) return "elevated";
  if (systolic >= 120) return "elevated";
  return "normal";
}

function bpStatusLabel(label: string) {
  const map: Record<string, string> = {
    normal: "✅ Under Control",
    elevated: "⚠️ Elevated",
    high: "🔴 High",
    very_high: "🚨 Very High",
  };
  return map[label] ?? label;
}

export function summarizeBloodPressure(
  systolic: number,
  diastolic: number,
  heartRate: number | null,
  prev?: { systolic: number; diastolic: number },
): VitalsSummary[] {
  const results: VitalsSummary[] = [];

  const sysLevel = findLevel(levels.blood_pressure.systolic, systolic);
  const diaLevel = findLevel(levels.blood_pressure.diastolic, diastolic);
  const overall = bpOverallStatus(systolic, diastolic);
  const overallConfig = levels.blood_pressure.overall.levels.find((l) => l.label === overall);

  const sysTrend = getTrend(systolic, prev?.systolic, true);
  const diaTrend = getTrend(diastolic, prev?.diastolic, true);

  if (overallConfig) {
    results.push({
      category: "Blood Pressure",
      label: bpStatusLabel(overall),
      summary: overallConfig.summary.replace("{systolic}", String(systolic)).replace("{diastolic}", String(diastolic)),
      currentValue: `${systolic}/${diastolic}`,
      previousValue: prev ? `${prev.systolic}/${prev.diastolic}` : undefined,
      trend: sysTrend === "worse" || diaTrend === "worse" ? "worse" : sysTrend === "improved" && diaTrend === "improved" ? "improved" : "unchanged",
    });
  }

  if (sysLevel) {
    results.push({
      category: "Systolic",
      label: sysLevel.label,
      summary: sysLevel.summary.replace("{value}", String(systolic)).replace("{unit}", "mmHg"),
      currentValue: `${systolic} mmHg`,
      previousValue: prev ? `${prev.systolic} mmHg` : undefined,
      trend: sysTrend,
    });
  }

  if (diaLevel) {
    results.push({
      category: "Diastolic",
      label: diaLevel.label,
      summary: diaLevel.summary.replace("{value}", String(diastolic)).replace("{unit}", "mmHg"),
      currentValue: `${diastolic} mmHg`,
      previousValue: prev ? `${prev.diastolic} mmHg` : undefined,
      trend: diaTrend,
    });
  }

  if (heartRate != null) {
    const hrLevel = findLevel(levels.blood_pressure.heart_rate, heartRate);
    if (hrLevel) {
      results.push({
        category: "Heart Rate",
        label: hrLevel.label,
        summary: hrLevel.summary.replace("{value}", String(heartRate)).replace("{unit}", "bpm"),
        currentValue: `${heartRate} bpm`,
        previousValue: undefined,
        trend: "unchanged",
      });
    }
  }

  return results;
}

export function summarizeBloodSugar(
  levelMgdl: number,
  mealSlot: string,
  prev?: { level_mgdl: number },
  unit: string = "mg/dL",
): VitalsSummary {
  const isFasting = mealSlot.startsWith("before");
  const config = isFasting ? levels.blood_sugar.fasting : levels.blood_sugar.after_meal;
  const level = findLevel(config, levelMgdl);
  const trend = getTrend(levelMgdl, prev?.level_mgdl, true);

  const displayValue = toDisplayUnit(levelMgdl, unit);
  const prevDisplayValue = prev ? toDisplayUnit(prev.level_mgdl, unit) : undefined;

  const labelMap: Record<string, string> = {
    very_low: "🆘 Very Low",
    low: "⬇️ Low",
    normal: "✅ Normal",
    elevated: "⚠️ Elevated",
    high: "🔴 High",
  };

  return {
    category: "Blood Sugar",
    label: labelMap[level?.label ?? ""] ?? level?.label ?? "Unknown",
    summary: level?.summary.replace("{value}", String(displayValue)).replace("{unit}", unit) ?? "",
    currentValue: `${displayValue} ${unit}`,
    previousValue: prevDisplayValue !== undefined ? `${prevDisplayValue} ${unit}` : undefined,
    trend,
  };
}

export function summarizeBloodPanel(
  key: string,
  label: string,
  value: number,
  unit: string,
  prev?: number,
): VitalsSummary | null {
  const config = (levels.blood_panel as Record<string, any>)[key];
  if (!config) return null;

  const level = findLevel(config, value);
  if (!level) return null;

  const lowerIsBetter = key === "s_hdl" ? false : true;
  const trend = getTrend(value, prev, lowerIsBetter);

  const labelMap: Record<string, string> = {
    low: "⬇️ Low",
    normal: "✅ Normal",
    elevated: "⚠️ Elevated",
    high: "🔴 High",
    very_high: "🚨 Very High",
  };

  return {
    category: label,
    label: labelMap[level.label] ?? level.label,
    summary: level.summary.replace("{value}", String(value)).replace("{unit}", unit),
    currentValue: `${value} ${unit}`,
    previousValue: prev !== undefined ? `${prev} ${unit}` : undefined,
    trend,
  };
}
