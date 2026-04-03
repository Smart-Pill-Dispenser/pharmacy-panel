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

/** Subscribes this browser to Web Push and registers with pharmacy-backend. No-op without VITE_WEB_PUSH_VAPID_PUBLIC_KEY. */
export async function tryRegisterPharmacyAlertWebPush(): Promise<void> {
  const vapid = (import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY as string | undefined)?.trim();
  if (!vapid || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  const secure = window.isSecureContext || window.location.hostname === "localhost";
  if (!secure) return;

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
