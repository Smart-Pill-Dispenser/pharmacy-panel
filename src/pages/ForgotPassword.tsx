import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pharmacyApi } from "@/api/pharmacy";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t("forgotPassword.errEmail"));
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await pharmacyApi.forgotPassword(email.trim());
      setMessage(t("forgotPassword.msgCodeSent"));
      setStep("reset");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || t("forgotPassword.errSendCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword || !confirmPassword) {
      setError(t("forgotPassword.errFillAll"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("forgotPassword.errMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await pharmacyApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setMessage(t("forgotPassword.msgSuccess"));
      await login(email.trim(), newPassword);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || t("forgotPassword.errReset"));
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
            {t("forgotPassword.hero")}
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            {t("forgotPassword.title")}
          </h2>
          <p className="mb-8 text-muted-foreground">
            {step === "request"
              ? t("forgotPassword.stepRequest")
              : t("forgotPassword.stepReset")}
          </p>

          {step === "request" ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t("forgotPassword.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@pharmacy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? t("forgotPassword.sending") : t("forgotPassword.sendCode")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t("forgotPassword.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t("forgotPassword.resetCodeLabel")}</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("forgotPassword.newPasswordLabel")}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? t("forgotPassword.hideNewPassword") : t("forgotPassword.showNewPassword")}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("forgotPassword.confirmPasswordLabel")}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? t("forgotPassword.hideConfirmPassword") : t("forgotPassword.showConfirmPassword")}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? t("forgotPassword.updating") : t("forgotPassword.resetSubmit")}
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            {t("forgotPassword.backTo")}{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t("forgotPassword.signInLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
