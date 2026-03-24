import React, { createContext, useContext, useState, useCallback } from "react";
import { pharmacyApi } from "@/api/pharmacy";
import { pharmacyTokenStorage } from "@/api/client";

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
    const accessToken = tokens.idToken ?? tokens.accessToken;
    const refreshToken = tokens.refreshToken;
    if (!accessToken) throw new Error("Login failed: access token missing");
    if (!refreshToken) throw new Error("Login failed: refresh token missing");

    pharmacyTokenStorage.setTokens({ email, accessToken, refreshToken });

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

    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("pharmacy_auth");
    localStorage.removeItem("pharmacy_user");
    pharmacyTokenStorage.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
