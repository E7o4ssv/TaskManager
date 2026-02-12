import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canAccessConversation(conversationId: string, userId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  });
  if (!conv) return false;
  if (conv.type === "group") return true;
  return conv.participants.some((p) => p.userId === userId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const can = await canAccessConversation(id, user.id);
  if (!can) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return Response.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const can = await canAccessConversation(id, user.id);
  if (!can) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return postMessage(req, user.id, id);
}

async function postMessage(req: NextRequest, userId: string, conversationId: string) {
  const { content } = await req.json();
  if (!content?.trim()) {
    return Response.json({ error: "Content required" }, { status: 400 });
  }
  const message = await prisma.message.create({
    data: { content: content.trim(), userId, conversationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return Response.json(message);
}
