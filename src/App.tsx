import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import DeviceDetail from "@/pages/DeviceDetail";
import Caregivers from "@/pages/Caregivers";
import BulkUpload from "@/pages/BulkUpload";
import HelpSupport from "@/pages/HelpSupport";
import LogsAnalytics from "@/pages/LogsAnalytics";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="devices" element={<Devices />} />
      <Route path="devices/:id" element={<DeviceDetail />} />
      <Route path="caregivers" element={<Caregivers />} />
      <Route path="bulk-upload" element={<BulkUpload />} />
      <Route path="help-support" element={<HelpSupport />} />
      <Route path="logs" element={<LogsAnalytics />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
