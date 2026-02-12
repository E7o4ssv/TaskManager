import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UsersManagement from "./UsersManagement";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="p-6 lg:p-10 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          Пользователи и роли
        </h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Изменяйте роль: менеджер видит все проекты и может управлять участниками и ролями, работник — только проекты, в которые его добавили.
        </p>
      </header>
      <UsersManagement />
    </div>
  );
}
