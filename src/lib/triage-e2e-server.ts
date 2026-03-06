import type { EncryptedTriagePayload, TriagePayload } from "@/domain/triage/schema"
import { triageSchema } from "@/domain/triage/schema"
import { serverEnv } from "@/lib/env/server"

function decodeBase64ToBytes(input: string) {
  return Uint8Array.from(Buffer.from(input, "base64"))
}

function pemToDerBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "")
  return decodeBase64ToBytes(base64)
}

function getRequiredPrivateKey() {
  const privateKey = serverEnv.TRIAGE_E2E_PRIVATE_KEY?.trim()
  if (!privateKey) {
    throw new Error("TRIAGE_E2E_PRIVATE_KEY ausente no ambiente do servidor.")
  }
  return privateKey
}

async function importPrivateKey() {
  const rawPrivateKey = getRequiredPrivateKey().replace(/\\n/g, "\n")
  const keyBytes = rawPrivateKey.includes("BEGIN PRIVATE KEY")
    ? pemToDerBytes(rawPrivateKey)
    : decodeBase64ToBytes(rawPrivateKey)

  return crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  )
}

export async function decryptTriagePayload(encryptedPayload: EncryptedTriagePayload): Promise<TriagePayload> {
  const privateKey = await importPrivateKey()

  const wrappedKey = decodeBase64ToBytes(encryptedPayload.wrappedKeyB64)
  const iv = decodeBase64ToBytes(encryptedPayload.ivB64)
  const ciphertext = decodeBase64ToBytes(encryptedPayload.ciphertextB64)
  const rawAesKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, wrappedKey)
  const aesKey = await crypto.subtle.importKey("raw", rawAesKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"])
  const plaintextBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext)
  const plaintext = new TextDecoder().decode(plaintextBuffer)

  const parsed = triageSchema.safeParse(JSON.parse(plaintext))
  if (!parsed.success) {
    throw new Error("Payload de triagem descriptografado inválido.")
  }

  return parsed.data
}
