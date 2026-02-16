"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type FileRecord = {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string;
  user: { id: string; name: string };
  project?: { id: string; name: string } | null;
};

type Project = { id: string; name: string };

type PendingFile = { file: File; name: string; preview?: string };

export default function FilesPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const pendingRef = useRef<PendingFile[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    };
  }, []);

  async function loadFiles() {
    if (!projectId) {
      setFiles([]);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/files?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } else if (res.status === 403) {
        setFiles([]);
        setError("Нет доступа к этому проекту.");
      } else {
        setFiles([]);
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Не удалось загрузить список файлов.");
      }
    } catch {
      setFiles([]);
      setError("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then(setProjects);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadFiles();
  }, [projectId]);

  const currentProject = projectId ? projects.find((p) => p.id === projectId) : null;

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const next: PendingFile[] = selected.map((file) => {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return { file, name: file.name, preview };
    });
    setPending((prev) => [...prev, ...next]);
    setError(null);
    e.target.value = "";
  }, []);

  const removePending = useCallback((index: number) => {
    setPending((prev) => {
      const item = prev[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const setPendingName = useCallback((index: number, name: string) => {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)));
  }, []);

  async function uploadAll() {
    if (!projectId || !pending.length) return;
    setUploading(true);
    setError(null);
    const total = pending.length;
    const uploaded: FileRecord[] = [];
    try {
      for (let i = 0; i < pending.length; i++) {
        setUploadProgress(`Загрузка ${i + 1} из ${total}…`);
        const { file, name } = pending[i];
        const form = new FormData();
        form.append("file", file);
        form.append("projectId", projectId);
        if (name.trim()) form.append("name", name.trim());
        const res = await fetch("/api/files", { method: "POST", body: form });
        if (res.ok) {
          const newFile = await res.json();
          uploaded.push(newFile);
        } else {
          const err = await res.json().catch(() => ({}));
          setError(err?.error || `Ошибка загрузки: ${name || file.name}`);
          break;
        }
      }
      if (uploaded.length) {
        setFiles((prev) => [...uploaded, ...prev]);
        setPending((prev) => {
          prev.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
          return [];
        });
      }
    } catch {
      setError("Ошибка сети при загрузке.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }


  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          {currentProject ? `Файлы — ${currentProject.name}` : "Файлы"}
        </h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          {currentProject ? "Файлы проекта" : "Выберите проект в меню слева"}
        </p>
      </header>

      {!projectId && projects.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--foreground-muted)] mb-8">
          Выберите проект в боковом меню, чтобы просматривать и загружать файлы.
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/files?projectId=${p.id}`}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-2 text-[var(--foreground)] hover:border-[var(--accent)]/50"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-[var(--radius)] border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] px-4 py-3">
          {error}
        </div>
      )}

      {projectId && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--background)] font-semibold px-5 py-2.5 hover:bg-[var(--accent-hover)] transition cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {uploading ? (uploadProgress ?? "Загрузка…") : "Выбрать файлы"}
              <input
                type="file"
                className="hidden"
                multiple
                onChange={onFileSelect}
                disabled={uploading}
              />
            </label>
            {pending.length > 0 && !uploading && (
              <button
                type="button"
                onClick={uploadAll}
                className="rounded-[var(--radius)] bg-[var(--success)] text-white font-semibold px-5 py-2.5 hover:opacity-90 transition"
              >
                Загрузить все ({pending.length})
              </button>
            )}
          </div>

          {pending.length > 0 && (
            <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-sm font-medium text-[var(--foreground-muted)] mb-3">Предпросмотр — укажите имя файла при необходимости</p>
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {pending.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--background-elevated)]">
                    <div className="shrink-0 w-12 h-12 rounded-[var(--radius)] bg-[var(--border)] overflow-hidden flex items-center justify-center">
                      {item.preview ? (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => setPendingName(index, e.target.value)}
                      className="flex-1 min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
                      placeholder="Имя файла"
                    />
                    <span className="text-xs text-[var(--foreground-muted)] shrink-0">{formatSize(item.file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePending(index)}
                      className="shrink-0 p-2 rounded-[var(--radius)] text-[var(--foreground-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                      aria-label="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loading ? (
            <p className="text-[var(--foreground-muted)]">Загрузка…</p>
          ) : files.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--card)] p-16 text-center text-[var(--foreground-muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              В этом проекте пока нет файлов. Загрузите первый.
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--foreground-muted)]">
                    <th className="p-4 font-medium">Имя</th>
                    <th className="p-4 font-medium">Размер</th>
                    <th className="p-4 font-medium hidden sm:table-cell">Кто загрузил</th>
                    <th className="p-4 font-medium hidden md:table-cell">Дата</th>
                    <th className="p-4 font-medium w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background-elevated)]/50 transition">
                      <td className="p-4 font-medium text-[var(--foreground)] truncate max-w-[200px]">{f.name}</td>
                      <td className="p-4 text-[var(--foreground-muted)] text-sm">{formatSize(f.size)}</td>
                      <td className="p-4 text-[var(--foreground-muted)] text-sm hidden sm:table-cell">{f.user.name}</td>
                      <td className="p-4 text-[var(--foreground-muted)] text-sm hidden md:table-cell">{formatDate(f.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <a href={f.path} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] text-sm font-medium hover:text-[var(--accent-hover)]">Скачать</a>
                          <a href={`/api/files/${f.id}`} download={f.name} className="text-[var(--accent)] text-sm font-medium hover:text-[var(--accent-hover)]">Как файл</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!projectId && projects.length === 0 && !loading && (
        <p className="text-[var(--foreground-muted)]">Нет проектов. Создайте проект в меню слева.</p>
      )}
    </div>
  );
}
