"use client";

import { useEffect, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  // Check existing subscriptions on mount
  useEffect(() => {
    async function check() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user.id);

      setSubscriptionCount(count ?? 0);
      setIsSubscribed((count ?? 0) > 0);

      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    }
    check();
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof Notification === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    // Request permission
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
        return false;
      }

      // Subscribe to push
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save to database (dedup by endpoint)
      const subJson = pushSubscription.toJSON();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const endpoint = subJson.endpoint!;
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.user.id)
        .eq("endpoint", endpoint)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("push_subscriptions")
          .update({
            p256dh_key: (subJson.keys as { p256dh: string })?.p256dh ?? "",
            auth_key: (subJson.keys as { auth: string })?.auth ?? "",
            user_agent: navigator.userAgent,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("push_subscriptions").insert({
          user_id: user.user.id,
          endpoint,
          p256dh_key: (subJson.keys as { p256dh: string })?.p256dh ?? "",
          auth_key: (subJson.keys as { auth: string })?.auth ?? "",
          user_agent: navigator.userAgent,
        });
        if (error) throw error;
      }

      setSubscriptionCount((c) => c + 1);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      // Get all subscriptions from DB and remove them
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", user.user.id);

      // Unsubscribe from push manager
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      // Remove from DB
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.user.id);

      if (error) throw error;

      setSubscriptionCount(0);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      return false;
    }
  }, []);

  return {
    permission,
    isSubscribed,
    subscriptionCount,
    subscribe,
    unsubscribe,
    supported: permission !== "unsupported",
  };
}
