import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        positionId: true,
        position: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return Response.json(users);
  } catch (err) {
    console.error("GET /api/users error:", err);
    const message = err instanceof Error ? err.message : "Failed to load users";
    return Response.json({ error: message }, { status: 500 });
  }
}
