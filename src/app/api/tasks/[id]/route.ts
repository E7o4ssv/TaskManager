import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/project-access";

export async function PATCH(
  req: NextRequest,
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
  const body = await req.json();
  const { title, description, status, priority, dueDate, assigneeId, projectId, documentId } = body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (projectId !== undefined) data.projectId = projectId || null;
  if (documentId !== undefined) data.documentId = documentId || null;
  if (data.documentId) {
    const file = await prisma.file.findUnique({ where: { id: data.documentId as string }, select: { projectId: true } });
    if (!file) return Response.json({ error: "Document file not found" }, { status: 400 });
    const taskProjectId = projectId !== undefined ? projectId : (await prisma.task.findUnique({ where: { id }, select: { projectId: true } }))?.projectId ?? null;
    if (taskProjectId != null && file.projectId !== taskProjectId) return Response.json({ error: "Document must be from the same project" }, { status: 400 });
  }
  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      project: { select: { id: true, name: true } },
      document: { select: { id: true, name: true, path: true } },
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
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
