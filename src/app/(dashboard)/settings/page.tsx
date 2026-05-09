"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Shield } from "lucide-react";
import bcrypt from "bcryptjs";

const supabase = createClient();

export default function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").single();
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("user_settings").update(values).eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-settings"] }); toast.success("Settings saved"); },
    onError: (err) => toast.error(err.message),
  });

  async function handleSetPin() {
    if (pinCode.length !== 4 || pinCode !== pinConfirm) {
      toast.error("PIN must be 4 digits and match confirmation");
      return;
    }
    const hash = await bcrypt.hash(pinCode, 10);
    updateSettings.mutate({ app_pin_hash: hash, app_pin_enabled: true });
    setPinCode(""); setPinConfirm("");
  }

  async function handleDisablePin() {
    updateSettings.mutate({ app_pin_hash: null, app_pin_enabled: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and security</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose your theme preference</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: "light", icon: Sun },
                  { value: "dark", icon: Moon },
                  { value: "system", icon: Monitor },
                ].map(({ value, icon: Icon }) => (
                  <Button key={value} variant={theme === value ? "default" : "outline"} className="flex-1" onClick={() => { setTheme(value); updateSettings.mutate({ theme: value }); }}>
                    <Icon className="mr-2 h-4 w-4" />{value.charAt(0).toUpperCase() + value.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Health Goals</CardTitle><CardDescription>Set your daily targets</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Daily Water Goal (ml)</Label>
                <Input type="number" defaultValue={settings?.daily_water_goal_ml ?? 2000}
                  onBlur={(e) => updateSettings.mutate({ daily_water_goal_ml: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Sugar Unit</Label>
                <Select defaultValue={settings?.sugar_unit ?? "mg/dL"}
                  onValueChange={(v) => v && updateSettings.mutate({ sugar_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg/dL">mg/dL</SelectItem>
                    <SelectItem value="mmol/L">mmol/L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Configure reminders</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "notifications_enabled", label: "Enable Notifications" },
                { key: "medication_reminder_enabled", label: "Medication Reminders" },
                { key: "sugar_reminder_enabled", label: "Blood Sugar Reminders" },
                { key: "water_reminder_enabled", label: "Water Reminders" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch defaultChecked={settings?.[key as keyof typeof settings] as boolean ?? true}
                    onCheckedChange={(v) => updateSettings.mutate({ [key]: v })} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Reminder Window Start</Label>
                  <Input type="time" defaultValue={settings?.reminder_window_start ?? "08:00"}
                    onBlur={(e) => updateSettings.mutate({ reminder_window_start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Window End</Label>
                  <Input type="time" defaultValue={settings?.reminder_window_end ?? "22:00"}
                    onBlur={(e) => updateSettings.mutate({ reminder_window_end: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle>App PIN</CardTitle><CardDescription>Set a 4-digit PIN for quick access</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {settings?.app_pin_enabled ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">PIN is currently enabled.</p>
                  <Button variant="destructive" onClick={handleDisablePin}>Disable PIN</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>PIN Code</Label><Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*" value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))} /></div>
                    <div className="space-y-2"><Label>Confirm PIN</Label><Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))} /></div>
                  </div>
                  <Button onClick={handleSetPin}>Set PIN</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Passkeys & MFA</CardTitle><CardDescription>Biometric and multi-factor authentication</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Passkeys and TOTP MFA are managed through Supabase. Use your browser's
                passkey registration or an authenticator app for MFA.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  try {
                    const { error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
                    if (error) toast.error(error.message);
                    else toast.success("MFA enrollment started — check your authenticator app");
                  } catch { toast.error("MFA not available"); }
                }}>
                  <Shield className="mr-2 h-4 w-4" />Enroll MFA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
