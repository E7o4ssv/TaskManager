import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/project-access";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return Response.json([]);
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }
  const files = await prisma.file.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  });
  return Response.json(files);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = (formData.get("projectId") as string | null)?.trim();
  if (!file) {
    return Response.json({ error: "File required" }, { status: 400 });
  }
  if (!projectId) {
    return Response.json({ error: "Project required" }, { status: 400 });
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);
    const record = await prisma.file.create({
      data: {
        name: file.name,
        path: `/uploads/${safeName}`,
        size: buffer.length,
        mimeType: file.type || "application/octet-stream",
        userId: user.id,
        projectId,
      },
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    });
    return Response.json(record);
  } catch (err) {
    console.error("File upload error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
