"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; name: string; login?: string | null; email?: string | null; role: string };
type Project = { id: string; name: string; _count?: { tasks: number } };

export default function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("projectId");
  const isFilesPage = pathname === "/dashboard/files";
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then(setProjects);
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [...prev, { ...project, _count: { tasks: 0 } }]);
        setNewProjectName("");
        setShowNewProject(false);
      }
    } finally {
      setCreatingProject(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const mainNav = [
    { href: "/dashboard", label: "Главная", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/chat", label: "Чат", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { href: "/dashboard/files", label: "Файлы", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
    ...(user.role === "admin" ? [{ href: "/dashboard/users", label: "Пользователи", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" }] : []),
  ];

  const isTasksPage = pathname === "/dashboard/tasks";

  const navContent = (
    <>
      <div className="p-5 border-b border-[var(--border)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <Image src="/logo.png" alt="FerretTask" width={40} height={40} className="rounded-xl shrink-0 object-contain" />
          <div className="min-w-0">
            <span className="font-bold text-[var(--foreground)] block truncate text-lg tracking-tight">FerretTask</span>
            <span className="text-xs text-[var(--foreground-muted)]">Задачи и проекты</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {mainNav.map(({ href, label, icon }) => {
          const isActive = pathname === href && (href !== "/dashboard/tasks" || !currentProjectId);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-[var(--radius)] pl-3 pr-3 py-2.5 text-sm font-medium transition border-l-2 ${
                isActive
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]"
                  : "border-transparent text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              {label}
            </Link>
          );
        })}
        <div className="pt-5 pb-2">
          <p className="px-3 text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-widest">Проекты</p>
        </div>
        {projects.length === 0 ? (
          <p className="px-3 py-2 text-sm text-[var(--foreground-muted)]">Нет проектов</p>
        ) : null}
        {projects.length > 0 && (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const tasksHref = `/dashboard/tasks?projectId=${p.id}`;
              const filesHref = `/dashboard/files?projectId=${p.id}`;
              const isActiveTasks = isTasksPage && currentProjectId === p.id;
              const isActiveFiles = isFilesPage && currentProjectId === p.id;
              const isActive = isActiveTasks || isActiveFiles;
              return (
                <li key={p.id} className="group">
                  <div
                    className={`flex items-center gap-2 rounded-[var(--radius)] pl-3 pr-1 py-2.5 text-sm transition border-l-2 ${
                      isActive
                        ? "bg-[var(--accent-muted)] border-[var(--accent)]"
                        : "border-transparent"
                    }`}
                  >
                    <Link
                      href={tasksHref}
                      onClick={() => setMobileOpen(false)}
                      className={`flex flex-1 min-w-0 items-center gap-3 ${isActiveTasks ? "text-[var(--accent)] font-medium" : "text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]"}`}
                    >
                      <span className="flex h-8 w-8 rounded-lg bg-[var(--border)] text-[var(--foreground-muted)] items-center justify-center text-xs font-semibold shrink-0">
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{p.name}</span>
                      {p._count != null && (
                        <span className="text-xs text-[var(--foreground-muted)] bg-[var(--background-elevated)] px-1.5 py-0.5 rounded-md shrink-0">{p._count.tasks}</span>
                      )}
                    </Link>
                    <Link
                      href={filesHref}
                      onClick={() => setMobileOpen(false)}
                      className={`p-1.5 rounded-md shrink-0 ${isActiveFiles ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)] hover:text-[var(--foreground)]"}`}
                      title="Файлы проекта"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </Link>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      onClick={() => setMobileOpen(false)}
                      className="p-1.5 rounded-md shrink-0 text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)] hover:text-[var(--foreground)]"
                      title="Участники проекта"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setShowNewProject(true)}
          className="mt-2 w-full flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--accent)] hover:bg-[var(--background-elevated)] transition border border-dashed border-[var(--border)] hover:border-[var(--accent)]/50"
        >
          <span className="flex h-8 w-8 rounded-lg border border-[var(--border)] items-center justify-center text-lg shrink-0">+</span>
          Добавить проект
        </button>
      </nav>
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 bg-[var(--background-elevated)]">
          <span className="flex h-9 w-9 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] items-center justify-center text-sm font-semibold shrink-0">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name}</p>
            <p className="text-xs text-[var(--foreground-muted)] truncate">{user.login || user.email || ""}</p>
          </div>
        </div>
        <button
          onClick={() => { setMobileOpen(false); logout(); }}
          className="mt-2 w-full flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] shadow-[var(--shadow)]"
        aria-label="Открыть меню"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50
          w-[280px] h-screen flex flex-col
          border-r border-[var(--border)] bg-[var(--card)]
          transform transition-transform duration-200 ease-out
          lg:transform-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-[var(--radius)] text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)]"
          aria-label="Закрыть меню"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {navContent}
      </aside>

      <div className="lg:hidden h-14 shrink-0" />

      {showNewProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNewProject(false)}>
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Новый проект</h3>
            <form onSubmit={createProject} className="space-y-4">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Название проекта"
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 rounded-[var(--radius)] border border-[var(--border)] py-2.5 text-[var(--foreground)] hover:bg-[var(--background-elevated)]">
                  Отмена
                </button>
                <button type="submit" disabled={creatingProject} className="flex-1 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] py-2.5 font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50">
                  {creatingProject ? "Создание…" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
