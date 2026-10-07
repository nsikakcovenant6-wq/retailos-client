"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function ItemsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const storeId = user?.store_id;
      if (!storeId) throw new Error("No store is associated with this account");
      const data = await api<{ products: Product[] }>("/product/list?store_id=" + storeId);
      setProducts(data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load products");
    }
  }

  async function viewProduct(id: number) {
    try {
      const storeId = user?.store_id;
      if (!storeId) throw new Error("No store is associated with this account");
      const data = await api<{ product: Product }>(
        "/product/get?id=" + id + "&store_id=" + storeId,
      );
      setSelected(data.product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load product");
    }
  }

  useEffect(() => { load(); }, [user?.store_id]);

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <DashboardShell title="Products">
      {error && <p className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} className="field mb-6 max-w-xl" placeholder="Search products…" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => (
          <article key={product.id} className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <p className="text-xs text-white/35">Product #{product.id}</p>
            <h2 className="mt-2 font-semibold">{product.name}</h2>
            <p className="mt-2 text-lg text-orange-400">₦{Number(product.price).toLocaleString()}</p>
            <p className="mt-1 text-sm text-white/40">{product.stock_quantity} units in stock</p>
            <button onClick={() => viewProduct(product.id)} className="mt-5 rounded-lg bg-white/10 px-3 py-2 text-sm">
              View details
            </button>
          </article>
        ))}
      </div>

      {!filtered.length && <div className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-10 text-center text-white/30">No products found.</div>}

      {selected && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-white/40">Product #{selected.id}</p><h2 className="mt-1 text-lg font-semibold">{selected.name}</h2></div>
            <button onClick={() => setSelected(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Price" value={"₦" + Number(selected.price).toLocaleString()} />
            <Stat label="Stock" value={selected.stock_quantity} />
            <Stat label="Low-stock threshold" value={selected.low_stock_threshold ?? "—"} />
          </div>
        </section>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
