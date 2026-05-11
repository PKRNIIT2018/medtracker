import { describe, it, expect } from "vitest";
import { validateSettingsFields } from "@/lib/settings-validation";

describe("validateSettingsFields", () => {
  it("allows known profile fields", () => {
    const result = validateSettingsFields({ full_name: "John" });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toEqual({ full_name: "John" });
    expect(result.rejected).toEqual([]);
  });

  it("allows multiple known fields", () => {
    const result = validateSettingsFields({
      full_name: "John",
      sugar_unit: "mmol/L",
      daily_water_goal_ml: 2500,
    });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toHaveProperty("full_name", "John");
    expect(result.allowed).toHaveProperty("sugar_unit", "mmol/L");
    expect(result.allowed).toHaveProperty("daily_water_goal_ml", 2500);
    expect(result.rejected).toEqual([]);
  });

  it("rejects sensitive PIN fields", () => {
    const result = validateSettingsFields({
      app_pin_hash: "somehash",
      full_name: "John",
    });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toEqual({ full_name: "John" });
    expect(result.rejected).toContain("app_pin_hash");
  });

  it("rejects both sensitive PIN fields", () => {
    const result = validateSettingsFields({
      app_pin_hash: "hash",
      app_pin_enabled: true,
    });
    expect(result.hasValidFields).toBe(false);
    expect(result.allowed).toEqual({});
    expect(result.rejected).toContain("app_pin_hash");
    expect(result.rejected).toContain("app_pin_enabled");
  });

  it("rejects unknown fields", () => {
    const result = validateSettingsFields({
      some_unknown_field: "value",
      full_name: "John",
    });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toEqual({ full_name: "John" });
    expect(result.rejected).toContain("some_unknown_field");
  });

  it("returns no valid fields when only rejected fields are sent", () => {
    const result = validateSettingsFields({
      app_pin_hash: "hash",
      malicious_field: "value",
    });
    expect(result.hasValidFields).toBe(false);
    expect(result.allowed).toEqual({});
    expect(result.rejected.length).toBe(2);
  });

  it("handles empty input", () => {
    const result = validateSettingsFields({});
    expect(result.hasValidFields).toBe(false);
    expect(result.allowed).toEqual({});
    expect(result.rejected).toEqual([]);
  });

  it("allows boolean fields", () => {
    const result = validateSettingsFields({ notifications_enabled: false });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toEqual({ notifications_enabled: false });
  });

  it("allows null values for nullable fields", () => {
    const result = validateSettingsFields({ doctor_name: null });
    expect(result.hasValidFields).toBe(true);
    expect(result.allowed).toEqual({ doctor_name: null });
  });

  it("allows all known fields without rejection", () => {
    const result = validateSettingsFields({
      full_name: "A",
      id_card_number: "B",
      doctor_name: "C",
      description: "D",
      theme: "dark",
      daily_water_goal_ml: 2000,
      sugar_unit: "mg/dL",
      notifications_enabled: true,
      medication_reminder_enabled: true,
      sugar_reminder_enabled: false,
      water_reminder_enabled: true,
      notification_privacy: "private",
      reminder_window_start: "08:00",
      reminder_window_end: "22:00",
    });
    expect(result.hasValidFields).toBe(true);
    expect(result.rejected).toEqual([]);
    expect(Object.keys(result.allowed).length).toBe(14);
  });
});
