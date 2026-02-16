import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = body.projectId as string | undefined;
  if (!projectId) {
    return Response.json({ error: "projectId required" }, { status: 400 });
  }
  const canInvite = await isProjectManager(user.id, projectId);
  if (!canInvite) {
    return Response.json({ error: "Только менеджер проекта может создавать приглашения" }, { status: 403 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const inv = await prisma.invitation.create({
    data: { projectId, token, expiresAt },
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof req.url === "string" ? new URL(req.url).origin : "http://localhost:3000");
  const url = `${baseUrl}/invite/${inv.token}`;
  return Response.json({
    id: inv.id,
    token: inv.token,
    url,
    expiresAt: inv.expiresAt,
    project: { id: project.id, name: project.name },
  });
}
