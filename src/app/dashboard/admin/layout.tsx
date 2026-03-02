import { requireAdmin } from "@/lib/access";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/dashboard/admin");
  return children;
}
