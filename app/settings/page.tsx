"use client";

import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiUrl } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const [message, setMessage] = useState("");

  async function checkSession() {
    const current = await refresh();
    setMessage(current ? "Server session is active." : "Server session is no longer active.");
  }

  return (
    <DashboardShell title="Settings">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Account</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Username" value={user?.username || "—"} />
            <Row label="Email" value={user?.email || "—"} />
            <Row label="Store" value={user?.store_name || "—"} />
            <Row label="Store ID" value={String(user?.store_id ?? "—")} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Server connection</h2>
          <p className="mt-3 break-all text-sm text-white/40">{getApiUrl()}</p>
          <button onClick={checkSession} className="mt-5 rounded-xl bg-white/10 px-4 py-2 text-sm">Check server session</button>
          <button onClick={logout} className="mt-3 block rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">Sign out</button>
          {message && <p className="mt-4 text-sm text-orange-300">{message}</p>}
        </section>
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 rounded-lg bg-white/5 p-3"><span className="text-white/40">{label}</span><span className="text-right">{value}</span></div>;
}
