import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StartCheckoutButton } from "@/components/start-checkout-button";

type ResumoPageProps = {
  searchParams?:
    | Promise<{
        location?: string;
        locationLabel?: string;
        locationAddress?: string;
        date?: string;
        time?: string;
        payment?: string;
      }>
    | {
        location?: string;
        locationLabel?: string;
        locationAddress?: string;
        date?: string;
        time?: string;
        payment?: string;
      };
};

export default async function ResumoPreAgendamentoPage({
  searchParams,
}: ResumoPageProps) {
  const params = (await searchParams) ?? {};
  const location = params.location ?? "";
  const locationLabelFromParams = params.locationLabel ?? "";
  const locationAddress = params.locationAddress ?? "";
  const date = params.date ?? "";
  const time = params.time ?? "";
  const payment = params.payment ?? "";
  const hasRedactedParams = [location, locationLabelFromParams, locationAddress, date, time, payment].some(
    isRedactedValue,
  );

  if (hasRedactedParams) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <Card className="border-destructive/40 bg-card/95 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle>Erro ao carregar agendamento</CardTitle>
            <CardDescription>
              Detectamos dados inválidos na URL deste pré-agendamento. Por segurança, inicie um novo
              agendamento.
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

  const locationLabel =
    locationLabelFromParams || location || "Local não informado";
  const dateLabel = date ? formatDateLabel(date) : "Data não informada";
  const timeLabel = time || "Horário não informado";
  const addressHref = locationAddress ? buildAddressHref(locationAddress) : "";

  return (
    <section className="mx-auto w-full max-w-4xl">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Resumo do pré-agendamento</CardTitle>
          <CardDescription>
            Confira os dados selecionados antes de seguir para a confirmação com Dr Leonardo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">Local:</span>{" "}
                {locationLabel}
              </p>
              {locationAddress ? (
                <p>
                  <span className="font-medium text-foreground">Endereço:</span>{" "}
                  <a
                    href={addressHref}
                    className="underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Abrir o endereço em um aplicativo de mapas: ${locationAddress}`}
                  >
                    {locationAddress}
                  </a>
                </p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">Data:</span>{" "}
                {dateLabel}
              </p>
              <p>
                <span className="font-medium text-foreground">Horário:</span>{" "}
                {timeLabel}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/agendar">Editar agendamento</Link>
            </Button>
            <StartCheckoutButton
              location={location}
              date={date}
              time={time}
              label="Seguir para pagamento"
            />
          </div>
          {payment === "cancelled" ? (
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

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!day || !month || !year) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

function buildAddressHref(address: string) {
  return `geo:0,0?q=${encodeURIComponent(address)}`;
}

function isRedactedValue(value: string) {
  return /(?:\[)?redacted(?:\])?/i.test(value.trim());
}
