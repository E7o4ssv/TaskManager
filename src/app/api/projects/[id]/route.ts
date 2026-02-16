import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, managerId: true, members: { select: { userId: true } } },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  const isMember = project.members.some((m) => m.userId === user.id);
  if (!isMember) return Response.json({ error: "No access" }, { status: 403 });
  const canManage = project.managerId === null || (await isProjectManager(user.id, projectId));
  if (!canManage) {
    return Response.json({ error: "Только менеджер проекта может передать роль" }, { status: 403 });
  }
  const body = await req.json();
  const { managerId: newManagerId } = body;
  if (!newManagerId || typeof newManagerId !== "string") {
    return Response.json({ error: "managerId required" }, { status: 400 });
  }
  const newManagerIsMember = project.members.some((m) => m.userId === newManagerId);
  if (!newManagerIsMember) {
    return Response.json({ error: "Новый менеджер должен быть участником проекта" }, { status: 400 });
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { managerId: newManagerId },
    include: { manager: { select: { id: true, name: true } } },
  });
  return Response.json(updated);
}
