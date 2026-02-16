import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/project-access";

const taskInclude = {
  project: { select: { id: true, name: true, managerId: true } },
  document: { select: { id: true, name: true, path: true } },
  assignee: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
  confirmedBy: { select: { id: true, name: true } },
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, projectId: true, assigneeId: true, acceptedAt: true },
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  if (task.projectId) {
    const allowed = await canAccessProject(user, task.projectId);
    if (!allowed) return Response.json({ error: "No access" }, { status: 403 });
  }
  if (task.assigneeId !== user.id) {
    return Response.json({ error: "Принять задачу может только назначенный исполнитель" }, { status: 403 });
  }
  const updated = await prisma.task.update({
    where: { id },
    data: { acceptedAt: new Date() },
    include: taskInclude,
  });
  return Response.json(updated);
}
