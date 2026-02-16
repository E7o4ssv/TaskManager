import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { include: { user: { select: { id: true, name: true, login: true, email: true } } } } },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  const isMember = project.members.some((m) => m.userId === user.id);
  if (!isMember) return Response.json({ error: "No access" }, { status: 403 });
  return Response.json(project.members.map((m) => ({ id: m.id, userId: m.userId, user: m.user, joinedAt: m.joinedAt })));
}

export async function POST() {
  // Участников добавляем только по пригласительной ссылке (в системе могут быть другие команды)
  return Response.json(
    { error: "Добавляйте участников только по пригласительной ссылке из раздела «Пригласить по ссылке»" },
    { status: 403 }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: projectId } = await params;
  const canRemove = await isProjectManager(user.id, projectId);
  if (!canRemove) return Response.json({ error: "Только менеджер проекта может удалять участников" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  await prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });
  return Response.json({ ok: true });
}
