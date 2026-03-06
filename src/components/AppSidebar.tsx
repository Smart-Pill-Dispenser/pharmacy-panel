import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, localeLabels, supportedLocales, type AppLocale } from "@/contexts/LocaleContext";
import {
  LayoutDashboard,
  Pill,
  Monitor,
  Users,
  UserPlus,
  BarChart3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: UserPlus, label: "Patients" },
  { to: "/devices", icon: Monitor, label: "Devices" },
  { to: "/caregivers", icon: Users, label: "Caregivers" },
  { to: "/help-support", icon: HelpCircle, label: "Help & Support" },
  { to: "/logs", icon: BarChart3, label: "Logs & Analytics" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const { locale, setLocale } = useLocale();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[250px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Pill className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            Navos ZET
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-fg"
                  : "text-sidebar-fg hover:bg-sidebar-hover"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="px-1">
            <Select value={locale} onValueChange={(v) => setLocale(v as AppLocale)}>
              <SelectTrigger className="h-9 bg-sidebar border-sidebar-border text-sidebar-fg">
                <Languages className="h-4 w-4 shrink-0 mr-2" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {supportedLocales.map((code) => (
                  <SelectItem key={code} value={code}>
                    {localeLabels[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-muted truncate">{user.email}</p>
            <p className="text-xs text-sidebar-fg font-medium truncate">{user.name}</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-card shadow-card"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </aside>
  );
};

export default AppSidebar;
