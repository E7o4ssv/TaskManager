"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type InviteInfo = { project: { id: string; name: string }; expiresAt: string } | null;

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [invite, setInvite] = useState<InviteInfo>(null);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needAuth, setNeedAuth] = useState(false);
  const [joining, setJoining] = useState(false);

  const nextUrl = `/invite/${token}`;
  const loginUrl = `/login?next=${encodeURIComponent(nextUrl)}`;
  const registerUrl = `/register?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [checkRes, meRes] = await Promise.all([
          fetch(`/api/invitations/check?token=${encodeURIComponent(token)}`),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (!checkRes.ok) {
          const data = await checkRes.json().catch(() => ({}));
          const isUnauthorized = checkRes.status === 401 || data.error === "Unauthorized";
          setNeedAuth(!!isUnauthorized);
          setError(
            isUnauthorized
              ? "Войдите или зарегистрируйтесь, чтобы присоединиться к проекту."
              : (data.error || "Приглашение недействительно")
          );
          setLoading(false);
          return;
        }
        const inviteData = await checkRes.json();
        setInvite(inviteData);
        if (meRes.ok) {
          const meData = await meRes.json();
          const u = meData.user ?? meData;
          setUser(u?.id ? u : null);
        }
      } catch {
        if (!cancelled) setError("Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  // Если приглашение валидно, но пользователь не авторизован — сразу на вход (после логина вернёт сюда)
  const shouldRedirectToLogin = !loading && invite && !error && !user?.id;
  useEffect(() => {
    if (!shouldRedirectToLogin) return;
    router.replace(loginUrl);
  }, [shouldRedirectToLogin, router, loginUrl]);

  async function joinProject() {
    if (!token || joining) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          router.replace(loginUrl);
          return;
        }
        setError(data.error || "Не удалось присоединиться");
        return;
      }
      router.push(`/dashboard/tasks?projectId=${data.projectId}`);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <p className="text-[var(--foreground-muted)]">Загрузка…</p>
      </div>
    );
  }

  if (shouldRedirectToLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <p className="text-[var(--foreground-muted)]">Перенаправление на вход…</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 max-w-md text-center">
          <p className={needAuth ? "text-[var(--foreground-muted)]" : "text-[var(--danger)] font-medium"}>{error}</p>
          {needAuth ? (
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={loginUrl}
                className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 text-center hover:bg-[var(--accent-hover)] transition"
              >
                Войти
              </Link>
              <Link
                href={registerUrl}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] py-3 text-center font-medium text-[var(--foreground)] hover:bg-[var(--background-elevated)] transition"
              >
                Регистрация
              </Link>
            </div>
          ) : (
            <Link href="/login" className="mt-6 inline-block text-[var(--accent)] font-medium hover:underline">
              Перейти на главную
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--accent-muted),transparent)] pointer-events-none" />
      <div className="w-full max-w-[400px] relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="FerretTask" width={64} height={64} className="mx-auto rounded-xl mb-4 object-contain" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Приглашение в проект</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Вас приглашают в проект <strong className="text-[var(--foreground)]">{invite?.project.name}</strong>
          </p>
        </div>

        {error && (
          <div className="rounded-[var(--radius)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-3 text-sm text-[var(--danger)] mb-4">
            {error}
          </div>
        )}

        {user ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--foreground-muted)]">
              Вы вошли как <strong className="text-[var(--foreground)]">{user.name}</strong>
            </p>
            <button
              type="button"
              onClick={joinProject}
              disabled={joining}
              className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {joining ? "Присоединяем…" : "Присоединиться к проекту"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--foreground-muted)]">
              Войдите или зарегистрируйтесь, чтобы присоединиться к проекту.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={loginUrl}
                className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold py-3 text-center hover:bg-[var(--accent-hover)] transition"
              >
                Войти
              </Link>
              <Link
                href={registerUrl}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] py-3 text-center font-medium text-[var(--foreground)] hover:bg-[var(--background-elevated)] transition"
              >
                Регистрация
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
