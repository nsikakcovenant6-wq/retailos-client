"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { api } from "@/lib/api";
import type { DashboardStats, DailyBrief, DailySummary, SaleSummary } from "@/lib/types";

export default function LiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ user: { store_id: number | null } }>("/auth/me");
        if (!me.user.store_id) throw new Error("No store is associated with this account");
        const id = me.user.store_id;

        const [dashboard, dailySummary, dailyBrief, salesData] = await Promise.all([
          api<DashboardStats>("/dashboard?store_id=" + id),
          api<DailySummary>("/dashboard/daily-summary?store_id=" + id),
          api<DailyBrief>("/dashboard/daily-brief?store_id=" + id),
          api<{ sales: SaleSummary[] }>("/sales?store_id=" + id),
        ]);

        setStats(dashboard);
        setSummary(dailySummary);
        setBrief(dailyBrief);
        setSales(salesData.sales.slice(0, 5));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const money = (value: string | number) => "₦" + Number(value).toLocaleString();

  return (
    <DashboardShell title="Dashboard">
      {error && <p className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {loading ? (
        <p className="py-16 text-center text-white/30">Loading store data…</p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Today's sales" value={money(stats?.today_sales_total || 0)} />
            <Metric title="Today's transactions" value={String(stats?.today_sales_count || 0)} />
            <Metric title="Products" value={String(stats?.products_count || 0)} />
            <Metric title="Open alerts" value={String(stats?.open_alerts_count || 0)} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <h2 className="font-semibold">Daily summary</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Stat label="Sales count" value={summary?.sales_count ?? 0} />
                <Stat label="Total sales" value={money(summary?.total_sales || 0)} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <h2 className="font-semibold">Sales direction</h2>
              <p className="mt-4 text-3xl font-semibold">{brief?.sales.status || "STEADY"}</p>
              <p className="mt-2 text-sm text-white/40">
                {brief?.sales.change_percent || "0.00"}% compared with yesterday
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <h2 className="font-semibold">Daily brief</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Stat label="Yesterday" value={money(brief?.sales.yesterday_total || 0)} />
                <Stat
                  label="High performer"
                  value={brief?.insights.high_performer
                    ? brief.insights.high_performer.product_name + " · " + brief.insights.high_performer.units_sold + " units"
                    : "No sales insight yet"}
                />
                <Stat
                  label="Declining product"
                  value={brief?.insights.declining_product?.product_name || "None identified"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <h2 className="font-semibold">Restock recommendations</h2>
              <div className="mt-4 space-y-2">
                {brief?.insights.restock_recommendations.length ? brief.insights.restock_recommendations.map((item) => (
                  <div key={item.product_id} className="flex justify-between rounded-lg bg-white/5 p-3 text-sm">
                    <span>{item.product_name}</span>
                    <span className="text-orange-400">
                      {item.stock_quantity} / {item.low_stock_threshold}
                    </span>
                  </div>
                )) : <p className="text-sm text-white/30">No restock recommendations.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#151515] p-5 lg:col-span-2">
              <h2 className="font-semibold">Recent transactions</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-white/40">
                    <tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">SALE</th><th className="px-3 py-3">TOTAL</th></tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-t border-white/5">
                        <td className="px-3 py-3">{new Date(sale.created_at).toLocaleString()}</td>
                        <td className="px-3 py-3">#{sale.id}</td>
                        <td className="px-3 py-3">{money(sale.total_amount)}</td>
                      </tr>
                    ))}
                    {!sales.length && <tr><td colSpan={3} className="px-3 py-10 text-center text-white/30">No transactions yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#151515] p-5"><p className="text-xs text-white/40">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
