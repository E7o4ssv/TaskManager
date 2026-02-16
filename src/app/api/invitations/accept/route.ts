import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const token = body.token as string | undefined;
  if (!token) {
    return Response.json({ error: "token required" }, { status: 400 });
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
  const projectChat = await prisma.conversation.findUnique({
    where: { projectId: inv.projectId },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: inv.projectId, userId: user.id } },
      update: {},
      create: { projectId: inv.projectId, userId: user.id },
    }),
    prisma.invitation.update({
      where: { id: inv.id },
      data: { usedAt: new Date() },
    }),
    ...(projectChat
      ? [
          prisma.participant.upsert({
            where: {
              conversationId_userId: { conversationId: projectChat.id, userId: user.id },
            },
            update: {},
            create: { conversationId: projectChat.id, userId: user.id },
          }),
        ]
      : []),
  ]);
  return Response.json({
    projectId: inv.projectId,
    projectName: inv.project.name,
  });
}
