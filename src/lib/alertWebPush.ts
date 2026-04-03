import { pharmacyApi } from "@/api/pharmacy";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function vapidPublicKey(): string {
  return (import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? "";
}

function loopbackHost(): boolean {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** HTTPS, localhost, or loopback — required for Notification / Push in Chromium. */
export function isBrowserNotificationContextOk(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || loopbackHost();
}

/** True when VAPID + SW + Push exist and context is OK (permission may still be default). */
export function isWebPushSupportedInBrowser(): boolean {
  if (!isBrowserNotificationContextOk()) return false;
  if (!vapidPublicKey()) return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Call synchronously from a click/submit handler (same synchronous turn as the event).
 * Do not wrap in another `async` function before calling this — otherwise the prompt is often suppressed.
 */
export function startNotificationPermissionRequest(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  try {
    return Notification.requestPermission();
  } catch {
    return Promise.resolve(Notification.permission);
  }
}

function notificationGranted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

/** Subscribes this browser to Web Push and registers with pharmacy-backend. No-op without VITE_WEB_PUSH_VAPID_PUBLIC_KEY or if permission not granted. */
export async function tryRegisterPharmacyAlertWebPush(): Promise<void> {
  const vapid = vapidPublicKey();
  if (!vapid || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  if (!isBrowserNotificationContextOk()) return;
  if (!notificationGranted()) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw-push.js");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return;
    await pharmacyApi.registerAlertNotifications({
      webPush: { endpoint, keys: { p256dh, auth } },
    });
  } catch {
    /* best-effort */
  }
}
