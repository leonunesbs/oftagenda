"use client";

import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { calculateDilatationGuidance } from "@/domain/triage/dilatation";
import type { TriagePayload } from "@/domain/triage/schema";
import { cn } from "@/lib/utils";

const MAX_SUMMARY_LENGTH = 240;

const reasons: Array<{
  value: TriagePayload["reason"];
  label: string;
  description: string;
}> = [
  {
    value: "routine",
    label: "Revisão de rotina",
    description: "Check-up geral sem queixa principal específica.",
  },
  {
    value: "glasses",
    label: "Óculos",
    description: "Avaliar/atualizar grau para melhorar a visão no dia a dia.",
  },
  {
    value: "blurred",
    label: "Visão embaçada",
    description: "Percepção de redução da nitidez visual.",
  },
  {
    value: "pain",
    label: "Dor ocular",
    description: "Desconforto, ardor ou dor na região dos olhos.",
  },
  {
    value: "retina_follow",
    label: "Acompanhamento de retina",
    description: "Retorno focado em avaliação/seguimento de retina.",
  },
  {
    value: "glaucoma_follow",
    label: "Acompanhamento de glaucoma",
    description: "Retorno para controle de pressão ocular e nervo óptico.",
  },
  {
    value: "postop",
    label: "Pós-operatório",
    description: "Acompanhamento após procedimento cirúrgico ocular.",
  },
  {
    value: "other",
    label: "Outro motivo",
    description: "Motivo não contemplado nas opções anteriores.",
  },
];

const conditions: Array<{
  value: TriagePayload["conditions"][number];
  label: string;
}> = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hipertensão" },
  { value: "glaucoma", label: "Glaucoma" },
  { value: "prior_surgery", label: "Cirurgia ocular prévia" },
];

const symptoms: Array<{
  value: TriagePayload["symptoms"][number];
  label: string;
}> = [
  { value: "floaters", label: "Moscas volantes" },
  { value: "flashes", label: "Flashes de luz" },
  { value: "sudden_loss", label: "Perda súbita de visão" },
];

const dilationMoments: Array<{
  value: TriagePayload["lastDilation"];
  label: string;
}> = [
  { value: "lt6m", label: "Há menos de 6 meses" },
  { value: "6to12m", label: "Entre 6 e 12 meses" },
  { value: "gt1y", label: "Há mais de 1 ano" },
  { value: "unknown", label: "Não sei informar" },
];

const levelConfig = {
  ALTA: { label: "Alta", badgeVariant: "destructive" as const },
  POSSIVEL: { label: "Possível", badgeVariant: "secondary" as const },
  BAIXA: { label: "Baixa", badgeVariant: "outline" as const },
};

function toggleItem<T extends string>(values: T[], target: T, checked: boolean) {
  if (checked) {
    return values.includes(target) ? values : [...values, target];
  }
  return values.filter((item) => item !== target);
}

