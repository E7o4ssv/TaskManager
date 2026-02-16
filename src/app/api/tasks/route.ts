import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/project-access";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (projectId) {
    const allowed = await canAccessProject(user, projectId);
    if (!allowed) return Response.json({ error: "No access to this project" }, { status: 403 });
  }
  const tasks = await prisma.task.findMany({
    where: projectId
      ? { projectId }
      : { OR: [{ projectId: null }, { project: { members: { some: { userId: user.id } } } }] },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      document: { select: { id: true, name: true, path: true } },
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      confirmedBy: { select: { id: true, name: true } },
    },
  });
  return Response.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();
  const { title, description, status, priority, dueDate, assigneeId, projectId, documentId } = body;
  if (!title?.trim()) {
    return Response.json({ error: "Title required" }, { status: 400 });
  }
  if (!projectId) {
    return Response.json({ error: "Project required" }, { status: 400 });
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) return Response.json({ error: "No access to this project" }, { status: 403 });
  if (documentId) {
    const file = await prisma.file.findUnique({ where: { id: documentId }, select: { projectId: true } });
    if (!file) return Response.json({ error: "Document file not found" }, { status: 400 });
    if (file.projectId !== projectId) return Response.json({ error: "Document must be from the same project" }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      status: status || "todo",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      projectId,
      documentId: documentId || null,
      creatorId: user.id,
    },
    include: {
      project: { select: { id: true, name: true } },
      document: { select: { id: true, name: true, path: true } },
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  return Response.json(task);
}
