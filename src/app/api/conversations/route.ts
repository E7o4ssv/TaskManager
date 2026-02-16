import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  const projectChats = await prisma.conversation.findMany({
    where: {
      type: "project",
      projectId: { not: null },
      project: { members: { some: { userId: user.id } } },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
  const directConvs = await prisma.conversation.findMany({
    where: {
      type: "direct",
      participants: { some: { userId: user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  const list = [
    ...projectChats.map((c) => ({
      id: c.id,
      type: "project" as const,
      name: c.name ?? `Чат: ${c.project?.name ?? ""}`,
      projectId: c.projectId ?? undefined,
      projectName: c.project?.name,
      updatedAt: c.createdAt,
    })),
    ...directConvs.map((c) => {
      const other = c.participants.find((p) => p.userId !== user.id)?.user;
      return {
        id: c.id,
        type: "direct" as const,
        name: other?.name ?? "Личный чат",
        otherUser: other ? { id: other.id, name: other.name } : null,
        updatedAt: c.createdAt,
      };
    }),
  ];
  return Response.json(list);
}
