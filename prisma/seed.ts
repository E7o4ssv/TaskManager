import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_PASSWORD = "password123";

async function main() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "anna@company.com" },
      update: { login: "anna" },
      create: { email: "anna@company.com", login: "anna", password: hash, name: "Анна Иванова", role: "admin" },
    }),
    prisma.user.upsert({
      where: { email: "boris@company.com" },
      update: { login: "boris" },
      create: { email: "boris@company.com", login: "boris", password: hash, name: "Борис Петров", role: "member" },
    }),
    prisma.user.upsert({
      where: { email: "maria@company.com" },
      update: { login: "maria" },
      create: { email: "maria@company.com", login: "maria", password: hash, name: "Мария Сидорова", role: "member" },
    }),
    prisma.user.upsert({
      where: { email: "dmitry@company.com" },
      update: { login: "dmitry" },
      create: { email: "dmitry@company.com", login: "dmitry", password: hash, name: "Дмитрий Козлов", role: "member" },
    }),
  ]);

  let groupConv = await prisma.conversation.findFirst({ where: { type: "group" } });
  if (!groupConv) {
    groupConv = await prisma.conversation.create({
      data: { type: "group", name: "Общий чат" },
    });
  }

  const existingGroupMessages = await prisma.message.count({ where: { conversationId: groupConv.id } });
  if (existingGroupMessages === 0) {
    await prisma.message.createMany({
      data: [
        { content: "Добро пожаловать в общий чат команды!", userId: users[0].id, conversationId: groupConv.id },
      { content: "Здесь можно обсуждать общие вопросы по проектам.", userId: users[0].id, conversationId: groupConv.id },
      { content: "Отлично, спасибо за онбординг!", userId: users[1].id, conversationId: groupConv.id },
      { content: "Напоминаю: созвон в пятницу в 15:00.", userId: users[0].id, conversationId: groupConv.id },
      ],
    });
  }

  const directConvs = await prisma.conversation.findMany({
    where: { type: "direct" },
    include: { participants: { select: { userId: true } } },
  });
  const hasDirect1 = directConvs.some(
    (c) => c.participants.some((p) => p.userId === users[0].id) && c.participants.some((p) => p.userId === users[1].id) && c.participants.length === 2
  );
  if (!hasDirect1) {
    const direct1 = await prisma.conversation.create({
      data: {
        type: "direct",
        participants: {
          create: [{ userId: users[0].id }, { userId: users[1].id }],
        },
      },
    });
    await prisma.message.createMany({
      data: [
        { content: "Привет, как продвигается задача по API?", userId: users[0].id, conversationId: direct1.id },
        { content: "Почти готово, завтра отправлю на ревью.", userId: users[1].id, conversationId: direct1.id },
      ],
    });
  }

  const hasDirect2 = directConvs.some(
    (c) => c.participants.some((p) => p.userId === users[1].id) && c.participants.some((p) => p.userId === users[2].id) && c.participants.length === 2
  );
  if (!hasDirect2) {
    const direct2 = await prisma.conversation.create({
      data: {
        type: "direct",
        participants: {
          create: [{ userId: users[1].id }, { userId: users[2].id }],
        },
      },
    });
    await prisma.message.createMany({
      data: [
        { content: "Мария, пришли пожалуйста отчёт по тестам.", userId: users[1].id, conversationId: direct2.id },
        { content: "Отправляю в течение часа.", userId: users[2].id, conversationId: direct2.id },
      ],
    });
  }

  const defaultPositions = ["Разработчик", "Дизайнер", "Тестировщик", "Менеджер проекта", "Аналитик"];
  for (const name of defaultPositions) {
    await prisma.position.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const projectNames = ["Веб-сайт", "Мобильное приложение", "Внутренние инструменты"];
  const projectDescs = ["Редизайн корпоративного сайта", "Приложение для клиентов", "Автоматизация процессов"];
  const projects: { id: string; name: string; description: string | null }[] = [];
  for (let i = 0; i < projectNames.length; i++) {
    const existing = await prisma.project.findFirst({ where: { name: projectNames[i] } });
    if (existing) {
      projects.push(existing);
    } else {
      const p = await prisma.project.create({
        data: {
          name: projectNames[i],
          description: projectDescs[i],
          managerId: users[0].id,
          members: { create: { userId: users[0].id } },
        },
      });
      projects.push(p);
    }
  }
  const [project1, project2, project3] = projects;

  // Добавляем участников в проекты: менеджер (anna) видит все; работники — только те, куда добавлены
  const memberSets: [string, string[]][] = [
    [project1.id, [users[0].id, users[1].id, users[2].id]],
    [project2.id, [users[0].id, users[1].id, users[3].id]],
    [project3.id, [users[0].id, users[2].id, users[3].id]],
  ];
  for (const [projId, userIds] of memberSets) {
    for (const uid of userIds) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: projId, userId: uid } },
        update: {},
        create: { projectId: projId, userId: uid },
      });
    }
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
    data: [
      { title: "Сверстать главную страницу", description: "Адаптивная вёрстка по макету Figma", status: "in_progress", priority: "high", projectId: project1.id, assigneeId: users[1].id, creatorId: users[0].id },
      { title: "Настроить CI/CD", description: "GitHub Actions для деплоя", status: "todo", priority: "medium", projectId: project1.id, creatorId: users[0].id },
      { title: "Ревью дизайна", status: "done", priority: "low", projectId: project1.id, assigneeId: users[0].id, creatorId: users[1].id },
      { title: "API авторизации", description: "JWT и refresh tokens", status: "in_progress", priority: "high", projectId: project2.id, assigneeId: users[1].id, creatorId: users[0].id },
      { title: "Экран профиля", status: "todo", priority: "medium", projectId: project2.id, assigneeId: users[2].id, creatorId: users[0].id },
      { title: "Дашборд аналитики", description: "Графики и экспорт в Excel", status: "todo", priority: "medium", projectId: project3.id, creatorId: users[0].id },
    ],
    });
  }

  console.log("Seed completed.");
  console.log("Test users (password for all: " + TEST_PASSWORD + "):");
  users.forEach((u) => console.log("  -", u.email, "|", u.name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
