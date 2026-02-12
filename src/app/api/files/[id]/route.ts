import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { readFile } from "fs/promises";

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
