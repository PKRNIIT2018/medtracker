// Sends push notifications to users based on their reminder preferences.
// Triggered by Supabase Cron (pg_cron) every 15 minutes.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface PushSubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface UserSettingsRow {
  user_id: string;
  notifications_enabled: boolean;
  medication_reminder_enabled: boolean;
  sugar_reminder_enabled: boolean;
  water_reminder_enabled: boolean;
  reminder_window_start: string;
  reminder_window_end: string;
  notification_privacy?: string;
}

function isWithinWindow(current: string, start: string, end: string): boolean {
  return current >= start && current <= end;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://medtracker-azure.vercel.app";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("VAPID keys not configured");
    return new Response("VAPID keys not configured", { status: 500 });
  }

  webpush.setVapidDetails("mailto:notifications@medtracker.app", vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all users who have notifications enabled
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id, notifications_enabled, medication_reminder_enabled, sugar_reminder_enabled, water_reminder_enabled, reminder_window_start, reminder_window_end, notification_privacy")
    .eq("notifications_enabled", true);

  if (settingsError) {
    console.error("Error fetching user settings:", settingsError);
    return new Response("Error fetching settings", { status: 500 });
  }

  if (!settings || settings.length === 0) {
    return new Response("No users with notifications enabled", { status: 200 });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

  let sentCount = 0;
  let errorCount = 0;
  let cleanupCount = 0;

  for (const userSetting of settings as UserSettingsRow[]) {
    // Check if current time is within the reminder window
    if (!isWithinWindow(currentTime, userSetting.reminder_window_start, userSetting.reminder_window_end)) {
      continue;
    }

    // Get the user's push subscriptions
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh_key, auth_key")
      .eq("user_id", userSetting.user_id);

    if (subsError || !subs || subs.length === 0) {
      continue;
    }

    const pushSubs = subs as PushSubRow[];

    const isGeneric = userSetting.notification_privacy === "generic";

    const reminders: { title: string; body: string; tag: string; url: string }[] = [];

    // Stagger reminders so they don't all fire at once
    // Medication: top of window, Sugar: quarter past, Water: half past
    const minuteInWindow = minutesSinceMidnight % 60;

    if (userSetting.medication_reminder_enabled && minuteInWindow < 5) {
      reminders.push({
        title: isGeneric ? "📋 Reminder" : "💊 Medication Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Time to take your medication. Check your schedule for details.",
        tag: "medication-reminder",
        url: `${appBaseUrl}/medications`,
      });
    }

    if (userSetting.sugar_reminder_enabled && minuteInWindow >= 15 && minuteInWindow < 20) {
      reminders.push({
        title: isGeneric ? "📋 Reminder" : "🍬 Blood Sugar Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Time to check your blood sugar. Log your reading to track trends.",
        tag: "sugar-reminder",
        url: `${appBaseUrl}/blood-sugar`,
      });
    }

    if (userSetting.water_reminder_enabled && minuteInWindow >= 30 && minuteInWindow < 35) {
      reminders.push({
        title: isGeneric ? "📋 Reminder" : "💧 Water Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Stay hydrated! Log your water intake to meet your daily goal.",
        tag: "water-reminder",
        url: `${appBaseUrl}/water`,
      });
    }

    for (const reminder of reminders) {
      for (const sub of pushSubs) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          };

          await webpush.sendNotification(pushSubscription, JSON.stringify(reminder), {
            TTL: 86400,
          });
          sentCount++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          // 410 Gone = subscription expired/invalid
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            cleanupCount++;
          } else {
            console.error("Push send error:", err);
            errorCount++;
          }
        }
      }
    }
  }

  const result = { sent: sentCount, errors: errorCount, cleaned: cleanupCount };
  console.log("Reminder result:", result);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
