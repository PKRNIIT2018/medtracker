"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useUserSettings, useSettingsMutation } from "@/features/settings/hooks";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationsSection() {
  const { data: settings } = useUserSettings();
  const updateSettings = useSettingsMutation();
  const push = usePushNotifications();

  return (
    <Card>
      <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Configure reminders</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Notifications</Label>
            {push.supported && (
              <p className="text-xs text-muted-foreground">
                {push.permission === "granted" ? "Browser notifications enabled" :
                 push.permission === "denied" ? "Blocked — update browser settings" :
                 push.permission === "default" ? "Not yet allowed" : ""}
              </p>
            )}
          </div>
          <Switch
            checked={settings?.notifications_enabled ?? true}
            onCheckedChange={async (v) => {
              if (v) {
                const ok = await push.subscribe();
                if (ok) {
                  updateSettings.mutate({ notifications_enabled: true });
                } else {
                  toast.error("Could not enable notifications. Check your browser permissions.");
                }
              } else {
                await push.unsubscribe();
                updateSettings.mutate({ notifications_enabled: false });
              }
            }}
          />
        </div>
        {settings?.notifications_enabled && (
          <>
            <div className="border-t pt-4 space-y-4">
              {[
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
            </div>
            <div className="border-t pt-4 space-y-2">
              <Label>Notification Content</Label>
              <p className="text-xs text-muted-foreground">Choose how much detail appears in notifications on your lock screen</p>
              <Select defaultValue={settings?.notification_privacy ?? "detailed"}
                onValueChange={(v) => v && updateSettings.mutate({ notification_privacy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">Detailed (shows health info)</SelectItem>
                  <SelectItem value="generic">Generic (hides health details)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
