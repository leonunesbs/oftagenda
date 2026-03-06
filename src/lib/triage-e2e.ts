import type { EncryptedTriagePayload, TriagePayload } from "@/domain/triage/schema"
import { clientEnv } from "@/lib/env/client"

const RSA_OAEP_ALGORITHM = "RSA-OAEP/AES-GCM-256"
const RSA_OAEP_HASH = "SHA-256"

function toBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function getRequiredPublicKey() {
  const publicKey = clientEnv.NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY?.trim()
  if (!publicKey) {
    throw new Error("Configuração de segurança ausente. Contate o suporte.")
  }
  return publicKey
}

function getKeyVersion() {
  return clientEnv.NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION?.trim() || "v1"
}

async function importPublicKey(spkiBase64: string) {
  const keyBuffer = Uint8Array.from(atob(spkiBase64), (char) => char.charCodeAt(0))
  return window.crypto.subtle.importKey(
    "spki",
    keyBuffer,
    { name: "RSA-OAEP", hash: RSA_OAEP_HASH },
    false,
    ["encrypt"],
  )
}

export async function encryptTriagePayload(payload: TriagePayload): Promise<EncryptedTriagePayload> {
  if (typeof window === "undefined") {
    throw new Error("Criptografia da triagem indisponível neste contexto.")
  }
  if (!window.crypto?.subtle) {
    throw new Error("Navegador sem suporte para criptografia segura.")
  }

  const publicKeyBase64 = getRequiredPublicKey()
  const publicKey = await importPublicKey(publicKeyBase64)

  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"])
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const encryptedBytes = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext)
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey)
  const wrappedKey = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey)

  return {
    version: "v1",
    algorithm: RSA_OAEP_ALGORITHM,
    keyVersion: getKeyVersion(),
    wrappedKeyB64: toBase64(new Uint8Array(wrappedKey)),
    ivB64: toBase64(iv),
    ciphertextB64: toBase64(new Uint8Array(encryptedBytes)),
  }
}
