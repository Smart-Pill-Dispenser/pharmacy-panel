import React, { createContext, useContext, useState, useCallback } from "react";

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
    return localStorage.getItem("pharmacy_auth") === "true";
  });
  const [user, setUser] = useState<AuthContextType["user"]>(() => {
    const stored = localStorage.getItem("pharmacy_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string) => {
    // Mock authentication
    await new Promise((r) => setTimeout(r, 800));
    const mockUser = { email, name: "Pharmacy Admin", role: "admin" };
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem("pharmacy_auth", "true");
    localStorage.setItem("pharmacy_user", JSON.stringify(mockUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("pharmacy_auth");
    localStorage.removeItem("pharmacy_user");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
