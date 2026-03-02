import { requireAuthenticated } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthenticated("/dashboard");
  return children;
}
