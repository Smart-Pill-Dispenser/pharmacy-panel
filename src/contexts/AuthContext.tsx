import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { pharmacyApi } from "@/api/pharmacy";
import { tryRegisterPharmacyAlertWebPush } from "@/lib/alertWebPush";
import { cognitoUsernameFromIdToken, pharmacyTokenStorage } from "@/api/client";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem("pharmacy_auth") === "true";
    const access = localStorage.getItem("pharmacy_access_token");
    return auth && !!access;
  });
  const [user, setUser] = useState<AuthContextType["user"]>(() => {
    const stored = localStorage.getItem("pharmacy_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await pharmacyApi.login(email, password);
    const refreshToken = tokens.refreshToken;
    if (!refreshToken) throw new Error("Login failed: refresh token missing");
    // Backend `requirePharmacyPrincipal` reads `custom:pharmacyId` from JWT claims — those live on the ID token, not the access token.
    const bearer = (tokens.idToken ?? tokens.accessToken)?.trim();
    if (!bearer) throw new Error("Login failed: token missing");

    const poolUsername = cognitoUsernameFromIdToken(tokens.idToken);
    pharmacyTokenStorage.setTokens({
      email,
      accessToken: bearer,
      refreshToken,
      cognitoUsername: poolUsername,
    });

    setIsAuthenticated(true);
    localStorage.setItem("pharmacy_auth", "true");
    localStorage.setItem("pharmacy_user_email", email);

    // Populate sidebar profile (best-effort).
    try {
      const me = await pharmacyApi.me();
      const nextUser = {
        email: me.email ?? email,
        name: me.name ?? "Pharmacy Admin",
        role: me.role ?? "pharmacy",
      };
      setUser(nextUser);
      localStorage.setItem("pharmacy_user", JSON.stringify(nextUser));
    } catch {
      const fallbackUser = { email, name: "Pharmacy Admin", role: "pharmacy" };
      setUser(fallbackUser);
      localStorage.setItem("pharmacy_user", JSON.stringify(fallbackUser));
    }

    void tryRegisterPharmacyAlertWebPush();
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("pharmacy_auth");
    localStorage.removeItem("pharmacy_user");
    pharmacyTokenStorage.clear();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void tryRegisterPharmacyAlertWebPush();
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
