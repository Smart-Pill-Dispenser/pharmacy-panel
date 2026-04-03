import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import {
  isBrowserNotificationContextOk,
  startNotificationPermissionRequest,
  tryRegisterPharmacyAlertWebPush,
} from "@/lib/alertWebPush";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "pharmacy_notify_banner_dismissed_v1";

/**
 * Shown when Web Push is available but permission is still "default" (common after refresh or non-login entry).
 * "Allow" runs in a click handler so the browser will show the prompt.
 */
const NotificationPermissionBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!isBrowserNotificationContextOk()) return;
    if (Notification.permission !== "default") return;
    setVisible(true);
  }, []);

  const onEnable = useCallback(() => {
    const permissionPromise = startNotificationPermissionRequest();
    setBusy(true);
    void permissionPromise
      .then(() => tryRegisterPharmacyAlertWebPush())
      .finally(() => {
        setBusy(false);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "default") {
          setVisible(false);
        }
      });
  }, []);

  const onDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      )}
      role="region"
      aria-label={t("notifications.bannerAria")}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("notifications.bannerTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("notifications.bannerBody")}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onDismiss} disabled={busy}>
          {t("notifications.dismiss")}
        </Button>
        <Button type="button" size="sm" onClick={onEnable} disabled={busy}>
          {busy ? t("notifications.enabling") : t("notifications.enable")}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
