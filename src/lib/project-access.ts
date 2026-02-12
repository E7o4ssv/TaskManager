import { prisma } from "./prisma";

type UserForAccess = { id: string; role: string };

export async function canAccessProject(user: UserForAccess, projectId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  return !!m;
}
