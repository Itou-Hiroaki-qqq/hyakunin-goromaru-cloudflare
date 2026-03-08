"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { uid: string; name: string; email: string };
      setUser({ uid: data.uid, name: data.name, email: data.email });
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}
