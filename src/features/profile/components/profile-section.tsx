"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUserSettings, useSettingsMutation } from "@/features/settings/hooks";

export function ProfileSection() {
  const { data: settings } = useUserSettings();
  const updateSettings = useSettingsMutation();

  return (
    <Card>
      <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Your details and doctor info</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <div className="relative">
            <Input defaultValue={settings?.full_name ?? ""} placeholder="John Doe"
              onBlur={(e) => updateSettings.mutate({ full_name: e.target.value || null })} />
            {updateSettings.isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2">
          <Label>ID Card Number</Label>
          <div className="relative">
            <Input defaultValue={settings?.id_card_number ?? ""} placeholder="e.g. A12345678"
              onBlur={(e) => updateSettings.mutate({ id_card_number: e.target.value || null })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Doctor&apos;s Name</Label>
          <div className="relative">
            <Input defaultValue={settings?.doctor_name ?? ""} placeholder="Dr. Smith"
              onBlur={(e) => updateSettings.mutate({ doctor_name: e.target.value || null })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <div className="relative">
            <Textarea defaultValue={settings?.description ?? ""} placeholder="Allergies, conditions, notes for your doctor..." rows={4}
              onBlur={(e) => updateSettings.mutate({ description: e.target.value || null })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
