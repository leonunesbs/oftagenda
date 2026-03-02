"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const locationLabels: Record<string, string> = {
  fortaleza: "Fortaleza",
  sao_domingos_do_maranhao: "Sao Domingos do Maranhao",
  fortuna: "Fortuna",
};

export default function ResumoInterceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const location = searchParams.get("location") ?? "";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";

  const locationLabel = locationLabels[location] ?? "Local nao informado";
  const dateLabel = date ? formatDateLabel(date) : "Data nao informada";
  const timeLabel = time || "Horario nao informado";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumo do pre-agendamento</DialogTitle>
          <DialogDescription>
            Confira os dados selecionados antes de seguir para a confirmacao.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
          <p>
            <span className="font-medium text-foreground">Local:</span> {locationLabel}
          </p>
          <p>
            <span className="font-medium text-foreground">Data:</span> {dateLabel}
          </p>
          <p>
            <span className="font-medium text-foreground">Horario:</span> {timeLabel}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Editar agendamento
          </Button>
          <Button asChild>
            <Link href="/dashboard">Seguir para o painel</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!day || !month || !year) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}
