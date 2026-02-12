import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateGroupConversation } from "@/lib/conversations";

export async function GET() {
  const user = await requireAuth();
  const group = await getOrCreateGroupConversation();
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
    {
      id: group.id,
      type: "group" as const,
      name: group.name,
      updatedAt: group.createdAt,
    },
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
