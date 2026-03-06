"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { calculateDilatationGuidance } from "@/domain/triage/dilatation";
import type { TriagePayload } from "@/domain/triage/schema";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DASHBOARD_STORAGE_KEY = "oftagenda:patient-panel:v1";

type MainReasonOption = {
  value: TriagePayload["reason"];
  label: string;
};

type MultiOption = {
  value: string;
  label: string;
};

type PatientPanelFormProps = {
  initialAppointment: {
    location: string;
    date: string;
    time: string;
    consultationType: string;
    status: string;
  };
};

type CompanionOption = "acompanhado" | "sozinho" | "a_confirmar";
type DriveOption = "sim" | "nao" | "nao_se_aplica";
type ExtraTimeOption = "sim" | "parcial" | "nao";
type LastDilationOption = TriagePayload["lastDilation"];
type ContactPreferenceOption = "whatsapp" | "ligacao" | "email";
type CommunicationStyleOption =
  | "detalhado"
  | "objetivo"
  | "equilibrado"
  | "a_confirmar";
type AnxietyLevelOption = "baixa" | "moderada" | "alta";
type DrinkPreferenceOption =
  | "agua"
  | "cafe"
  | "cha"
  | "sem_preferencia"
  | "nao_deseja";

const reasonOptions: MainReasonOption[] = [
  { value: "routine", label: "Consulta de rotina" },
  { value: "glasses", label: "Atualizar grau" },
  { value: "blurred", label: "Visão embaçada" },
  { value: "pain", label: "Dor ocular" },
  { value: "retina_follow", label: "Acompanhamento de retina" },
  { value: "glaucoma_follow", label: "Acompanhamento de glaucoma" },
  { value: "postop", label: "Pós-operatório" },
  { value: "other", label: "Outro" },
];

const conditionOptions: Array<{
  value: TriagePayload["conditions"][number];
  label: string;
}> = [
  { value: "diabetes", label: "Diabetes" },
  { value: "glaucoma", label: "Glaucoma" },
  { value: "prior_surgery", label: "Cirurgia ocular prévia" },
  { value: "hypertension", label: "Pressão alta" },
];

const symptomOptions: Array<{
  value: TriagePayload["symptoms"][number];
  label: string;
}> = [
  { value: "floaters", label: "Moscas volantes ou manchas" },
  { value: "flashes", label: "Clarões" },
  { value: "sudden_loss", label: "Perda súbita de visão" },
];

const lastDilationOptions: Array<{ value: LastDilationOption; label: string }> =
  [
    { value: "lt6m", label: "Há menos de 6 meses" },
    { value: "6to12m", label: "Entre 6 e 12 meses" },
    { value: "gt1y", label: "Há mais de 1 ano" },
    { value: "unknown", label: "Não lembro" },
  ];

const companionOptions: Array<{ value: CompanionOption; label: string }> = [
  { value: "acompanhado", label: "Vir acompanhado" },
  { value: "sozinho", label: "Vir sozinho" },
  { value: "a_confirmar", label: "A confirmar no dia" },
];

const driveOptions: Array<{ value: DriveOption; label: string }> = [
  { value: "sim", label: "Pretende dirigir" },
  { value: "nao", label: "Não pretende dirigir" },
  { value: "nao_se_aplica", label: "Sem direção no dia" },
];

const extraTimeOptions: Array<{ value: ExtraTimeOption; label: string }> = [
  { value: "sim", label: "Tempo extra reservado" },
  { value: "parcial", label: "Tempo parcial reservado" },
  { value: "nao", label: "Sem tempo extra reservado" },
];

const durationOptions: MultiOption[] = [
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "60 minutos" },
  { value: "90", label: "90 minutos" },
];

const contactPreferenceOptions: Array<{
  value: ContactPreferenceOption;
  label: string;
}> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligacao" },
  { value: "email", label: "E-mail" },
];

