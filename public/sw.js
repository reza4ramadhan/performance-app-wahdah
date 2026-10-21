// Service worker IKP Pegawai WI: web push + syarat PWA (bisa dipasang di Home Screen).
// Sengaja tidak menyimpan halaman di cache: data selalu dari server; draf luring dikelola form + Catat.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Fetch handler minimal agar memenuhi kriteria "installable" di Chromium.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "IKP Pegawai WI", {
      body: data.body || "",
      icon: "/ikon-192.png",
      badge: "/ikon-192.png",
      tag: data.tag || "ikp",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
