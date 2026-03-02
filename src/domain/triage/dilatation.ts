import type { TriagePayload } from "@/domain/triage/schema"

const reasonScore: Record<TriagePayload["reason"], number> = {
  retina_follow: 2,
  blurred: 2,
  routine: 1,
  pain: 1,
  glaucoma_follow: 1,
  postop: 1,
  glasses: 0,
  other: 0,
}

const conditionScore: Record<TriagePayload["conditions"][number], number> = {
  diabetes: 2,
  prior_surgery: 1,
  glaucoma: 1,
  hypertension: 0,
}

const symptomScore: Record<TriagePayload["symptoms"][number], number> = {
  floaters: 3,
  flashes: 3,
  sudden_loss: 4,
}

export type DilatationLevel = "ALTA" | "POSSIVEL" | "BAIXA"

export type DilatationResult = {
  score: number
  level: DilatationLevel
  checklist: string[]
  advisory: string
}

export function calculateDilatationGuidance(payload: TriagePayload): DilatationResult {
  const conditionsTotal = payload.conditions.reduce((sum, item) => sum + conditionScore[item], 0)
  const symptomsTotal = payload.symptoms.reduce((sum, item) => sum + symptomScore[item], 0)
  const lastDilationAdjustment = payload.lastDilation === "lt6m" ? -1 : 0

  const score = reasonScore[payload.reason] + conditionsTotal + symptomsTotal + lastDilationAdjustment

  let level: DilatationLevel = "BAIXA"
  if (score >= 4) {
    level = "ALTA"
  } else if (score >= 2) {
    level = "POSSIVEL"
  }

  return {
    score,
    level,
    checklist: buildChecklist(payload),
    advisory: "A decisao final sobre dilatacao e sempre feita no consultorio.",
  }
}

function buildChecklist(payload: TriagePayload) {
  const checklist = ["Levar documentos e exames anteriores, se houver."]

  if (payload.symptoms.length > 0) {
    checklist.push("Relatar quando os sintomas iniciaram e como evoluiram.")
  }

  if (payload.conditions.length > 0) {
    checklist.push("Levar lista atual de condicoes clinicas e medicacoes em uso.")
  }

  checklist.push("Separar 1 frase com a principal queixa para agilizar a consulta.")
  return checklist
}
