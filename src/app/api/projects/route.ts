import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { tasks: true } },
      manager: { select: { id: true, name: true } },
    },
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();
  const { name, description } = body;
  if (!name?.trim()) {
    return Response.json({ error: "Name required" }, { status: 400 });
  }
  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      managerId: user.id,
      members: { create: { userId: user.id } },
    },
  });
  const projectChat = await prisma.conversation.create({
    data: {
      type: "project",
      name: `Чат: ${project.name}`,
      projectId: project.id,
      participants: { create: { userId: user.id } },
    },
  });
  return Response.json({
    ...project,
    projectChatId: projectChat.id,
  });
}
