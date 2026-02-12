import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }
  const inv = await prisma.invitation.findUnique({
    where: { token },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!inv) {
    return Response.json({ error: "Приглашение не найдено" }, { status: 404 });
  }
  if (inv.usedAt) {
    return Response.json({ error: "Приглашение уже использовано" }, { status: 400 });
  }
  if (inv.expiresAt < new Date()) {
    return Response.json({ error: "Срок приглашения истёк" }, { status: 400 });
  }
  return Response.json({
    project: inv.project,
    expiresAt: inv.expiresAt,
  });
}
