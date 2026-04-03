import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, LogOut } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import NotificationPermissionBanner from "@/components/NotificationPermissionBanner";

const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          collapsed ? "ml-[72px]" : "ml-[250px]"
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-3 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <span className="text-sm">
            <span className="font-semibold text-foreground">{t("layout.pharmacy")}</span>
            <span className="font-medium text-muted-foreground">{t("layout.panelSuffix")}</span>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("common.openProfileMenu")}>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 pb-2">
                <p className="text-sm font-medium text-foreground">{user?.name ?? t("common.pharmacyAdmin")}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role ?? "admin"}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-foreground focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="p-6">
          <NotificationPermissionBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
