import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";
import Link from "next/link";
import ProjectMembersClient from "./ProjectMembersClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectMembersPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      manager: { select: { id: true, name: true } },
    },
  });
  if (!project) redirect("/dashboard");
  const isMember = project.members.some((m) => m.userId === user.id);
  if (!isMember) redirect("/dashboard");

  const isManager = await isProjectManager(user.id, id);

  return (
    <div className="p-6 lg:p-10 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/tasks" className="text-[var(--accent)] text-sm font-medium hover:underline mb-2 inline-block">
          ← Назад к задачам
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Участники: {project.name}</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          {project.manager ? `Менеджер проекта: ${project.manager.name}` : "Назначьте менеджера проекта."}
        </p>
      </div>
      <ProjectMembersClient
        projectId={project.id}
        projectName={project.name}
        members={project.members.map((m) => ({ id: m.id, userId: m.userId, user: m.user }))}
        isManager={isManager}
        currentUserId={user.id}
      />
    </div>
  );
}
