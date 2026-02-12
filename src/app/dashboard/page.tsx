import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statIcons: Record<string, string> = {
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  files: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  projects: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [tasksCount, messagesCount, filesCount, projectsCount] = await Promise.all([
    prisma.task.count(),
    prisma.message.count(),
    prisma.file.count(),
    prisma.project.count(),
  ]);

  const stats = [
    { label: "Сообщений в чате", value: messagesCount, href: "/dashboard/chat", icon: statIcons.chat },
    { label: "Файлов", value: filesCount, href: "/dashboard/files", icon: statIcons.files },
    { label: "Задач", value: tasksCount, href: "/dashboard/tasks", icon: statIcons.tasks },
    { label: "Проектов", value: projectsCount, href: "", icon: statIcons.projects },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          Привет, {user?.name}
        </h1>
        <p className="text-[var(--foreground-muted)] mt-1">Вот что происходит в компании.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, href, icon }) => {
          const content = (
            <>
              <div className="flex h-11 w-11 rounded-[var(--radius)] bg-[var(--accent-muted)] text-[var(--accent)] items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl lg:text-3xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
                <p className="text-sm text-[var(--foreground-muted)] mt-0.5">{label}</p>
              </div>
            </>
          );
          const cardClass = `rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 flex items-start gap-4 transition ${href ? "card-hover hover:border-[var(--accent)]/30 cursor-pointer" : ""}`;
          if (href) {
            return <Link key={label} href={href} className={cardClass}>{content}</Link>;
          }
          return <div key={label} className={cardClass}>{content}</div>;
        })}
      </div>
    </div>
  );
}
