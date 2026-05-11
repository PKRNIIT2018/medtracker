"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserSettings, useSettingsMutation } from "@/features/settings/hooks";

export function PreferencesSection() {
  const { data: settings } = useUserSettings();
  const updateSettings = useSettingsMutation();
  const { theme, setTheme } = useTheme();

  return (
    <>
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
    </>
  );
}
