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
  project: { id: string; name: string } | null;
  documentId: string | null;
  document: { id: string; name: string; path: string } | null;
  assignee: { id: string; name: string } | null;
  creator: { id: string; name: string };
  createdAt: string;
};

type FileOption = { id: string; name: string };

const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
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
  const [users, setUsers] = useState<User[]>([]);
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

  async function load() {
    const url = projectId ? `/api/tasks?projectId=${encodeURIComponent(projectId)}` : "/api/tasks";
    const [tRes, uRes, pRes] = await Promise.all([
      fetch(url),
      fetch("/api/users"),
      fetch("/api/projects"),
    ]);
    if (tRes.ok) setTasks(await tRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [projectId]);

  useEffect(() => {
    if ((modal === "new" || modal === "edit") && form.projectId) {
      fetch(`/api/files?projectId=${encodeURIComponent(form.projectId)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: { id: string; name: string }[]) => setProjectFiles(list));
    } else {
      setProjectFiles([]);
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
    done: "border-l-[var(--success)]",
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            {currentProject ? currentProject.name : "Задачи"}
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            {currentProject ? "Задачи проекта" : "Выберите проект в меню слева"}
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={!projectId && projects.length === 0}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-5 py-2.5 hover:bg-[var(--accent-hover)] disabled:opacity-50 transition shrink-0"
        >
          + Новая задача
        </button>
      </header>

      {!projectId && projects.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--foreground-muted)] mb-8">
          Выберите проект в боковом меню, чтобы просматривать и создавать задачи.
        </div>
      )}

      {loading ? (
        <p className="text-[var(--foreground-muted)]">Загрузка…</p>
      ) : !projectId ? null : (
        <div className="grid gap-5 lg:gap-6 md:grid-cols-3">
          {(["todo", "in_progress", "done"] as const).map((status) => (
            <div
              key={status}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 min-w-0"
            >
              <h2 className="font-semibold text-[var(--foreground)] mb-4 flex items-center justify-between">
                <span>{statusLabels[status]}</span>
                <span className="text-sm font-normal text-[var(--foreground-muted)]">{byStatus(status).length}</span>
              </h2>
              <div className="space-y-3">
                {byStatus(status).map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-[var(--radius)] border border-[var(--border)] border-l-4 bg-[var(--background-elevated)] p-4 hover:border-[var(--border-focus)] transition ${statusColors[task.status]}`}
                  >
                    <p className="font-medium text-[var(--foreground)]">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-[var(--foreground-muted)] mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
                      <span>{priorityLabels[task.priority]}</span>
                      <span>·</span>
                      <span>{task.assignee?.name || "Не назначен"}</span>
                      <span>·</span>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    {task.document && (
                      <div className="mt-2">
                        <a href={task.document.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {task.document.name}
                        </a>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => openEdit(task)} className="text-[var(--accent)] text-sm font-medium hover:text-[var(--accent-hover)]">
                        Изменить
                      </button>
                      <button onClick={() => remove(task.id)} className="text-[var(--danger)] text-sm font-medium hover:opacity-80">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setModal("none")}>
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)] my-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-5">
              {modal === "new" ? "Новая задача" : "Редактировать задачу"}
            </h3>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Проект</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
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
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
                  >
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
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
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Исполнитель</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
                >
                  <option value="">Не назначен</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Документ</label>
                <select
                  value={form.documentId}
                  onChange={(e) => setForm((f) => ({ ...f, documentId: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)]"
                >
                  <option value="">Без документа</option>
                  {projectFiles.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">Файлы из раздела «Файлы» проекта</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => setModal("none")} className="flex-1 rounded-[var(--radius)] border border-[var(--border)] py-2.5 text-[var(--foreground)] hover:bg-[var(--background-elevated)]">
                  Отмена
                </button>
                <button type="submit" className="flex-1 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] py-2.5 font-semibold hover:bg-[var(--accent-hover)]">
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
