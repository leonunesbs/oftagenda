import { z } from "zod/v4"

export const reasonSchema = z.enum([
  "routine",
  "glasses",
  "blurred",
  "pain",
  "retina_follow",
  "glaucoma_follow",
  "postop",
  "other",
])

export const conditionSchema = z.enum([
  "diabetes",
  "hypertension",
  "glaucoma",
  "prior_surgery",
])

export const symptomSchema = z.enum(["floaters", "flashes", "sudden_loss"])

export const lastDilationSchema = z.enum(["lt6m", "6to12m", "gt1y", "unknown"])

export const triageSchema = z.object({
  reason: reasonSchema,
  conditions: z.array(conditionSchema).default([]),
  symptoms: z.array(symptomSchema).default([]),
  lastDilation: lastDilationSchema,
  oneSentenceSummary: z.string().trim().max(240).optional(),
})

export type TriagePayload = z.infer<typeof triageSchema>
