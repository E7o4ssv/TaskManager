import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает пользователей, с которыми можно начать ЛС:
 * только те, кто состоит хотя бы в одном общем с текущим пользователем проекте.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myProjectIds = await prisma.projectMember
    .findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
    .then((rows) => rows.map((r) => r.projectId));
  if (myProjectIds.length === 0) {
    return Response.json([]);
  }
  const userIdsInMyProjects = await prisma.projectMember.findMany({
    where: { projectId: { in: myProjectIds } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const ids = [...new Set(userIdsInMyProjects.map((r) => r.userId))].filter((id) => id !== user.id);
  if (ids.length === 0) {
    return Response.json([]);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      login: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });
  return Response.json(users);
}
