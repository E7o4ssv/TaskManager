import { prisma } from "./prisma";

const GROUP_CONVERSATION_NAME = "Общий чат";

export async function getOrCreateGroupConversation() {
  let group = await prisma.conversation.findFirst({
    where: { type: "group" },
  });
  if (!group) {
    group = await prisma.conversation.create({
      data: { type: "group", name: GROUP_CONVERSATION_NAME },
    });
  }
  return group;
}

export async function getOrCreateDirectConversation(userId1: string, userId2: string) {
  if (userId1 === userId2) return null;
  const candidates = await prisma.conversation.findMany({
    where: {
      type: "direct",
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } },
      ],
    },
    include: { participants: true },
  });
  const existing = candidates.find((c) => c.participants.length === 2);
  if (existing) return existing;
  return prisma.conversation.create({
    data: {
      type: "direct",
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
  });
}
