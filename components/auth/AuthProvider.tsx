"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_PATHS = ["/login", "/register"];

function Loader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-white">
      <div className="text-center">
        <p className="text-lg font-semibold">TX <span className="text-orange-500">RetailOS</span></p>
        <p className="mt-2 text-sm text-white/40">Checking your session…</p>
      </div>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!isPublic);

  async function refresh() {
    try {
      const data = await api<{ user: User }>("/auth/me");
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 401) router.replace("/login");
      return null;
    }
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }

  useEffect(() => {
    if (isPublic) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pathname, isPublic]);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);

  if (!isPublic && loading) return <Loader />;
  if (!isPublic && !user) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
