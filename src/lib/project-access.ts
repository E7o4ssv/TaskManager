import { prisma } from "./prisma";

type UserForAccess = { id: string; role: string };

export async function canAccessProject(user: UserForAccess, projectId: string): Promise<boolean> {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  return !!m;
}

export async function isProjectManager(userId: string, projectId: string): Promise<boolean> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { managerId: true },
  });
  return p?.managerId === userId;
}
