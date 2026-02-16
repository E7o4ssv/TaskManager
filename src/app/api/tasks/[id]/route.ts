import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject, isProjectManager } from "@/lib/project-access";

const taskInclude = {
  project: { select: { id: true, name: true, managerId: true } },
  document: { select: { id: true, name: true, path: true } },
  assignee: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
  confirmedBy: { select: { id: true, name: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  if (task.projectId) {
    const allowed = await canAccessProject(user, task.projectId);
    if (!allowed) return Response.json({ error: "No access" }, { status: 403 });
  }
  return Response.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { projectId: true, assigneeId: true },
  });
  if (!existing) return Response.json({ error: "Task not found" }, { status: 404 });
  if (existing.projectId) {
    const allowed = await canAccessProject(user, existing.projectId);
    if (!allowed) return Response.json({ error: "No access to this project" }, { status: 403 });
  }
  const body = await req.json();
  const { title, description, status, priority, dueDate, assigneeId, projectId, documentId } = body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (assigneeId !== undefined) {
    data.assigneeId = assigneeId || null;
    data.acceptedAt = null; // при любой смене ответственного новый исполнитель должен подтвердить задачу
  }
  if (projectId !== undefined) data.projectId = projectId || null;
  if (documentId !== undefined) data.documentId = documentId || null;
  if (status !== undefined) {
    if (status === "done") {
      const isManager = existing.projectId
        ? await isProjectManager(user.id, existing.projectId)
        : false;
      if (!isManager) {
        return Response.json({ error: "Только менеджер проекта может завершить задачу" }, { status: 403 });
      }
      (data as { status: string; confirmedById: string; confirmedAt: Date }).status = "done";
      (data as { confirmedById: string }).confirmedById = user.id;
      (data as { confirmedAt: Date }).confirmedAt = new Date();
    } else {
      data.status = status;
    }
  }
  if (data.documentId) {
    const file = await prisma.file.findUnique({ where: { id: data.documentId as string }, select: { projectId: true } });
    if (!file) return Response.json({ error: "Document file not found" }, { status: 400 });
    const taskProjectId = projectId !== undefined ? projectId : existing.projectId ?? null;
    if (taskProjectId != null && file.projectId !== taskProjectId) return Response.json({ error: "Document must be from the same project" }, { status: 400 });
  }
  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  });
  return Response.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
  if (!existing) return Response.json({ error: "Task not found" }, { status: 404 });
  if (existing.projectId) {
    const allowed = await canAccessProject(user, existing.projectId);
    if (!allowed) return Response.json({ error: "No access to this project" }, { status: 403 });
  }
  await prisma.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
