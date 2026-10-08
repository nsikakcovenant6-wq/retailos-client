"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import {formatNigeriaDateTime} from "@/lib/nigeria-time";

type Role = "admin" | "manager" | "employee";
type SessionUser = { id: string; username: string; fullName: string; role: string };
type Data = {
  stats: { todaySales: number | string; todayTransactions: number; count: number; units: number };
  lowStock: { id: string; name: string; stockQuantity: number }[];
  recent: { receiptNo: string; amount: number | string; payment: string; status: string; createdAt: string; employeeName: string }[];
  activity: { action: string; entity: string; createdAt: string; userName: string }[];
};

export default function LiveDashboard({ role, user, title }: { role: Role; user: string; title: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [loading,setLoading]=useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load dashboard");
        return result as Data;
      }),
      fetch("/api/auth/me").then(async (response) => {
        const result = await response.json();
        return result.user as SessionUser | null;
      }),
    ])
      .then(([dashboard, currentUser]) => {
        setData(dashboard);
        setSessionUser(currentUser);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load dashboard")).finally(()=>setLoading(false));
  }, []);

  const displayUser = sessionUser?.fullName || user;
  const money = (value: number | string) => `₦${Number(value).toLocaleString()}`;

  return (
    <DashboardShell role={role} user={displayUser} title={title}>
      {loading&&<p role="status" className="mb-4 text-sm text-white/75">Connecting to your store and loading live data. This may take a moment.</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Today's Sales" value={money(data?.stats.todaySales || 0)} />
        <Metric title="Transactions" value={String(data?.stats.todayTransactions || 0)} />
        <Metric title="Products" value={String(data?.stats.count || 0)} />
        <Metric title="Stock Units" value={String(data?.stats.units || 0)} />
      </div>
      {error && <p className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title={role === "employee" ? "Alerts" : "Store Health"}>
          {data?.lowStock.length ? (
            <div className="space-y-2">
              {data.lowStock.map((product) => (
                <div key={product.id} className="flex justify-between rounded-lg bg-orange-500/5 p-3 text-sm">
                  <span>{product.name}</span>
                  <span className="text-orange-400">{product.stockQuantity} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-white/40">No low-stock alerts.</p>}
        </Section>
        <Section title="Quick Actions">
          <div className="flex flex-wrap gap-3">
            <Link href="/sales" className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black">+ Add Sale</Link>
            {role !== "employee" && <Link href="/purchases" className="rounded-xl bg-white/10 px-4 py-3 text-sm">+ Add Purchase</Link>}
            {role === "admin" && <Link href="/users" className="rounded-xl bg-white/10 px-4 py-3 text-sm">+ Add User</Link>}
          </div>
        </Section>
        <Section title="Recent Transactions" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-white/40"><tr>{["DATE", "REF", "AMOUNT", "PAYMENT", "STATUS", "STAFF"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
              <tbody>
                {data?.recent.length ? data.recent.map((transaction) => (
                  <tr key={transaction.receiptNo} className="border-t border-white/5">
                    <td className="px-3 py-3">{formatNigeriaDateTime(transaction.createdAt)}</td>
                    <td className="px-3 py-3">{transaction.receiptNo}</td>
                    <td className="px-3 py-3">{money(transaction.amount)}</td>
                    <td className="px-3 py-3">{transaction.payment}</td>
                    <td className="px-3 py-3">{transaction.status}</td>
                    <td className="px-3 py-3">{transaction.employeeName}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="px-3 py-10 text-center text-white/30">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
        {role !== "employee" && <Section title="Activity Feed">
          <div className="space-y-2">
            {data?.activity.length ? data.activity.map((item, index) => (
              <div key={`${item.createdAt}-${index}`} className="flex justify-between rounded-lg bg-white/5 p-3 text-sm">
                <span>{item.userName} · {item.action} {item.entity.toLowerCase()}</span>
                <span className="text-white/30">{formatNigeriaDateTime(item.createdAt)}</span>
              </div>
            )) : <p className="text-sm text-white/40">No activity yet.</p>}
          </div>
        </Section>}
      </div>
    </DashboardShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#151515] p-5"><p className="text-xs text-white/40">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#151515] p-5 ${className}`}><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>;
}
