import Link from "next/link";

import { StartCheckoutButton } from "@/components/start-checkout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default async function ResumoPreAgendamentoPage({ searchParams }: ResumoPageProps) {
  const params = (await searchParams) ?? {};
  const location = params.location ?? "";
  const locationLabelFromParams = params.locationLabel ?? "";
  const locationAddress = params.locationAddress ?? "";
  const date = params.date ?? "";
  const time = params.time ?? "";
  const payment = params.payment ?? "";

  const locationLabel = locationLabelFromParams || location || "Local não informado";
  const dateLabel = date ? formatDateLabel(date) : "Data não informada";
  const timeLabel = time || "Horário não informado";
  const mapsHref = locationAddress ? buildMapsDirectionsUrl(locationAddress) : "";

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
            {locationAddress ? (
              <p>
                <span className="font-medium text-foreground">Endereço:</span>{" "}
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Abrir rotas no mapa para ${locationAddress}`}
                >
                  {locationAddress}
                </a>
              </p>
            ) : null}
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
            <StartCheckoutButton
              location={location}
              date={date}
              time={time}
              label="Seguir para pagamento"
            />
          </div>
          {payment === "cancelled" ? (
            <p className="text-sm text-destructive">
              O checkout foi cancelado. Você pode tentar novamente quando quiser.
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

function buildMapsDirectionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
