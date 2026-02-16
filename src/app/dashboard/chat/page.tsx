"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  type: "group" | "direct" | "project";
  name: string;
  otherUser?: { id: string; name: string } | null;
  projectId?: string;
  projectName?: string;
  updatedAt: string;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

type User = { id: string; name: string; login?: string | null; email?: string | null };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mobileShowList, setMobileShowList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSelectionDone = useRef(false);
  const lastMessageCountRef = useRef<number>(0);
  const selectedNameRef = useRef<string>("Чат");

  const selected = conversations.find((c) => c.id === selectedId);
  const usersForDm = currentUserId ? users.filter((u) => u.id !== currentUserId) : users;

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
      if (data.length > 0 && !initialSelectionDone.current) {
        setSelectedId(data[0].id);
        initialSelectionDone.current = true;
      }
    }
    setLoadingList(false);
  }

  async function loadMessages() {
    if (!selectedId) return;
    setLoadingMessages(true);
    const res = await fetch(`/api/conversations/${selectedId}/messages`);
    if (res.ok) {
      const data = await res.json();
      const prevCount = lastMessageCountRef.current;
      setMessages(data);
      lastMessageCountRef.current = data.length;
      if (data.length > prevCount && prevCount > 0 && typeof document !== "undefined" && !document.hasFocus()) {
        const lastMsg = data[data.length - 1];
        const fromOthers = lastMsg?.user?.id !== currentUserId;
        if (fromOthers && "Notification" in window && Notification.permission === "granted") {
          new Notification(selectedNameRef.current, { body: `${lastMsg?.user?.name ?? "Кто-то"}: ${(lastMsg?.content ?? "").slice(0, 60)}${(lastMsg?.content?.length ?? 0) > 60 ? "…" : ""}` });
        }
      }
    }
    setLoadingMessages(false);
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    lastMessageCountRef.current = 0;
    if (selectedId) loadMessages();
    else setMessages([]);
  }, [selectedId]);

  useEffect(() => {
    const interval = selectedId ? setInterval(loadMessages, 3000) : undefined;
    return () => (interval ? clearInterval(interval) : undefined);
  }, [selectedId]);

  useEffect(() => {
    selectedNameRef.current = selected?.name ?? "Чат";
  }, [selected?.name]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d: { user?: { id: string } }) => setCurrentUserId(d.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!showNewDm) return;
    fetch("/api/users/for-dm")
      .then((r) => r.ok ? r.json() : [])
      .then(setUsers);
  }, [showNewDm]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  async function startDm(userId: string) {
    const res = await fetch("/api/conversations/direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return;
    const conv = await res.json();
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
      if (exists) return prev;
      return [...prev, conv];
    });
    setSelectedId(conv.id);
    setShowNewDm(false);
  }

  function formatDate(s: string) {
    const d = new Date(s);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      className="flex min-h-0 overflow-hidden rounded-[var(--radius)] lg:rounded-none h-[calc(100dvh-7rem)] lg:h-[calc(100vh-0px)]"
    >
      <div className="flex flex-1 min-h-0 min-w-0 w-full h-full" style={{ height: "inherit" }}>
        {/* Список чатов: на мобильных скрыт при выборе чата */}
        <aside
          className={`absolute lg:relative inset-0 lg:inset-auto z-30 w-full sm:w-72 lg:w-72 border-r border-[var(--border)] bg-[var(--card)] flex flex-col shrink-0 ${
            mobileShowList ? "flex" : "hidden lg:flex"
          }`}
        >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--foreground)]">Чаты</h2>
          <button
            type="button"
            onClick={() => setShowNewDm(true)}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            + ЛС
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {loadingList ? (
            <p className="p-4 text-sm text-[var(--foreground-muted)]">Загрузка…</p>
          ) : (
            <ul className="py-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(c.id); setMobileShowList(false); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-[var(--radius)] mx-2 transition ${
                      selectedId === c.id
                        ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                        : "text-[var(--foreground)] hover:bg-[var(--background-elevated)]"
                    }`}
                  >
                    <span className="flex h-10 w-10 rounded-xl bg-[var(--border)] text-[var(--foreground-muted)] items-center justify-center text-sm font-semibold shrink-0">
                      {c.type === "project" ? "П" : c.type === "group" ? "Г" : (c.name.slice(0, 1).toUpperCase())}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium">{c.name}</span>
                    {c.type === "project" && (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] shrink-0">Проект</span>
                    )}
                    {c.type === "direct" && (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] shrink-0">ЛС</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Область сообщений */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[var(--background)]">
        {selected ? (
          <>
            <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 lg:px-6 py-4 shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileShowList(true)}
                className="lg:hidden p-2 -ml-2 rounded-[var(--radius)] text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)]"
                aria-label="Назад к списку чатов"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg lg:text-xl font-bold text-[var(--foreground)] truncate">{selected.name}</h1>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {selected.type === "project" ? "Чат проекта" : selected.type === "group" ? "Общий чат команды" : "Личная переписка"}
                </p>
              </div>
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scrollbar-thin">
              {loadingMessages ? (
                <p className="text-[var(--foreground-muted)]">Загрузка…</p>
              ) : messages.length === 0 ? (
                <p className="text-[var(--foreground-muted)]">Нет сообщений. Напишите первым!</p>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--border-focus)] transition"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-[var(--foreground)]">{m.user.name}</span>
                        <span className="text-xs text-[var(--foreground-muted)]">{formatDate(m.createdAt)}</span>
                      </div>
                      <p className="text-[var(--foreground)] whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <form onSubmit={send} className="border-t border-[var(--border)] bg-[var(--card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
              <div className="flex gap-3 max-w-2xl flex-col sm:flex-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Написать сообщение…"
                  className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-5 py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50 transition shrink-0"
                >
                  Отправить
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--foreground-muted)] p-4">
            <p className="text-center">Выберите чат или создайте личное сообщение</p>
            <button
              type="button"
              onClick={() => setMobileShowList(true)}
              className="lg:hidden mt-4 text-[var(--accent)] font-medium"
            >
              Открыть список чатов
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Модальное окно: выбор пользователя для ЛС */}
      {showNewDm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNewDm(false)}>
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">Новый личный чат</h3>
            <p className="text-sm text-[var(--foreground-muted)] mb-4">Выберите сотрудника</p>
            <ul className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
              {usersForDm.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => startDm(u.id)}
                    className="w-full text-left px-3 py-2.5 rounded-[var(--radius)] hover:bg-[var(--background-elevated)] text-[var(--foreground)] transition"
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-[var(--foreground-muted)] text-sm ml-2">({u.login || u.email || ""})</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowNewDm(false)}
              className="mt-4 w-full rounded-[var(--radius)] border border-[var(--border)] py-2.5 text-[var(--foreground)] hover:bg-[var(--background-elevated)]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
