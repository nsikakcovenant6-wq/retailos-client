"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer, Product, Receipt, SaleSummary } from "@/lib/types";

type CartItem = { product: Product; quantity: number };

export default function SalesPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");

      const [p, c, s] = await Promise.all([
        api<{ products: Product[] }>("/product/list?store_id=" + id),
        api<{ customers: Customer[] }>("/customers?store_id=" + id),
        api<{ sales: SaleSummary[] }>("/sales?store_id=" + id),
      ]);

      setProducts(p.products);
      setCustomers(c.customers);
      setSales(s.sales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [storeId]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart]);

  function add(product: Product) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
          : item);
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function change(productId: number, delta: number) {
    setCart((items) => items.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const quantity = item.quantity + delta;
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.product.stock_quantity) }];
    }));
  }

  async function createSale() {
    if (!storeId || !cart.length) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const data = await api<{ receipt: Receipt }>("/sales", {
        method: "POST",
        json: {
          store_id: storeId,
          customer_id: customerId ? Number(customerId) : null,
          client_transaction_id: crypto.randomUUID(),
          items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        },
      });
      setReceipt(data.receipt);
      setMessage("Sale #" + data.receipt.sale_id + " completed.");
      setCart([]);
      setCustomerId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function details(id: number) {
    if (!storeId) return;
    try {
      const data = await api<{ receipt: Receipt }>("/sales/get?id=" + id + "&store_id=" + storeId);
      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sale");
    }
  }

  async function generateReceipt(id: number) {
    if (!storeId) return;
    try {
      const data = await api<{ receipt: Receipt }>("/sales/receipt", {
        method: "POST",
        json: { id, store_id: storeId },
      });
      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate receipt");
    }
  }

  return (
    <DashboardShell title="Sales">
      {message && <p className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">Products</h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="field max-w-sm" placeholder="Search products…" />
          </div>
          {loading ? <p className="py-12 text-center text-white/30">Loading…</p> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.id} className="rounded-xl border border-white/10 bg-[#101010] p-4">
                  <p className="text-xs text-white/35">#{product.id}</p>
                  <h3 className="mt-1 font-medium">{product.name}</h3>
                  <p className="mt-2 text-orange-400">₦{Number(product.price).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-white/35">{product.stock_quantity} in stock</p>
                  <button disabled={!product.stock_quantity} onClick={() => add(product)} className="mt-4 w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:bg-white/10 disabled:text-white/30">
                    {product.stock_quantity ? "Add to cart" : "Out of stock"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Checkout</h2>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs text-white/40">Customer (optional)</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field">
              <option value="">Walk-in customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>

          <div className="mt-5 space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="rounded-lg bg-white/5 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>{item.product.name}</span>
                  <span>₦{(Number(item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => change(item.product.id, -1)} className="rounded bg-white/10 px-2">−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => change(item.product.id, 1)} className="rounded bg-white/10 px-2">+</button>
                </div>
              </div>
            ))}
            {!cart.length && <p className="py-8 text-center text-sm text-white/30">Cart is empty.</p>}
          </div>

          <div className="my-5 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span><strong>₦{total.toLocaleString()}</strong>
          </div>
          <button disabled={!cart.length || submitting} onClick={createSale} className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-black disabled:bg-white/10 disabled:text-white/30">
            {submitting ? "Processing…" : "Complete sale"}
          </button>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 className="font-semibold">Sales history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">SALE</th><th className="px-3 py-3">CUSTOMER</th><th className="px-3 py-3">TOTAL</th><th className="px-3 py-3">ACTIONS</th></tr></thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-white/5">
                  <td className="px-3 py-3">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3">#{sale.id}</td>
                  <td className="px-3 py-3">{sale.customer_id ? "#" + sale.customer_id : "Walk-in"}</td>
                  <td className="px-3 py-3">₦{Number(sale.total_amount).toLocaleString()}</td>
                  <td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => details(sale.id)} className="rounded bg-white/10 px-2 py-1 text-xs">Details</button><button onClick={() => generateReceipt(sale.id)} className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300">Receipt</button></div></td>
                </tr>
              ))}
              {!sales.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-white/30">No sales yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {receipt && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Receipt #{receipt.sale_id}</h2>
            <button onClick={() => setReceipt(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total" value={"₦" + Number(receipt.total_amount).toLocaleString()} />
            <Stat label="Customer" value={receipt.customer_id ? "#" + receipt.customer_id : "Walk-in"} />
            <Stat label="Date" value={new Date(receipt.created_at).toLocaleString()} />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-white/70">{receipt.printable_text}</pre>
        </section>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
