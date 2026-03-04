import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { Button } from "@/components/ui/button";

const adminSections = [
  { href: "/dashboard/admin", label: "Visão geral" },
  { href: "/dashboard/admin/eventos", label: "Eventos" },
  { href: "/dashboard/admin/disponibilidade", label: "Disponibilidade" },
  { href: "/dashboard/admin/reservas", label: "Reservas" },
  { href: "/dashboard/admin/pagamentos", label: "Pagamentos" },
  { href: "/dashboard/admin/usuarios", label: "Usuários" },
  { href: "/dashboard/admin/agenda-eventos", label: "Eventos da agenda" },
];

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
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {adminSections.map((section) => (
            <Button key={section.href} variant="outline" size="sm" asChild>
              <Link href={section.href}>{section.label}</Link>
            </Button>
          ))}
        </div>
        {children}
      </section>
      {modal}
    </>
  );
}
