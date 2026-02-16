"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type User = { id: string; name: string; email: string };
type Project = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  project: { id: string; name: string; managerId?: string | null } | null;
  documentId: string | null;
  document: { id: string; name: string; path: string } | null;
  assignee: { id: string; name: string } | null;
  creator: { id: string; name: string };
  acceptedAt: string | null;
  confirmedBy: { id: string; name: string } | null;
  confirmedAt: string | null;
  createdAt: string;
};

type FileOption = { id: string; name: string };

const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Выполнено",
};
const priorityLabels: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export default function TasksPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"none" | "new" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    assigneeId: "",
    projectId: "",
    documentId: "",
  });
  const [projectFiles, setProjectFiles] = useState<FileOption[]>([]);
  const [projectMembers, setProjectMembers] = useState<{ id: string; userId: string; user: User }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function load() {
    const url = projectId ? `/api/tasks?projectId=${encodeURIComponent(projectId)}` : "/api/tasks";
    const [tRes, pRes, meRes] = await Promise.all([
      fetch(url),
      fetch("/api/projects"),
      fetch("/api/auth/me"),
    ]);
    if (tRes.ok) setTasks(await tRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    if (meRes.ok) {
      const me = await meRes.json();
      setCurrentUserId(me?.user?.id ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [projectId]);

  useEffect(() => {
    if ((modal === "new" || modal === "edit") && form.projectId) {
      Promise.all([
        fetch(`/api/files?projectId=${encodeURIComponent(form.projectId)}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/projects/${form.projectId}/members`).then((r) => (r.ok ? r.json() : [])),
      ]).then(([files, members]) => {
        setProjectFiles(files);
        setProjectMembers(members);
      });
    } else {
      setProjectFiles([]);
      setProjectMembers([]);
    }
  }, [modal, form.projectId]);

  const currentProject = projectId ? projects.find((p) => p.id === projectId) : null;

  function openNew() {
    const pid = projectId || (projects[0]?.id ?? "");
    setForm({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      assigneeId: "",
      projectId: pid,
      documentId: "",
    });
    setEditingId(null);
    setModal("new");
    if (pid) fetch(`/api/files?projectId=${encodeURIComponent(pid)}`).then((r) => r.ok ? r.json() : []).then((list: { id: string; name: string }[]) => setProjectFiles(list));
    else setProjectFiles([]);
  }

  function openEdit(task: Task) {
    const pid = task.projectId || task.project?.id || projectId || "";
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      assigneeId: task.assignee?.id || "",
      projectId: pid,
      documentId: task.documentId || task.document?.id || "",
    });
    setEditingId(task.id);
    setModal("edit");
    if (pid) fetch(`/api/files?projectId=${encodeURIComponent(pid)}`).then((r) => r.ok ? r.json() : []).then((list: { id: string; name: string }[]) => setProjectFiles(list));
    else setProjectFiles([]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      description: form.description || null,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId || null,
      projectId: form.projectId || null,
      documentId: form.documentId || null,
    };
    if (editingId) {
      await fetch(`/api/tasks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      if (!form.projectId) {
        alert("Выберите проект");
        return;
      }
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, projectId: form.projectId }),
      });
    }
    setModal("none");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Удалить задачу?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();
  }

  function formatDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  const statusColors: Record<string, string> = {
    todo: "border-l-[var(--foreground-muted)]",
    in_progress: "border-l-[var(--accent)]",
    review: "border-l-[var(--warning)]",
    done: "border-l-[var(--success)]",
  };

  async function acceptTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/accept`, { method: "POST" });
    if (res.ok) load();
    else {
      const d = await res.json();
      alert(d.error || "Ошибка");
    }
  }
  async function confirmTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/confirm`, { method: "POST" });
    if (res.ok) load();
    else {
      const d = await res.json();
      alert(d.error || "Ошибка");
    }
  }
  async function setStatusReview(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "review" }),
    });
    if (res.ok) load();
    else {
      const d = await res.json();
      alert(d.error || "Ошибка");
    }
  }

  const priorityStyles: Record<string, string> = {
    low: "bg-[var(--foreground-muted)]/20 text-[var(--foreground-muted)]",
    medium: "bg-[var(--accent)]/15 text-[var(--accent)]",
    high: "bg-[var(--danger)]/15 text-[var(--danger)]",
  };

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            {currentProject ? currentProject.name : "Задачи"}
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1.5 text-sm sm:text-base">
            {currentProject ? "Задачи проекта" : "Выберите проект в меню слева"}
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={!projectId && projects.length === 0}
          className="rounded-xl bg-[var(--accent)] text-[var(--background)] font-semibold px-6 py-3 hover:bg-[var(--accent-hover)] disabled:opacity-50 transition shadow-lg shadow-[var(--accent)]/20 shrink-0"
        >
          + Новая задача
        </button>
      </header>

      {!projectId && projects.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 sm:p-10 text-center text-[var(--foreground-muted)]">
          Выберите проект в боковом меню, чтобы просматривать и создавать задачи.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        </div>
      ) : !projectId ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {(["todo", "in_progress", "review", "done"] as const).map((status) => (
            <div
              key={status}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur p-4 sm:p-5 min-h-[320px] flex flex-col shadow-sm"
            >
              <h2 className="font-semibold text-[var(--foreground)] mb-4 flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span>{statusLabels[status]}</span>
                <span className="text-sm font-medium text-[var(--foreground-muted)] bg-[var(--background-elevated)] px-2.5 py-1 rounded-lg">
                  {byStatus(status).length}
                </span>
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                {byStatus(status).map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] p-4 transition-all duration-200 hover:border-[var(--border-focus)] hover:shadow-md ${statusColors[task.status]}`}
                  >
                    <p className="font-semibold text-[var(--foreground)] leading-snug">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-[var(--foreground-muted)] mt-2 line-clamp-2">{task.description}</p>
                    )}
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-md ${priorityStyles[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-[var(--border)] flex items-center justify-center text-[10px] font-semibold text-[var(--foreground)]">
                          {(task.assignee?.name || "?")[0]}
                        </span>
                        {task.assignee?.name || "Не назначен"}
                      </span>
                      {task.assignee && !task.acceptedAt && (
                        <span className="text-[var(--warning)]">Ожидает принятия</span>
                      )}
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    {task.status === "done" && task.confirmedBy && (
                      <p className="text-xs text-[var(--foreground-muted)] mt-2 pt-2 border-t border-[var(--border)]">
                        Подтвердил: {task.confirmedBy.name}
                        {task.confirmedAt && ` · ${formatDate(task.confirmedAt)}`}
                      </p>
                    )}
                    {task.document && (
                      <a href={task.document.path} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {task.document.name}
                      </a>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.assignee?.id === currentUserId && !task.acceptedAt && (
                        <button onClick={() => acceptTask(task.id)} className="rounded-lg bg-[var(--accent)] text-[var(--background)] text-xs font-medium px-3 py-2 hover:bg-[var(--accent-hover)]">
                          Принять
                        </button>
                      )}
                      {task.assignee?.id === currentUserId && task.status === "in_progress" && (
                        <button onClick={() => setStatusReview(task.id)} className="rounded-lg bg-[var(--warning)]/90 text-white text-xs font-medium px-3 py-2 hover:opacity-90">
                          На проверку
                        </button>
                      )}
                      {task.project?.managerId === currentUserId && task.status === "review" && (
                        <button onClick={() => confirmTask(task.id)} className="rounded-lg bg-[var(--success)] text-white text-xs font-medium px-3 py-2 hover:opacity-90">
                          Подтвердить
                        </button>
                      )}
                      <button onClick={() => openEdit(task)} className="rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] text-xs font-medium px-3 py-2 hover:bg-[var(--background-elevated)] hover:text-[var(--foreground)]">
                        Изменить
                      </button>
                      <button onClick={() => remove(task.id)} className="rounded-lg text-[var(--danger)] text-xs font-medium px-3 py-2 hover:bg-[var(--danger)]/10">
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" onClick={() => setModal("none")}>
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl my-0 sm:my-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-[var(--border)] shrink-0">
              <h3 className="text-xl font-bold text-[var(--foreground)]">
                {modal === "new" ? "Новая задача" : "Редактировать задачу"}
              </h3>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                {modal === "new" ? "Заполните поля и сохраните" : "Внесите изменения"}
              </p>
            </div>
            <form onSubmit={save} className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Проект</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  required
                >
                  <option value="">Выберите проект</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="Краткое название задачи"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                  rows={3}
                  placeholder="Подробности (необязательно)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)]"
                  >
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1.5">«Выполнено» — только кнопкой «Подтвердить» у менеджера</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)]"
                  >
                    {Object.entries(priorityLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Срок</label>
                <input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Исполнитель</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)]"
                >
                  <option value="">Не назначен</option>
                  {projectMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--foreground-muted)] mt-1.5">Исполнитель должен принять задачу</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Документ</label>
                <select
                  value={form.documentId}
                  onChange={(e) => setForm((f) => ({ ...f, documentId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-[var(--foreground)]"
                >
                  <option value="">Без документа</option>
                  {projectFiles.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => setModal("none")} className="flex-1 rounded-xl border border-[var(--border)] py-3.5 text-[var(--foreground)] font-medium hover:bg-[var(--background-elevated)]">
                  Отмена
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] text-[var(--background)] py-3.5 font-semibold hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/20">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