const communicationStyleOptions: Array<{
  value: CommunicationStyleOption;
  label: string;
}> = [
  { value: "detalhado", label: "Explicações detalhadas" },
  { value: "objetivo", label: "Explicações objetivas" },
  { value: "equilibrado", label: "Equilíbrio entre detalhe e objetividade" },
  { value: "a_confirmar", label: "Prefiro decidir no dia" },
];

const anxietyLevelOptions: Array<{ value: AnxietyLevelOption; label: string }> = [
  { value: "baixa", label: "Baixa ansiedade" },
  { value: "moderada", label: "Ansiedade moderada" },
  { value: "alta", label: "Ansiedade alta" },
];

const drinkPreferenceOptions: Array<{
  value: DrinkPreferenceOption;
  label: string;
}> = [
  { value: "agua", label: "Água" },
  { value: "cafe", label: "Café" },
  { value: "cha", label: "Chá" },
  { value: "sem_preferencia", label: "Sem preferência" },
  { value: "nao_deseja", label: "Não desejo bebida" },
];

function toggleArrayItem<T extends string>(
  values: T[],
  target: T,
  checked: boolean,
) {
  if (checked) {
    return values.includes(target) ? values : [...values, target];
  }
  return values.filter((item) => item !== target);
}

function formatStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmada";
  if (status === "rescheduled") return "Reagendada";
  if (status === "pending") return "A confirmar";
  return status;
}

