"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, login, password, passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
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
            <Image src="/logo.png" alt="FerretTask" width={64} height={64} className="mx-auto rounded-xl mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">FerretTask</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">Регистрация</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-[var(--radius)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Иван Иванов"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Логин</label>
              <input
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Придумайте логин"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Пароль</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                required
                minLength={6}
                placeholder="Не менее 6 символов"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Подтверждение пароля</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                required
                minLength={6}
                placeholder="Повторите пароль"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Регистрация…" : "Зарегистрироваться"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
            Уже есть аккаунт?{" "}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-[var(--accent)] font-medium hover:text-[var(--accent-hover)]">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><p className="text-[var(--foreground-muted)]">Загрузка…</p></div>}>
      <RegisterForm />
    </Suspense>
  );
}
