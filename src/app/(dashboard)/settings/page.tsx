"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/features/profile/components/profile-section";
import { PreferencesSection } from "@/features/preferences/components/preferences-section";
import { NotificationsSection } from "@/features/notifications/components/notifications-section";
import { SecuritySection } from "@/features/security/components/security-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your profile, preferences and security</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="general" className="space-y-6 pt-4">
          <PreferencesSection />
          <NotificationsSection />
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pt-4">
          <SecuritySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
