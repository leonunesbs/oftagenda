export const BILLING_ENABLED = false

export function isBillingEnabled() {
  // TODO: validar entitlements do Clerk quando billing for habilitado.
  return BILLING_ENABLED
}
