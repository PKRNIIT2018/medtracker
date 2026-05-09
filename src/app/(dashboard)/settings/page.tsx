"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Shield, Plus, Trash2, Calendar } from "lucide-react";
import bcrypt from "bcryptjs";
import { format } from "date-fns";

const supabase = createClient();

export default function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [apptOpen, setApptOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "" });

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").single();
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").is("deleted_at", null).order("appointment_date", { ascending: false }).limit(50);
      return data ?? [];
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

  const createAppointment = useMutation({
    mutationFn: async (values: typeof apptForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("appointments").insert({ ...values, user_id: user.user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment added"); setApptOpen(false); setApptForm({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "" }); },
    onError: (err) => toast.error(err.message),
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment removed"); },
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
        <p className="text-muted-foreground">Manage your profile, preferences and security</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Your details and doctor info</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input defaultValue={settings?.full_name ?? ""} placeholder="John Doe"
                  onBlur={(e) => updateSettings.mutate({ full_name: e.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>ID Card Number</Label>
                <Input defaultValue={settings?.id_card_number ?? ""} placeholder="e.g. A12345678"
                  onBlur={(e) => updateSettings.mutate({ id_card_number: e.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>Doctor&apos;s Name</Label>
                <Input defaultValue={settings?.doctor_name ?? ""} placeholder="Dr. Smith"
                  onBlur={(e) => updateSettings.mutate({ doctor_name: e.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea defaultValue={settings?.description ?? ""} placeholder="Allergies, conditions, notes for your doctor..." rows={4}
                  onBlur={(e) => updateSettings.mutate({ description: e.target.value || null })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Doctor Appointments</h2>
              <p className="text-sm text-muted-foreground">Schedule and track your visits</p>
            </div>
            <Dialog open={apptOpen} onOpenChange={setApptOpen}>
              <DialogTrigger className={buttonVariants({ variant: "default" })}>
                <Plus className="mr-2 h-4 w-4" />Add Appointment
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createAppointment.mutate(apptForm); }} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input required value={apptForm.title} onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })} placeholder="Follow-up visit" /></div>
                  <div className="space-y-2"><Label>Doctor Name</Label><Input value={apptForm.doctor_name} onChange={(e) => setApptForm({ ...apptForm, doctor_name: e.target.value })} placeholder="Dr. Smith" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date</Label><Input type="date" required value={apptForm.appointment_date} onChange={(e) => setApptForm({ ...apptForm, appointment_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Time</Label><Input type="time" value={apptForm.appointment_time} onChange={(e) => setApptForm({ ...apptForm, appointment_time: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Location</Label><Input value={apptForm.location} onChange={(e) => setApptForm({ ...apptForm, location: e.target.value })} placeholder="Room 101, City Hospital" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={apptForm.notes} onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })} rows={3} /></div>
                  <Button type="submit" className="w-full" disabled={createAppointment.isPending}>Save Appointment</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {!appointments?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No appointments scheduled.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-start justify-between py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{a.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{a.appointment_date}{a.appointment_time && ` ${a.appointment_time}`}</span>
                        {a.doctor_name && <span>{a.doctor_name}</span>}
                        {a.location && <span>{a.location}</span>}
                      </div>
                      {a.notes && <p className="text-xs text-muted-foreground pt-1">{a.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteAppointment.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
