import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (user.role !== "admin") {
    return Response.json({ error: "Only managers can edit positions" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const name = (body.name as string)?.trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const position = await prisma.position.update({
    where: { id },
    data: { name },
  });
  return Response.json(position);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (user.role !== "admin") {
    return Response.json({ error: "Only managers can delete positions" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.user.updateMany({
    where: { positionId: id },
    data: { positionId: null },
  });
  await prisma.position.delete({ where: { id } });
  return Response.json({ ok: true });
}
