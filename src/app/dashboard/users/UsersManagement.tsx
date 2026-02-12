"use client";

import { useEffect, useState } from "react";

type Position = { id: string; name: string };
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  positionId: string | null;
  position: { id: string; name: string } | null;
};

const roleLabels: Record<string, string> = {
  admin: "Менеджер",
  member: "Работник",
};

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPositionName, setNewPositionName] = useState("");
  const [addingPosition, setAddingPosition] = useState(false);
  const [deletingPositionId, setDeletingPositionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch("/api/users", { credentials: "include" }),
        fetch("/api/positions", { credentials: "include" }),
      ]);
      if (uRes.ok) {
        const data = await uRes.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
        let msg = "Не удалось загрузить пользователей.";
        try {
          const body = await uRes.json();
          if (body?.error && typeof body.error === "string") msg = body.error;
        } catch {
          if (uRes.status === 401) msg = "Войдите в аккаунт снова.";
        }
        setError(msg);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setPositions(Array.isArray(data) ? data : []);
      } else {
        setPositions([]);
        try {
          const body = await pRes.json();
          if (body?.error && typeof body.error === "string") setError((prev) => prev || body.error);
        } catch {
          /* keep existing error */
        }
      }
    } catch {
      setError("Ошибка сети.");
      setUsers([]);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(userId: string, role: string) {
    if (updating) return;
    setUpdating(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Не удалось изменить роль.");
      }
    } catch {
      setError("Ошибка сети.");
    } finally {
      setUpdating(null);
    }
  }

  async function changePosition(userId: string, positionId: string | null) {
    if (updating) return;
    setUpdating(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: positionId || "" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Не удалось изменить должность.");
      }
    } catch {
      setError("Ошибка сети.");
    } finally {
      setUpdating(null);
    }
  }

  async function addPosition(e: React.FormEvent) {
    e.preventDefault();
    const name = newPositionName.trim();
    if (!name || addingPosition) return;
    setAddingPosition(true);
    setError(null);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const pos = await res.json();
        setPositions((prev) => [...prev, pos].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPositionName("");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Не удалось добавить должность.");
      }
    } catch {
      setError("Ошибка сети.");
    } finally {
      setAddingPosition(false);
    }
  }

  async function deletePosition(id: string) {
    if (deletingPositionId) return;
    setDeletingPositionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPositions((prev) => prev.filter((p) => p.id !== id));
        setUsers((prev) =>
          prev.map((u) => (u.positionId === id ? { ...u, positionId: null, position: null } : u))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Не удалось удалить должность.");
      }
    } catch {
      setError("Ошибка сети.");
    } finally {
      setDeletingPositionId(null);
    }
  }

  if (loading) {
    return <p className="text-[var(--foreground-muted)]">Загрузка…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Должности */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Должности (роли)</h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          Добавляйте свои роли: разработчик, дизайнер, тестировщик и т.д. Затем назначайте их пользователям ниже.
        </p>
        <form onSubmit={addPosition} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={newPositionName}
            onChange={(e) => setNewPositionName(e.target.value)}
            placeholder="Например: Разработчик"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)] min-w-[180px] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            disabled={addingPosition}
          />
          <button
            type="submit"
            disabled={!newPositionName.trim() || addingPosition}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-4 py-2.5 hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {addingPosition ? "…" : "Добавить"}
          </button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {positions.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-1.5 text-sm"
            >
              <span className="text-[var(--foreground)]">{p.name}</span>
              <button
                type="button"
                onClick={() => deletePosition(p.id)}
                disabled={deletingPositionId === p.id}
                className="text-[var(--foreground-muted)] hover:text-[var(--danger)] disabled:opacity-50"
                title="Удалить должность"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
          {positions.length === 0 && (
            <li className="text-sm text-[var(--foreground-muted)]">Пока нет должностей. Добавьте первую выше.</li>
          )}
        </ul>
      </div>

      {/* Пользователи */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <h2 className="text-lg font-semibold text-[var(--foreground)] p-6 pb-0">Пользователи</h2>
        {error && (
          <div className="px-6 py-3 text-[var(--danger)] bg-[var(--danger)]/10 text-sm">{error}</div>
        )}
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--foreground-muted)]">
              <th className="p-4 font-medium">Имя</th>
              <th className="p-4 font-medium hidden sm:table-cell">Email</th>
              <th className="p-4 font-medium w-36">Права</th>
              <th className="p-4 font-medium w-44">Должность</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--foreground-muted)]">
                  {error ? "Загрузка не удалась. Проверьте, что вы вошли как менеджер." : "Нет пользователей."}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background-elevated)]/50 transition">
                  <td className="p-4 font-medium text-[var(--foreground)]">{u.name}</td>
                  <td className="p-4 text-[var(--foreground-muted)] text-sm hidden sm:table-cell">{u.email}</td>
                  <td className="p-4">
                    <select
                      value={u.role ?? "member"}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 w-full"
                    >
                      <option value="member">{roleLabels.member}</option>
                      <option value="admin">{roleLabels.admin}</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.positionId ?? ""}
                      onChange={(e) => changePosition(u.id, e.target.value || null)}
                      disabled={updating === u.id}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 w-full"
                    >
                      <option value="">—</option>
                      {positions.map((pos) => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
