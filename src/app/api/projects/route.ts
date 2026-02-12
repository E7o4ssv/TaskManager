import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  const isManager = user.role === "admin";
  const projects = await prisma.project.findMany({
    where: isManager ? undefined : { members: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
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
      members: { create: { userId: user.id } },
    },
  });
  return Response.json(project);
}
