import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDirectConversation } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const me = await requireAuth();
  const { userId } = await req.json();
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }
  const other = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!other) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  const conv = await getOrCreateDirectConversation(me.id, other.id);
  if (!conv) {
    return Response.json({ error: "Cannot create conversation" }, { status: 400 });
  }
  return Response.json({
    id: conv.id,
    type: "direct",
    name: other.name,
    otherUser: { id: other.id, name: other.name },
  });
}
