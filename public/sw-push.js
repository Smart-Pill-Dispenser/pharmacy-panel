/* global self */
self.addEventListener("push", (event) => {
  let payload = { title: "Alert", body: "" };
  try {
    const data = event.data?.json();
    if (data && typeof data === "object") {
      payload = {
        title: typeof data.title === "string" ? data.title : payload.title,
        body: typeof data.body === "string" ? data.body : "",
      };
    }
  } catch {
    /* ignore */
  }
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