export function PatientPanelForm({
  initialAppointment,
}: PatientPanelFormProps) {
  const location = initialAppointment.location;
  const date = initialAppointment.date;
  const time = initialAppointment.time;
  const consultationType = initialAppointment.consultationType;
  const [durationMinutes, setDurationMinutes] = useState("60");
  const status = initialAppointment.status;

  const [companionPlan, setCompanionPlan] =
    useState<CompanionOption>("a_confirmar");
  const [drivePlan, setDrivePlan] = useState<DriveOption>("nao_se_aplica");
  const [extraTimePlan, setExtraTimePlan] =
    useState<ExtraTimeOption>("parcial");

  const [hasExams, setHasExams] = useState(false);
  const [examList, setExamList] = useState("");

  const [reason, setReason] = useState<TriagePayload["reason"]>("routine");
  const [conditions, setConditions] = useState<TriagePayload["conditions"]>([]);
  const [symptoms, setSymptoms] = useState<TriagePayload["symptoms"]>([]);
  const [lastDilation, setLastDilation] =
    useState<LastDilationOption>("unknown");
  const [oneSentenceSummary, setOneSentenceSummary] = useState("");

  const [contactPreference, setContactPreference] =
    useState<ContactPreferenceOption>("whatsapp");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [continuousDrops, setContinuousDrops] = useState(false);
  const [isFirstConsultation, setIsFirstConsultation] = useState(false);
  const [consultationFocus, setConsultationFocus] = useState("");
  const [communicationStyle, setCommunicationStyle] =
    useState<CommunicationStyleOption>("equilibrado");
  const [anxietyLevel, setAnxietyLevel] = useState<AnxietyLevelOption>("baixa");
  const [preferredMusic, setPreferredMusic] = useState("");
  const [drinkPreference, setDrinkPreference] =
    useState<DrinkPreferenceOption>("agua");
  const [otherComfortPreference, setOtherComfortPreference] = useState("");

  useEffect(() => {
    const draftRaw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!draftRaw) {
      return;
    }

    try {
      const draft = JSON.parse(draftRaw) as Partial<{
        durationMinutes: string;
        companionPlan: CompanionOption;
        drivePlan: DriveOption;
        extraTimePlan: ExtraTimeOption;
        hasExams: boolean;
        examList: string;
        contactPreference: ContactPreferenceOption;
        accessibilityNeeds: string;
        continuousDrops: boolean;
        isFirstConsultation: boolean;
        consultationFocus: string;
        communicationStyle: CommunicationStyleOption;
        anxietyLevel: AnxietyLevelOption;
        preferredMusic: string;
        drinkPreference: DrinkPreferenceOption;
        otherComfortPreference: string;
      }>;

      if (typeof draft.durationMinutes === "string")
        setDurationMinutes(draft.durationMinutes);
      if (draft.companionPlan) setCompanionPlan(draft.companionPlan);
      if (draft.drivePlan) setDrivePlan(draft.drivePlan);
      if (draft.extraTimePlan) setExtraTimePlan(draft.extraTimePlan);
      if (typeof draft.hasExams === "boolean") setHasExams(draft.hasExams);
      if (typeof draft.examList === "string") setExamList(draft.examList);
      if (draft.contactPreference)
        setContactPreference(draft.contactPreference);
      if (typeof draft.accessibilityNeeds === "string")
        setAccessibilityNeeds(draft.accessibilityNeeds);
      if (typeof draft.continuousDrops === "boolean")
        setContinuousDrops(draft.continuousDrops);
      if (typeof draft.isFirstConsultation === "boolean")
        setIsFirstConsultation(draft.isFirstConsultation);
      if (typeof draft.consultationFocus === "string")
        setConsultationFocus(draft.consultationFocus);
      if (draft.communicationStyle)
        setCommunicationStyle(draft.communicationStyle);
      if (draft.anxietyLevel) setAnxietyLevel(draft.anxietyLevel);
      if (typeof draft.preferredMusic === "string")
        setPreferredMusic(draft.preferredMusic);
      if (draft.drinkPreference) setDrinkPreference(draft.drinkPreference);
      if (typeof draft.otherComfortPreference === "string")
        setOtherComfortPreference(draft.otherComfortPreference);
    } catch {
      window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        location,
        date,
        time,
        consultationType,
        durationMinutes,
        companionPlan,
        drivePlan,
        extraTimePlan,
        hasExams,
        examList,
        contactPreference,
        accessibilityNeeds,
        continuousDrops,
        isFirstConsultation,
        consultationFocus,
        communicationStyle,
        anxietyLevel,
        preferredMusic,
        drinkPreference,
        otherComfortPreference,
      }),
    );
  }, [
    location,
    date,
    time,
    consultationType,
    durationMinutes,
    status,
    companionPlan,
    drivePlan,
    extraTimePlan,
    hasExams,
    examList,
    contactPreference,
    accessibilityNeeds,
    continuousDrops,
    isFirstConsultation,
    consultationFocus,
    communicationStyle,
    anxietyLevel,
    preferredMusic,
    drinkPreference,
    otherComfortPreference,
  ]);

  const dilatationResult = useMemo(
    () =>
      calculateDilatationGuidance({
        reason,
        conditions,
        symptoms,
        lastDilation,
        oneSentenceSummary: oneSentenceSummary.trim() || undefined,
      }),
    [reason, conditions, symptoms, lastDilation, oneSentenceSummary],
  );

  const probabilityLabel =
    dilatationResult.level === "ALTA"
      ? "Alta"
      : dilatationResult.level === "POSSIVEL"
        ? "Possível"
        : "Baixa";

  const preparationChecklist = useMemo(() => {
    const checklist = [
      "Chegar com antecedência",
      "Levar óculos atuais",
      "Levar lista de colírios em uso",
      "Levar exames anteriores",
    ];

    if (dilatationResult.level !== "BAIXA" || extraTimePlan !== "nao") {
      checklist.push("Reservar tempo extra no dia da consulta");
    }

    return checklist;
  }, [dilatationResult.level, extraTimePlan]);

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Painel do paciente</CardTitle>
          <CardDescription>
            Formulário de organização da consulta com seletores rápidos e ações
            diretas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">
              Dados essenciais da consulta
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Local de atendimento</Label>
                <Input
                  id="location"
                  value={location}
                  readOnly
                  disabled
                  placeholder="Ex.: Fortaleza - CE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationType">Tipo de consulta</Label>
                <Input
                  id="consultationType"
                  value={consultationType}
                  readOnly
                  disabled
                  placeholder="Ex.: Consulta oftalmológica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <Input id="time" type="time" value={time} readOnly disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duração estimada em 30 minutos</Label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      durationMinutes === option.value ? "default" : "outline"
                    }
                    onClick={() => setDurationMinutes(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Input value={formatStatusLabel(status)} readOnly disabled />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  href="https://wa.me/5585999853811?text=Ol%C3%A1!%20Preciso%20de%20apoio%20com%20minha%20consulta."
                  target="_blank"
                  rel="noreferrer"
                >
                  Contato no WhatsApp
                </Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">Pré-consulta</h3>
            <p className="text-xs text-muted-foreground">
              Coletamos apenas o que ajuda a personalizar o atendimento no dia:
              logística, contexto clínico e preferências de comunicação.
            </p>

            <div className="space-y-2">
              <Label>Acompanhante e direção</Label>
              <div className="flex flex-wrap gap-2">
                {companionOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      companionPlan === option.value ? "default" : "outline"
                    }
                    onClick={() => setCompanionPlan(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {driveOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={drivePlan === option.value ? "default" : "outline"}
                    onClick={() => setDrivePlan(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tempo disponível no dia</Label>
              <div className="flex flex-wrap gap-2">
                {extraTimeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      extraTimePlan === option.value ? "default" : "outline"
                    }
                    onClick={() => setExtraTimePlan(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasExams"
                  checked={hasExams}
                  onChange={(event) => setHasExams(event.currentTarget.checked)}
                />
                <Label htmlFor="hasExams">Exames para levar</Label>
              </div>
              <Textarea
                value={examList}
                onChange={(event) => setExamList(event.target.value)}
                placeholder="Quais exames você tem para levar"
                disabled={!hasExams}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultationFocus">
                Objetivo principal desta consulta
              </Label>
              <Textarea
                id="consultationFocus"
                value={consultationFocus}
                onChange={(event) => setConsultationFocus(event.target.value)}
                placeholder="Ex.: confirmar grau para dirigir à noite e revisar sensibilidade à luz."
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">
              Triagem para previsão de dilatação
            </h3>

            <div className="space-y-2">
              <Label>Motivo principal</Label>
              <div className="flex flex-wrap gap-2">
                {reasonOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={reason === option.value ? "default" : "outline"}
                    onClick={() => setReason(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condições</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {conditionOptions.map((option) => {
                  const checked = conditions.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm",
                        checked && "border-primary bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(event) =>
                          setConditions(
                            toggleArrayItem(
                              conditions,
                              option.value,
                              event.currentTarget.checked,
                            ),
                          )
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sintomas recentes</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {symptomOptions.map((option) => {
                  const checked = symptoms.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm",
                        checked && "border-primary bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(event) =>
                          setSymptoms(
                            toggleArrayItem(
                              symptoms,
                              option.value,
                              event.currentTarget.checked,
                            ),
                          )
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Última dilatação</Label>
              <div className="flex flex-wrap gap-2">
                {lastDilationOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      lastDilation === option.value ? "default" : "outline"
                    }
                    onClick={() => setLastDilation(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneSentenceSummary">
                Em uma frase, o que mais incomoda?
              </Label>
              <Textarea
                id="oneSentenceSummary"
                maxLength={240}
                value={oneSentenceSummary}
                onChange={(event) => setOneSentenceSummary(event.target.value)}
                placeholder="Resumo rápido da principal queixa"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">Saídas do painel</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border/70 p-3 text-sm">
                <p className="font-medium">Resumo da consulta</p>
                <p>
                  Data e horário:{" "}
                  {date && time ? `${date} às ${time}` : "A confirmar"}
                </p>
                <p>Local: {location || "A confirmar"}</p>
                <p>Tipo: {consultationType || "Consulta oftalmológica"}</p>
                <p>Status: {formatStatusLabel(status)}</p>
              </div>
              <div className="space-y-2 rounded-lg border border-border/70 p-3 text-sm">
                <p className="font-medium">Previsão de dilatação</p>
                <p>Nível de probabilidade: {probabilityLabel}</p>
                <p className="text-muted-foreground">
                  Mensagem conservadora: existe chance de dilatação conforme
                  avaliação clínica. A decisão final acontece no consultório.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link
                  href="https://wa.me/5585999853811?text=Ol%C3%A1!%20Preciso%20falar%20com%20a%20secretaria%20sobre%20minha%20consulta."
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar com a secretária
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="#remarcacao-consulta">Ir para remarcação</Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">Checklist automático</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {preparationChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">O que acontece na consulta</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Dilatação pode deixar a visão embaçada por algumas horas.</li>
              <li>O tempo total varia conforme necessidade de exame.</li>
              <li>Exames podem ser solicitados conforme avaliação.</li>
              <li>Acompanhante é recomendado quando houver dilatação.</li>
              <li>
                Seus dados são usados apenas para organizar o atendimento.
              </li>
              <li>A decisão final sobre dilatação é sempre no consultório.</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4 rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-medium">
              Inputs opcionais para fases futuras
            </h3>
            <div className="space-y-2">
              <Label>Preferência de contato</Label>
              <div className="flex flex-wrap gap-2">
                {contactPreferenceOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      contactPreference === option.value ? "default" : "outline"
                    }
                    onClick={() => setContactPreference(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessibilityNeeds">
                Necessidades de acessibilidade
              </Label>
              <Textarea
                id="accessibilityNeeds"
                value={accessibilityNeeds}
                onChange={(event) => setAccessibilityNeeds(event.target.value)}
                placeholder="Ex.: apoio de mobilidade, prioridade de acesso"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={continuousDrops}
                  onChange={(event) =>
                    setContinuousDrops(event.currentTarget.checked)
                  }
                />
                Uso de colírios contínuos
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={isFirstConsultation}
                  onChange={(event) =>
                    setIsFirstConsultation(event.currentTarget.checked)
                  }
                />
                Primeira consulta com o médico
              </label>
            </div>

            <details className="rounded-lg border border-border/70 p-3">
              <summary className="cursor-pointer list-none text-sm font-medium">
                Recursos adicionais (opcional)
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Preferências de conforto para tornar sua experiência mais
                tranquila no consultório.
              </p>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Como prefere receber explicações?</Label>
                  <div className="flex flex-wrap gap-2">
                    {communicationStyleOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          communicationStyle === option.value
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setCommunicationStyle(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nível de ansiedade para o atendimento</Label>
                  <div className="flex flex-wrap gap-2">
                    {anxietyLevelOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          anxietyLevel === option.value ? "default" : "outline"
                        }
                        onClick={() => setAnxietyLevel(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredMusic">
                    Música ou estilo musical preferido
                  </Label>
                  <Input
                    id="preferredMusic"
                    value={preferredMusic}
                    onChange={(event) => setPreferredMusic(event.target.value)}
                    placeholder="Ex.: instrumental, MPB, ambiente silencioso"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferência de bebida</Label>
                  <div className="flex flex-wrap gap-2">
                    {drinkPreferenceOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          drinkPreference === option.value
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setDrinkPreference(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherComfortPreference">
                    Outra preferência de conforto
                  </Label>
                  <Textarea
                    id="otherComfortPreference"
                    value={otherComfortPreference}
                    onChange={(event) =>
                      setOtherComfortPreference(event.target.value)
                    }
                    placeholder="Ex.: prefiro aguardar em local com menos luz ou com acompanhante."
                  />
                </div>
              </div>
            </details>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
