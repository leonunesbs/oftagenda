import { requireMember } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMember("/dashboard");
  return children;
}
