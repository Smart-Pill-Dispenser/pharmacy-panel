import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { startNotificationPermissionRequest } from "@/lib/alertWebPush";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Pill } from "lucide-react";

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login.errBoth"));
      return;
    }
    // Must run in the same synchronous turn as submit — not inside a nested async task.
    const permissionPromise = startNotificationPermissionRequest();
    setLoading(true);
    setError("");
    try {
      await permissionPromise;
      await login(email, password);
    } catch {
      setError(t("login.errFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Pill className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-primary-foreground tracking-tight">
            {t("app.brand")}
          </h1>
          <p className="text-lg text-sidebar-fg/70">
            {t("login.hero")}
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-3 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{t("app.brand")}</span>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">{t("login.welcomeBack")}</h2>
          <p className="mb-8 text-muted-foreground">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@pharmacy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.passwordLabel")}</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
