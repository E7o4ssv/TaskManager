import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectManager } from "@/lib/project-access";
import path from "path";
import { readFile, unlink } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) return new Response("Not found", { status: 404 });
  const fullPath = path.join(process.cwd(), "public", file.path.replace(/^\//, ""));
  const buffer = await readFile(fullPath);
  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;
  const file = await prisma.file.findUnique({
    where: { id },
    select: { id: true, path: true, projectId: true },
  });
  if (!file) return Response.json({ error: "Файл не найден" }, { status: 404 });
  if (!file.projectId) return Response.json({ error: "Удаление разрешено только для файлов проекта" }, { status: 400 });
  const canDelete = await isProjectManager(user.id, file.projectId);
  if (!canDelete) {
    return Response.json({ error: "Только менеджер проекта может удалять файлы" }, { status: 403 });
  }
  const fullPath = path.join(process.cwd(), "public", file.path.replace(/^\//, ""));
  try {
    await unlink(fullPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error("File unlink error:", e);
    }
  }
  await prisma.file.delete({ where: { id } });
  return Response.json({ ok: true });
}
