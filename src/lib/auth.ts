import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, login: true, email: true, name: true, role: true },
  });
}

/** Для Route Handlers: читает userId из cookie запроса, без next/headers (избегает 500 в части окружений). */
export async function getCurrentUserFromRequest(req: NextRequest) {
  const userId = req.cookies.get("userId")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, login: true, email: true, name: true, role: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}
