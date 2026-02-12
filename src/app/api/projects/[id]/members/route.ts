import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  const isManager = user.role === "admin";
  const isMember = project.members.some((m) => m.userId === user.id);
  if (!isManager && !isMember) return Response.json({ error: "No access" }, { status: 403 });
  return Response.json(project.members.map((m) => ({ id: m.id, userId: m.userId, user: m.user, joinedAt: m.joinedAt })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (user.role !== "admin") return Response.json({ error: "Only managers can add members" }, { status: 403 });
  const { id: projectId } = await params;
  const body = await req.json();
  const { userId } = body;
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) return Response.json(existing);
  const member = await prisma.projectMember.create({
    data: { projectId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return Response.json(member);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (user.role !== "admin") return Response.json({ error: "Only managers can remove members" }, { status: 403 });
  const { id: projectId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  await prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });
  return Response.json({ ok: true });
}