export function DetailsForm() {
  const conditionsSectionRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [reason, setReason] = useState<TriagePayload["reason"]>("routine");
  const [selectedConditions, setSelectedConditions] = useState<
    TriagePayload["conditions"]
  >([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<
    TriagePayload["symptoms"]
  >([]);
  const [lastDilation, setLastDilation] =
    useState<TriagePayload["lastDilation"]>("unknown");
  const [oneSentenceSummary, setOneSentenceSummary] = useState("");

  const selectedReason = reasons.find((item) => item.value === reason) ?? reasons[0];
  const hasUrgentSymptom = selectedSymptoms.includes("sudden_loss");

  const triagePreviewPayload = useMemo<TriagePayload>(
    () => ({
      reason,
      conditions: selectedConditions,
      symptoms: selectedSymptoms,
      lastDilation,
      oneSentenceSummary: oneSentenceSummary.trim() || undefined,
    }),
    [lastDilation, oneSentenceSummary, reason, selectedConditions, selectedSymptoms],
  );

  const previewResult = useMemo(
    () => calculateDilatationGuidance(triagePreviewPayload),
    [triagePreviewPayload],
  );
  const hasAnyTriageInput =
    reason !== "routine" ||
    selectedConditions.length > 0 ||
    selectedSymptoms.length > 0 ||
    lastDilation !== "unknown" ||
    oneSentenceSummary.trim().length > 0;

  const answeredSteps = useMemo(() => {
    let total = 1;
    if (selectedConditions.length > 0) total += 1;
    if (selectedSymptoms.length > 0) total += 1;
    if (lastDilation !== "unknown") total += 1;
    if (oneSentenceSummary.trim().length > 0) total += 1;
    return total;
  }, [lastDilation, oneSentenceSummary, selectedConditions, selectedSymptoms]);

  const progressPercentage = Math.round((answeredSteps / 5) * 100);
  const levelLabel = levelConfig[previewResult.level].label;
  const summaryChars = oneSentenceSummary.length;

  function scrollToNextInput(target: HTMLElement | null) {
    if (!target) {
      return;
    }
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  function focusSummaryTextarea() {
    if (!summaryTextareaRef.current) {
      return;
    }
    try {
      summaryTextareaRef.current.focus({ preventScroll: true });
    } catch {
      summaryTextareaRef.current.focus();
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Triagem para previsão de dilatação
            <Badge variant="outline">{progressPercentage}% preenchido</Badge>
          </CardTitle>
          <CardDescription>
            Responda com calma: as orientações aparecem na hora para te ajudar
            a se preparar para a consulta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Quanto mais campos você preencher, melhores ficam as orientações.
            </p>
          </div>

          {hasUrgentSymptom ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Perda súbita de visão pode indicar urgência. Procure atendimento
              imediato e, se necessário, suporte humano pelo WhatsApp.
            </div>
          ) : null}

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>A) Motivo principal</Label>
              <Badge variant="secondary">{selectedReason.label}</Badge>
            </div>
            <RadioGroup
              name="reason"
              value={reason}
              onValueChange={(value) => {
                setReason(value as TriagePayload["reason"]);
                requestAnimationFrame(() => {
                  scrollToNextInput(conditionsSectionRef.current);
                });
              }}
            >
              {reasons.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                    reason === item.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <RadioGroupItem className="mt-0.5" value={item.value} />
                  <span className="space-y-0.5">
                    <span className="block">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset ref={conditionsSectionRef} className="space-y-2">
            <Label>B) Condições</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {conditions.map((item) => {
                const checked = selectedConditions.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) =>
                        setSelectedConditions((previous) =>
                          toggleItem(previous, item.value, nextChecked === true),
                        )
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>C) Sintomas recentes</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {symptoms.map((item) => {
                const checked = selectedSymptoms.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) =>
                        setSelectedSymptoms((previous) =>
                          toggleItem(previous, item.value, nextChecked === true),
                        )
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>D) Última dilatação</Label>
            <RadioGroup
              name="lastDilation"
              value={lastDilation}
              onValueChange={(value) => {
                setLastDilation(value as TriagePayload["lastDilation"]);
                requestAnimationFrame(() => {
                  scrollToNextInput(summarySectionRef.current);
                  focusSummaryTextarea();
                });
              }}
              className="grid gap-2 md:grid-cols-2"
            >
              {dilationMoments.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                    lastDilation === item.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <RadioGroupItem value={item.value} />
                  <span>{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset ref={summarySectionRef} className="space-y-2">
            <Label htmlFor="oneSentenceSummary">
              E) Conte em uma frase o que mais te incomoda (opcional)
            </Label>
            <Textarea
              ref={summaryTextareaRef}
              id="oneSentenceSummary"
              maxLength={MAX_SUMMARY_LENGTH}
              value={oneSentenceSummary}
              onChange={(event) => setOneSentenceSummary(event.target.value)}
              placeholder="Ex.: percebo embaçamento ao fim do dia."
            />
            <p className="text-right text-xs text-muted-foreground">
              {summaryChars}/{MAX_SUMMARY_LENGTH}
            </p>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            Você não precisa salvar: as orientações são atualizadas
            automaticamente durante o preenchimento.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {hasAnyTriageInput
              ? "Orientações de preparo personalizadas"
              : "Orientações de preparo para a consulta"}
            {hasAnyTriageInput ? (
              <Badge variant={levelConfig[previewResult.level].badgeVariant}>
                Probabilidade {levelLabel}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            As orientações abaixo são informativas e atualizadas em tempo real
            conforme a triagem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A decisão final sobre dilatação é sempre do médico no consultório.
          </p>
          {hasAnyTriageInput ? (
            <>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                Nível atual: <strong className="text-foreground">{levelLabel}</strong>{" "}
                (score informativo {previewResult.score}).
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {previewResult.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Preencha a triagem para visualizar orientações personalizadas de
              preparo.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Este conteúdo não substitui avaliação médica presencial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
