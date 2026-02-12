import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (user.role !== "admin") {
    return Response.json({ error: "Only managers can change roles" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { role, positionId } = body;
  const data: { role?: string; positionId?: string | null } = {};
  if (role !== undefined) {
    if (role !== "admin" && role !== "member") {
      return Response.json({ error: "Role must be admin or member" }, { status: 400 });
    }
    data.role = role;
  }
  if (positionId !== undefined) {
    const pid = positionId === "" || positionId == null ? null : positionId;
    if (pid) {
      const pos = await prisma.position.findUnique({ where: { id: pid } });
      if (!pos) return Response.json({ error: "Position not found" }, { status: 400 });
    }
    data.positionId = pid;
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, positionId: true, position: { select: { id: true, name: true } } },
  });
  return Response.json(updated);
}
