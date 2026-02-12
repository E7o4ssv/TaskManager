"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };
type Member = { id: string; userId: string; user: User };

export default function ProjectMembersClient({
  projectId,
  projectName,
  members: initialMembers,
  allUsers,
}: {
  projectId: string;
  projectName: string;
  members: Member[];
  allUsers: User[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const memberIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  async function addMember() {
    if (!selectedUserId || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [...prev, { id: newMember.id, userId: newMember.userId, user: newMember.user }]);
        setSelectedUserId("");
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(userId: string) {
    if (removing) return;
    setRemoving(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        router.refresh();
      }
    } finally {
      setRemoving(null);
    }
  }

  async function createInviteLink() {
    if (creatingInvite) return;
    setCreatingInvite(true);
    setInviteLink("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.url);
      }
    } finally {
      setCreatingInvite(false);
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-6 pb-6 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--foreground)] mb-2">Пригласить по ссылке</h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-3">
          Отправьте ссылку — человек войдёт или зарегистрируется и автоматически присоединится к проекту. Ссылка действует 7 дней.
        </p>
        {!inviteLink ? (
          <button
            type="button"
            onClick={createInviteLink}
            disabled={creatingInvite}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-4 py-2.5 hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {creatingInvite ? "Создаём…" : "Создать пригласительную ссылку"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background-elevated)]"
            >
              {linkCopied ? "Скопировано" : "Копировать"}
            </button>
            <button
              type="button"
              onClick={() => setInviteLink("")}
              className="text-[var(--foreground-muted)] text-sm hover:text-[var(--foreground)]"
            >
              Создать новую
            </button>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-[var(--foreground)] mb-3">Участники</h3>
      <ul className="space-y-3 mb-6">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0">
            <div>
              <span className="font-medium text-[var(--foreground)]">{m.user.name}</span>
              <span className="text-[var(--foreground-muted)] text-sm ml-2">{m.user.email}</span>
            </div>
            <button
              type="button"
              onClick={() => removeMember(m.userId)}
              disabled={removing === m.userId}
              className="text-[var(--danger)] text-sm font-medium hover:opacity-80 disabled:opacity-50"
            >
              {removing === m.userId ? "…" : "Удалить"}
            </button>
          </li>
        ))}
      </ul>

      {availableUsers.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Добавить участника</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
            >
              <option value="">Выберите пользователя</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addMember}
            disabled={!selectedUserId || adding}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-4 py-2.5 hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {adding ? "…" : "Добавить"}
          </button>
        </div>
      )}
      {availableUsers.length === 0 && members.length > 0 && (
        <p className="text-[var(--foreground-muted)] text-sm">Все пользователи уже добавлены в проект.</p>
      )}
    </div>
  );
}
