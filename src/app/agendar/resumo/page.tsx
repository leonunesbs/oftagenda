import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { StartCheckoutButton } from "@/components/start-checkout-button";
import { Button } from "@/components/ui/button";
import { resolvePreBookingSummary } from "@/lib/pre-booking-summary";
import Link from "next/link";

type ResumoPageProps = {
  searchParams?:
    | Promise<{
        locationId?: string;
        location?: string;
        date?: string;
        time?: string;
        payment?: string;
        waUserId?: string;
      }>
    | {
        locationId?: string;
        location?: string;
        date?: string;
        time?: string;
        payment?: string;
        waUserId?: string;
      };
};

export default async function ResumoPreAgendamentoPage({
  searchParams,
}: ResumoPageProps) {
  const params = (await searchParams) ?? {};
  const summary = await resolvePreBookingSummary(params);

  if (summary.hasRedactedParams || summary.hasInvalidSelection) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <Card className="border-destructive/40 bg-card/95 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle>Erro ao carregar agendamento</CardTitle>
            <CardDescription>
              {summary.hasRedactedParams
                ? "Detectamos dados inválidos na URL deste pré-agendamento. Por segurança, inicie um novo agendamento."
                : "Esse horário não está mais disponível para o local selecionado. Escolha um novo horário para continuar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/agendar">Fazer novo agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }
  const addressHref = summary.locationAddress
    ? buildAddressHref(summary.locationAddress)
    : "";

  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-4xl items-center">
      <Card className="w-full border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Resumo do pré-agendamento</CardTitle>
          <CardDescription>
            Confira os dados selecionados antes de seguir para a confirmação com
            Dr Leonardo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">Local:</span>{" "}
                {summary.locationLabel}
              </p>
              {summary.locationAddress ? (
                <p>
                  <span className="font-medium text-foreground">Endereço:</span>{" "}
                  <a
                    href={addressHref}
                    className="underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Abrir o endereço em um aplicativo de mapas: ${summary.locationAddress}`}
                  >
                    {summary.locationAddress}
                  </a>
                </p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">Data:</span>{" "}
                {summary.dateLabel}
              </p>
              <p>
                <span className="font-medium text-foreground">Horário:</span>{" "}
                {summary.timeLabel}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-start sm:justify-between">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/agendar">Editar agendamento</Link>
            </Button>
            <StartCheckoutButton
              location={summary.locationId}
              date={summary.date}
              time={summary.time}
              label="Seguir para pagamento"
              waUserId={params.waUserId}
            />
          </div>
          {summary.payment === "cancelled" ? (
            <p className="text-sm text-destructive">
              O checkout foi cancelado. Você pode tentar novamente quando
              quiser.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function buildAddressHref(address: string) {
  return `geo:0,0?q=${encodeURIComponent(address)}`;
}
