import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const positions = await prisma.position.findMany({
      orderBy: { name: "asc" },
    });
    return Response.json(positions);
  } catch (err) {
    console.error("GET /api/positions error:", err);
    const message = err instanceof Error ? err.message : "Failed to load positions";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return Response.json({ error: "Only managers can add positions" }, { status: 403 });
  }
  const body = await req.json();
  const name = (body.name as string)?.trim();
  if (!name) {
    return Response.json({ error: "Name required" }, { status: 400 });
  }
  const existing = await prisma.position.findFirst({ where: { name } });
  if (existing) {
    return Response.json({ error: "Такая должность уже есть" }, { status: 400 });
  }
  const position = await prisma.position.create({ data: { name } });
  return Response.json(position);
}
