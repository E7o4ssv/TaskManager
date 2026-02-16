import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getOrCreateDirectConversation } from "@/lib/conversations";

/** Забыл пароль: по логину находим пользователя, выставляем новый временный пароль и пишем его в ЛС менеджеру проекта. */
export async function POST(req: NextRequest) {
  try {
    const { login } = await req.json();
    if (!login?.trim()) {
      return Response.json({ error: "Введите логин" }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { OR: [{ login: login.trim() }, { email: login.trim() }] },
      select: { id: true, name: true, login: true },
    });
    if (!user) {
      return Response.json({ message: "Если такой логин зарегистрирован, менеджеру проекта придёт сообщение с новым паролем." });
    }
    const newPassword = crypto.randomBytes(8).toString("base64").replace(/[+/=]/g, "").slice(0, 10);
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });
    const projectWithManager = await prisma.project.findFirst({
      where: { members: { some: { userId: user.id } } },
      select: { managerId: true },
    });
    if (projectWithManager?.managerId) {
      const conv = await getOrCreateDirectConversation(projectWithManager.managerId, user.id);
      if (conv) {
        await prisma.message.create({
          data: {
            content: `Запрос сброса пароля.\nПользователь: ${user.name} (логин: ${user.login ?? "—"}).\nНовый временный пароль: ${newPassword}\nРекомендуется сменить после входа.`,
            userId: user.id,
            conversationId: conv.id,
          },
        });
      }
    }
    return Response.json({ message: "Если такой логин зарегистрирован, менеджеру проекта придёт сообщение с новым паролем." });
  } catch (e) {
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
