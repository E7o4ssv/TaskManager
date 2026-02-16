"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import Link from "next/link";

function ForgotPasswordForm() {
  const [login, setLogin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim() }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Готово.");
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
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Восстановление пароля</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">
              Введите логин — новый пароль придёт в личные сообщения менеджеру вашего проекта
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Логин</label>
              <input
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Ваш логин"
                required
              />
            </div>
            {message && (
              <div className="rounded-[var(--radius)] bg-[var(--accent-muted)]/50 border border-[var(--accent)]/30 px-4 py-3 text-sm text-[var(--foreground)]">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Отправка…" : "Отправить запрос"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
            <Link href="/login" className="text-[var(--accent)] font-medium hover:text-[var(--accent-hover)]">
              ← Вернуться к входу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><p className="text-[var(--foreground-muted)]">Загрузка…</p></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
