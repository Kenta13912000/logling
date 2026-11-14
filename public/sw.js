/*
 * logling's service worker (pwa-reminder, ADR-0007). It only shows
 * reminders and opens the app when one is tapped. It has no fetch handler,
 * so it never keeps old pages: a new deployment is what opens (AC-20).
 * Registered only when someone turns reminders on in 設定.
 */

const FALLBACK = { title: "logling", body: "今日の日記を書こう", url: "/" };

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Only a path on this site; "//other.example" would be another site. */
function safeUrl(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//")
    ? url
    : "/";
}

function readMessage(data) {
  if (!data) {
    return FALLBACK;
  }
  try {
    const message = data.json();
    return {
      title: typeof message.title === "string" ? message.title : FALLBACK.title,
      body: typeof message.body === "string" ? message.body : FALLBACK.body,
      url: safeUrl(message.url),
    };
  } catch {
    return FALLBACK;
  }
}

self.addEventListener("push", (event) => {
  const message = readMessage(event.data);
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icons/icon-192.png",
      tag: "logling-reminder",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (open) {
        await open.focus();
        await open.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
