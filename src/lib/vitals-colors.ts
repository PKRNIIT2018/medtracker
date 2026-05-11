/**
 * Shared color coding for vitals and measurements.
 *
 * Single source of truth for all status-to-color mappings.
 * Every page should import from here instead of defining local color records.
 */

import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Blood Pressure ───────────────────────────────────────────────────────────

export type BpLevel = "very_high" | "high" | "elevated" | "normal";

export function getBpLevel(systolic: number, diastolic: number): BpLevel {
  if (systolic >= 180 || diastolic >= 120) return "very_high";
  if (systolic >= 140 || diastolic >= 90) return "high";
  if (systolic >= 130 || diastolic >= 80) return "elevated";
  return "normal";
}

/** Returns border color class. `side` controls which border (`l` or `t`). */
export function getBpBorderColor(
  systolic: number,
  diastolic: number,
  side: "l" | "t" = "l",
): string {
  const base = `border-${side}-`;
  const level = getBpLevel(systolic, diastolic);
  const colors: Record<BpLevel, string> = {
    very_high: "red-500",
    high: "red-400",
    elevated: "amber-400",
    normal: "green-500",
  };
  return `${base}${colors[level]}`;
}

export function getBpStatusLabel(systolic: number, diastolic: number): string {
  const level = getBpLevel(systolic, diastolic);
  const labels: Record<BpLevel, string> = {
    very_high: "Very High",
    high: "High",
    elevated: "Elevated",
    normal: "Normal",
  };
  return labels[level];
}

// ─── Blood Sugar ──────────────────────────────────────────────────────────────

export type SugarLevel = "normal" | "low" | "high";

export function getSugarLevel(level: number): SugarLevel {
  if (level < 70) return "low";
  if (level > 140) return "high";
  return "normal";
}

export const sugarBorderColors: Record<SugarLevel, string> = {
  normal: "border-l-green-500",
  low: "border-l-red-400",
  high: "border-l-red-500",
};

export const sugarBadgeColors: Record<SugarLevel, string> = {
  normal: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const sugarIconConfig: Record<SugarLevel, { icon: LucideIcon; className: string }> = {
  normal: { icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  low: { icon: AlertTriangle, className: "text-red-500" },
  high: { icon: AlertTriangle, className: "text-red-500" },
};

export function getSugarBadgeVariant(level: number): "default" | "destructive" {
  return getSugarLevel(level) === "normal" ? "default" : "destructive";
}

// ─── Blood Panel ──────────────────────────────────────────────────────────────

export type PanelLevel = "low" | "normal" | "borderline" | "high";

export function getPanelLevel(
  value: number | null,
  key: string,
): PanelLevel | null {
  if (value == null) return null;
  switch (key) {
    case "s_chol":
      return value >= 5.0 ? "high" : "normal";
    case "s_tag":
      return value >= 1.7 ? "high" : "normal";
    case "s_hdl":
      return value < 1.0 ? "low" : "normal";
    case "non_hdl":
      return value >= 4.0 ? "high" : "normal";
    case "s_ck":
      return value < 0.2 ? "low" : value > 2.27 ? "high" : "normal";
    case "b_hba1c_dc":
      return value >= 6.5 ? "high" : value >= 6.0 ? "borderline" : "normal";
    case "b_hba1c_if":
      return value >= 48 ? "high" : value >= 42 ? "borderline" : "normal";
    default:
      return null;
  }
}

export const panelBorderColors: Record<PanelLevel, string> = {
  low: "border-t-red-500",
  normal: "border-t-green-500",
  borderline: "border-t-amber-400",
  high: "border-t-red-500",
};

export const panelLevelColors: Record<PanelLevel, string> = {
  low: "text-red-600 dark:text-red-400",
  normal: "text-green-600 dark:text-green-400",
  borderline: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

export const panelStatusIcons: Record<PanelLevel, string> = {
  low: "▼",
  normal: "✓",
  borderline: "⚠",
  high: "▲",
};

export const panelStatusLabels: Record<PanelLevel, string> = {
  low: "Low",
  normal: "Normal",
  borderline: "Borderline",
  high: "High",
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const appointmentStatusBadgeColors: Record<AppointmentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const appointmentBorderColors: Record<AppointmentStatus, string> = {
  pending: "border-l-amber-400",
  confirmed: "border-l-blue-400",
  cancelled: "border-l-red-400",
  completed: "border-l-green-500",
};

/** Returns a CSS class for the card border based on how soon the appointment is. */
export function getAppointmentDateColor(
  dateStr: string,
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr);
  apptDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "opacity-60"; // past
  if (diffDays === 0) return "ring-2 ring-amber-400 ring-offset-2"; // today
  if (diffDays <= 3) return "ring-1 ring-blue-300"; // soon (1-3 days)
  return ""; // future
}

// ─── Trends ───────────────────────────────────────────────────────────────────

export const trendColors: Record<string, string> = {
  improved: "text-green-600",
  unchanged: "text-muted-foreground",
  worse: "text-red-600",
};

export const trendArrows: Record<string, string> = {
  improved: "↓ Better",
  unchanged: "→ Same",
  worse: "↑ Worse",
};
