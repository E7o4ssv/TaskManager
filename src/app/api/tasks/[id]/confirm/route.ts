import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";

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
    select: { id: true, projectId: true, status: true },
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  if (!task.projectId) {
    return Response.json({ error: "У задачи нет проекта" }, { status: 400 });
  }
  const canConfirm = await isProjectManager(user.id, task.projectId);
  if (!canConfirm) {
    return Response.json({ error: "Подтвердить задачу может только менеджер проекта" }, { status: 403 });
  }
  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: "done",
      confirmedById: user.id,
      confirmedAt: new Date(),
    },
    include: taskInclude,
  });
  return Response.json(updated);
}
