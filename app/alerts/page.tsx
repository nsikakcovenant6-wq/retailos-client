"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Alert } from "@/lib/types";

export default function AlertsPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      const data = await api<{ alerts: Alert[] }>("/alerts?store_id=" + id);
      setAlerts(data.alerts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load alerts");
    }
  }

  useEffect(() => { load(); }, [storeId]);

  async function generate() {
    if (!storeId) return;
    try {
      await api("/alerts/generate-low-stock?store_id=" + storeId, { method: "POST" });
      setMessage("Low-stock alerts generated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate alerts");
    }
  }

  async function resolve(id: number) {
    if (!storeId) return;
    try {
      await api("/alerts/resolve?store_id=" + storeId + "&id=" + id, { method: "POST" });
      setMessage("Alert resolved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resolve alert");
    }
  }

  async function remove(id: number) {
    if (!storeId || !confirm("Delete this alert?")) return;
    try {
      await api("/alerts/delete?store_id=" + storeId + "&id=" + id, { method: "DELETE" });
      setMessage("Alert deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete alert");
    }
  }

  return (
    <DashboardShell title="Alerts">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-white/40">Open alerts from the server.</p>
        <button onClick={generate} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-black">Generate low-stock alerts</button>
      </div>
      {message && <p className="mt-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="mt-6 space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-xs uppercase text-orange-400">{alert.type}</p>
                <p className="mt-2">{alert.message}</p>
                <p className="mt-2 text-xs text-white/30">Product {alert.product_id ? "#" + alert.product_id : "—"} · {new Date(alert.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-4 text-sm"><button onClick={() => resolve(alert.id)} className="text-green-400">Resolve</button><button onClick={() => remove(alert.id)} className="text-red-300">Delete</button></div>
            </div>
          </article>
        ))}
        {!alerts.length && <div className="rounded-2xl border border-white/10 bg-[#151515] p-10 text-center text-white/30">No open alerts.</div>}
      </div>
    </DashboardShell>
  );
}
