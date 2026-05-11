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

function log(event: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...meta, timestamp: new Date().toISOString() }));
}

function logError(event: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error
    ? { message: error.message, name: error.name }
    : { message: String(error) };
  console.error(JSON.stringify({ event, error: err, ...meta, timestamp: new Date().toISOString() }));
}

function isWithinWindow(current: string, start: string, end: string): boolean {
  return current >= start && current <= end;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const appBaseUrl = Deno.env.get("APP_BASE_URL");

  if (!appBaseUrl) {
    logError("config_missing", new Error("APP_BASE_URL not set"));
    return new Response("APP_BASE_URL not configured", { status: 500 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    logError("config_missing", new Error("VAPID keys not configured"));
    return new Response("VAPID keys not configured", { status: 500 });
  }

  webpush.setVapidDetails("mailto:notifications@medtracker.app", vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id, notifications_enabled, medication_reminder_enabled, sugar_reminder_enabled, water_reminder_enabled, reminder_window_start, reminder_window_end, notification_privacy")
    .eq("notifications_enabled", true);

  if (settingsError) {
    logError("fetch_settings_error", settingsError);
    return new Response("Error fetching settings", { status: 500 });
  }

  if (!settings || settings.length === 0) {
    log("no_eligible_users");
    return new Response("No users with notifications enabled", { status: 200 });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

  let sentCount = 0;
  let errorCount = 0;
  let cleanupCount = 0;
  let duplicateCount = 0;

  for (const userSetting of settings as UserSettingsRow[]) {
    if (!isWithinWindow(currentTime, userSetting.reminder_window_start, userSetting.reminder_window_end)) {
      continue;
    }

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh_key, auth_key")
      .eq("user_id", userSetting.user_id);

    if (subsError || !subs || subs.length === 0) {
      continue;
    }

    const pushSubs = subs as PushSubRow[];
    const isGeneric = userSetting.notification_privacy === "generic";
    const minuteInWindow = minutesSinceMidnight % 60;

    const reminders: { type: string; title: string; body: string; tag: string; url: string }[] = [];

    if (userSetting.medication_reminder_enabled && minuteInWindow < 5) {
      reminders.push({
        type: "medication",
        title: isGeneric ? "Reminder" : "Medication Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Time to take your medication. Check your schedule for details.",
        tag: "medication-reminder",
        url: `${appBaseUrl}/medications`,
      });
    }

    if (userSetting.sugar_reminder_enabled && minuteInWindow >= 15 && minuteInWindow < 20) {
      reminders.push({
        type: "sugar",
        title: isGeneric ? "Reminder" : "Blood Sugar Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Time to check your blood sugar. Log your reading to track trends.",
        tag: "sugar-reminder",
        url: `${appBaseUrl}/blood-sugar`,
      });
    }

    if (userSetting.water_reminder_enabled && minuteInWindow >= 30 && minuteInWindow < 35) {
      reminders.push({
        type: "water",
        title: isGeneric ? "Reminder" : "Water Reminder",
        body: isGeneric ? "You have a pending reminder. Check the app for details." : "Stay hydrated! Log your water intake to meet your daily goal.",
        tag: "water-reminder",
        url: `${appBaseUrl}/water`,
      });
    }

    for (const reminder of reminders) {
      const { count: recentCount, error: dedupError } = await supabase
        .from("reminder_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userSetting.user_id)
        .eq("reminder_type", reminder.type)
        .eq("status", "sent")
        .gte("sent_at", new Date(now.getTime() - 25 * 60_000).toISOString());

      if (dedupError) {
        logError("dedup_check_error", dedupError, { userId: userSetting.user_id, type: reminder.type });
      }

      if (recentCount && recentCount > 0) {
        duplicateCount++;
        await supabase.from("reminder_log").insert({
          user_id: userSetting.user_id,
          reminder_type: reminder.type,
          status: "duplicate",
        });
        continue;
      }

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

          await supabase.from("reminder_log").insert({
            user_id: userSetting.user_id,
            reminder_type: reminder.type,
            status: "sent",
            push_subscription_id: sub.id,
          });
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;

          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            cleanupCount++;

            await supabase.from("reminder_log").insert({
              user_id: userSetting.user_id,
              reminder_type: reminder.type,
              status: "failed",
              push_subscription_id: sub.id,
              error_message: `Push subscription expired (${statusCode})`,
            });
          } else {
            errorCount++;
            logError("push_send_error", err, { userId: userSetting.user_id, type: reminder.type, subId: sub.id });

            await supabase.from("reminder_log").insert({
              user_id: userSetting.user_id,
              reminder_type: reminder.type,
              status: "failed",
              push_subscription_id: sub.id,
              error_message: String(err),
            });
          }
        }
      }
    }
  }

  const result = { sent: sentCount, errors: errorCount, cleaned: cleanupCount, duplicates: duplicateCount };
  log("reminder_run_complete", result);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
