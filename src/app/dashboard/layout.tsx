import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <DashboardNav user={user} />
      <main className="flex-1 overflow-auto min-w-0 pt-14 pl-4 pr-4 pb-4 lg:pt-0 lg:pl-0 lg:pr-0 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
