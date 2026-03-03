import { requireAdmin } from "@/lib/access";

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
      {children}
      {modal}
    </>
  );
}
