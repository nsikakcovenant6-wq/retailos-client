"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";

type HistoryRow = {
  sale_id: number;
  total_amount: string;
  created_at: string;
  items: Array<{ product_id: number; quantity: number; total: string }>;
};

export default function CustomersPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<(Customer & { purchase_history: HistoryRow[] }) | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      const data = await api<{ customers: Customer[] }>("/customers?store_id=" + id);
      setCustomers(data.customers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load customers");
    }
  }

  useEffect(() => { load(); }, [storeId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      await api("/customers", { method: "POST", json: { store_id: id, name, contact: contact || null } });
      setName("");
      setContact("");
      setMessage("Customer created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create customer");
    }
  }

  async function history(id: number) {
    try {
      const store = storeId;
      if (!store) throw new Error("No store is associated with this account");
      const data = await api<{ customer: Customer & { purchase_history: HistoryRow[] } }>(
        "/customers/history?id=" + id + "&store_id=" + store,
      );
      setSelected(data.customer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load customer history");
    }
  }

  return (
    <DashboardShell title="Customers">
      {message && <p className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_1fr_auto]">
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Customer name" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} className="field" placeholder="Phone / contact" />
        <button className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black">Add customer</button>
      </form>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">NAME</th><th className="px-3 py-3">CONTACT</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">ACTION</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-white/5">
                <td className="px-3 py-4">{customer.name}</td>
                <td className="px-3 py-4">{customer.contact || "—"}</td>
                <td className="px-3 py-4">#{customer.id}</td>
                <td className="px-3 py-4"><button onClick={() => history(customer.id)} className="rounded bg-white/10 px-2 py-1 text-xs">Purchase history</button></td>
              </tr>
            ))}
            {!customers.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-white/30">No customers yet.</td></tr>}
          </tbody>
        </table>
      </section>

      {selected && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-start justify-between">
            <div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-white/40">{selected.contact || "No contact"}</p></div>
            <button onClick={() => setSelected(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-5 space-y-3">
            {selected.purchase_history.map((sale) => (
              <article key={sale.sale_id} className="rounded-xl bg-white/5 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>Sale #{sale.sale_id}</span><span>₦{Number(sale.total_amount).toLocaleString()}</span><span className="text-xs text-white/35">{new Date(sale.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-white/40">{sale.items.map((item) => "Product #" + item.product_id + " × " + item.quantity).join(" • ")}</p>
              </article>
            ))}
            {!selected.purchase_history.length && <p className="text-sm text-white/30">No purchases recorded.</p>}
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
