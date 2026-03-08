import { requireAdmin } from "@/lib/access";
import { AdminDashboardMode } from "@/components/admin-dashboard-mode";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminDashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  await requireAdmin("/dashboard/admin");
  return (
    <>
      <AdminDashboardMode />
      <DashboardShell>{children}</DashboardShell>
      {modal}
    </>
  );
}
