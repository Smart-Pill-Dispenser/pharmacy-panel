import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PHARMACY_SESSION_EXPIRED_EVENT } from "@/api/client";
import { toast } from "sonner";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { PatientsProvider } from "@/contexts/PatientsContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import DeviceDetail from "@/pages/DeviceDetail";
import Caregivers from "@/pages/Caregivers";
import CaregiverDetail from "@/pages/CaregiverDetail";
import Patients from "@/pages/Patients";
import PatientDetail from "@/pages/PatientDetail";
import AddPatient from "@/pages/AddPatient";
import HelpSupport from "@/pages/HelpSupport";
import LogsAnalytics from "@/pages/LogsAnalytics";
import NotFound from "@/pages/NotFound";

const LAST_ROUTE_KEY = "pharmacy_last_route";
const PUBLIC_PATHS = ["/login", "/forgot-password"];

/** Clears auth and returns to login when refresh fails or tokens are invalid. */
function SessionExpiredHandler() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      logout();
      toast.message("Session expired", { description: "Please sign in again." });
      navigate("/login", { replace: true });
    };
    window.addEventListener(PHARMACY_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(PHARMACY_SESSION_EXPIRED_EVENT, onExpired);
  }, [logout, navigate, queryClient]);

  return null;
}

function RouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Save current protected route synchronously during render.
  // This avoids losing the intended deep-link when ProtectedRoute redirects
  // to `/login` before `useEffect` runs on refresh.
  try {
    if (!PUBLIC_PATHS.includes(location.pathname)) {
      // Important: when the app is (re)loaded from `/`, we must not overwrite an
      // already-saved non-root route. Otherwise the restore logic below can't
      // send the user back to the screen they were on before refresh.
      const existing = sessionStorage.getItem(LAST_ROUTE_KEY);
      const next = location.pathname + location.search;

      if (location.pathname === "/") {
        // Only overwrite if we don't already have a saved deep link.
        if (existing === null || existing === "/") {
          sessionStorage.setItem(LAST_ROUTE_KEY, next);
        }
      } else {
        sessionStorage.setItem(LAST_ROUTE_KEY, next);
      }
    }
  } catch {
    // Non-fatal
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    const saved = sessionStorage.getItem(LAST_ROUTE_KEY);
    if (saved && saved !== "/" && location.pathname === "/") {
      navigate(saved, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return null;
}

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
  <>
  <SessionExpiredHandler />
  <RouteRestorer />
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="devices" element={<Devices />} />
      <Route path="devices/:id" element={<DeviceDetail />} />
      <Route path="caregivers" element={<Caregivers />} />
      <Route path="caregivers/:id" element={<CaregiverDetail />} />
      <Route path="patients" element={<Patients />} />
      <Route path="patients/:id" element={<PatientDetail />} />
      <Route path="patients/add" element={<AddPatient />} />
      <Route path="help-support" element={<HelpSupport />} />
      <Route path="logs" element={<LogsAnalytics />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <PatientsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </PatientsProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
