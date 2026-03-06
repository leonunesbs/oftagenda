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

export const encryptedTriagePayloadSchema = z.object({
  version: z.literal("v1"),
  algorithm: z.literal("RSA-OAEP/AES-GCM-256"),
  keyVersion: z.string().trim().min(1).max(64),
  wrappedKeyB64: z.string().trim().min(1),
  ivB64: z.string().trim().min(1),
  ciphertextB64: z.string().trim().min(1),
})

export type TriagePayload = z.infer<typeof triageSchema>
export type EncryptedTriagePayload = z.infer<typeof encryptedTriagePayloadSchema>
