"use client"

import { useMemo, useState, useTransition } from "react"

import { calculateDilatationGuidance } from "@/domain/triage/dilatation"
import type { TriagePayload } from "@/domain/triage/schema"
import { triageSchema } from "@/domain/triage/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/sonner"

const reasons: Array<{ value: TriagePayload["reason"]; label: string }> = [
  { value: "routine", label: "Revisão de rotina" },
  { value: "glasses", label: "Óculos" },
  { value: "blurred", label: "Visão embaçada" },
  { value: "pain", label: "Dor ocular" },
  { value: "retina_follow", label: "Acompanhamento de retina" },
  { value: "glaucoma_follow", label: "Acompanhamento de glaucoma" },
  { value: "postop", label: "Pós-operatório" },
  { value: "other", label: "Outro motivo" },
]

const conditions: Array<{ value: TriagePayload["conditions"][number]; label: string }> = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hipertensão" },
  { value: "glaucoma", label: "Glaucoma" },
  { value: "prior_surgery", label: "Cirurgia ocular prévia" },
]

const symptoms: Array<{ value: TriagePayload["symptoms"][number]; label: string }> = [
  { value: "floaters", label: "Moscas volantes" },
  { value: "flashes", label: "Flashes de luz" },
  { value: "sudden_loss", label: "Perda súbita de visão" },
]

const dilationMoments: Array<{ value: TriagePayload["lastDilation"]; label: string }> = [
  { value: "lt6m", label: "Há menos de 6 meses" },
  { value: "6to12m", label: "Entre 6 e 12 meses" },
  { value: "gt1y", label: "Há mais de 1 ano" },
  { value: "unknown", label: "Não sei informar" },
]

function toggleItem<T extends string>(values: T[], target: T, checked: boolean) {
  if (checked) {
    return values.includes(target) ? values : [...values, target]
  }
  return values.filter((item) => item !== target)
}

export function DetailsForm() {
  const [reason, setReason] = useState<TriagePayload["reason"]>("routine")
  const [selectedConditions, setSelectedConditions] = useState<TriagePayload["conditions"]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<TriagePayload["symptoms"]>([])
  const [lastDilation, setLastDilation] = useState<TriagePayload["lastDilation"]>("unknown")
  const [oneSentenceSummary, setOneSentenceSummary] = useState("")
  const [isSubmitting, startSubmittingTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submittedPayload, setSubmittedPayload] = useState<TriagePayload | null>(null)
  const [serverResult, setServerResult] = useState<{
    score: number
    level: "ALTA" | "POSSIVEL" | "BAIXA"
    advisory: string
  } | null>(null)

  const localResult = useMemo(
    () => (submittedPayload ? calculateDilatationGuidance(submittedPayload) : null),
    [submittedPayload],
  )
  const result = serverResult
    ? { ...localResult, ...serverResult, checklist: localResult?.checklist ?? [] }
    : localResult

  async function handleSubmit() {
    setError(null)

    const payload: TriagePayload = {
      reason,
      conditions: selectedConditions,
      symptoms: selectedSymptoms,
      lastDilation,
      oneSentenceSummary: oneSentenceSummary.trim() || undefined,
    }

    const parsed = triageSchema.safeParse(payload)
    if (!parsed.success) {
      setError("Revise os campos antes de enviar.")
      return
    }

    startSubmittingTransition(async () => {
      try {
        const response = await fetch("/api/details/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        })

        if (!response.ok) {
          throw new Error("Não foi possível salvar os detalhes.")
        }
        const data = (await response.json()) as {
          result?: { score: number; level: "ALTA" | "POSSIVEL" | "BAIXA"; advisory: string }
        }

        setSubmittedPayload(parsed.data)
        setServerResult(data.result ?? null)
        toast("Detalhes enviados com sucesso.")
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao enviar."
        setError(message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Detalhes da sua consulta</CardTitle>
          <CardDescription>Opcional - isso ajuda a preparar sua consulta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <Label>A) Motivo principal</Label>
            <RadioGroup>
              {reasons.map((item) => (
                <label
                  key={item.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <RadioGroupItem
                    name="reason"
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>B) Condições</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {conditions.map((item) => {
                const checked = selectedConditions.includes(item.value)
                return (
                  <label key={item.value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onChange={(event) =>
                        setSelectedConditions(
                          toggleItem(selectedConditions, item.value, event.currentTarget.checked),
                        )
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>C) Sintomas recentes</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {symptoms.map((item) => {
                const checked = selectedSymptoms.includes(item.value)
                return (
                  <label key={item.value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onChange={(event) =>
                        setSelectedSymptoms(
                          toggleItem(selectedSymptoms, item.value, event.currentTarget.checked),
                        )
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>D) Última dilatação</Label>
            <RadioGroup className="grid gap-2 md:grid-cols-2">
              {dilationMoments.map((item) => (
                <label
                  key={item.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <RadioGroupItem
                    name="lastDilation"
                    checked={lastDilation === item.value}
                    onChange={() => setLastDilation(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset className="space-y-2">
            <Label htmlFor="oneSentenceSummary">
              E) Conte em uma frase o que mais te incomoda (opcional)
            </Label>
            <Textarea
              id="oneSentenceSummary"
              maxLength={240}
              value={oneSentenceSummary}
              onChange={(event) => setOneSentenceSummary(event.target.value)}
              placeholder="Ex.: percebo embaçamento ao fim do dia."
            />
          </fieldset>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Salvar detalhes"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Orientação de dilatação: {result.level}</CardTitle>
            <CardDescription>Score calculado: {result.score}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{result.advisory}</p>
            <p className="text-xs text-muted-foreground">Isso não substitui avaliação médica.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
