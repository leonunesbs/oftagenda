import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const locationLabels: Record<string, string> = {
  fortaleza: "Fortaleza",
  sao_domingos_do_maranhao: "São Domingos do Maranhão",
  fortuna: "Fortuna",
};

type ResumoPageProps = {
  searchParams?:
    | Promise<{
        location?: string;
        date?: string;
        time?: string;
      }>
    | {
        location?: string;
        date?: string;
        time?: string;
      };
};

export default async function ResumoPreAgendamentoPage({ searchParams }: ResumoPageProps) {
  const params = (await searchParams) ?? {};
  const location = params.location ?? "";
  const date = params.date ?? "";
  const time = params.time ?? "";

  const locationLabel = locationLabels[location] ?? "Local não informado";
  const dateLabel = date ? formatDateLabel(date) : "Data não informada";
  const timeLabel = time || "Horário não informado";

  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Resumo do pré-agendamento</CardTitle>
          <CardDescription>
            Confira os dados selecionados antes de seguir para a confirmação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <p>
              <span className="font-medium text-foreground">Local:</span> {locationLabel}
            </p>
            <p>
              <span className="font-medium text-foreground">Data:</span> {dateLabel}
            </p>
            <p>
              <span className="font-medium text-foreground">Horário:</span> {timeLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/agendar">Editar agendamento</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Seguir para o painel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!day || !month || !year) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}
