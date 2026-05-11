/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "@serwist/precaching";
import { installSerwist } from "@serwist/sw";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        revision: "1",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  let data: { title: string; body?: string; icon?: string; tag?: string; url?: string } = {
    title: "MedTracker",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.title = event.data.text() || "MedTracker";
    }
  }

  const options: NotificationOptions & Record<string, unknown> = {
    body: data.body ?? "Time for your health reminder",
    icon: data.icon ?? "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: data.tag ?? "medtracker-reminder",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});
