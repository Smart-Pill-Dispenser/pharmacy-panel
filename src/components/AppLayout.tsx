import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { cn } from "@/lib/utils";

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          collapsed ? "ml-[72px]" : "ml-[250px]"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
