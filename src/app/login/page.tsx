"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--accent-muted),transparent)] pointer-events-none" />
      <div className="w-full max-w-[400px] relative">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 rounded-xl bg-[var(--accent)] items-center justify-center text-white font-bold text-xl mb-4">
              D
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">DanyWhite</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">Вход в систему</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-[var(--radius)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Вход…" : "Войти"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
            Нет аккаунта?{" "}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-[var(--accent)] font-medium hover:text-[var(--accent-hover)]">
              Регистрация
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
