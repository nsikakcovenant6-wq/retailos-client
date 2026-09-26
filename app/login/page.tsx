"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api("/auth/login", { method: "POST", json: { email, password } });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-8 shadow-2xl">
        <p className="mb-8 text-lg font-bold tracking-tight">TX <span className="text-orange-500">RetailOS</span></p>
        <div className="mb-7">
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-white/55">Use the account stored by the RetailOS server.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="field" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Password</span>
            <div className="relative">
              <input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="field pr-20" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button disabled={loading} type="submit" className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          New to RetailOS? <Link href="/register" className="text-orange-400 hover:text-orange-300">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
