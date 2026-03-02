import { DetailsForm } from "@/components/details-form"
import { requireAuthenticated, requireConfirmedBooking } from "@/lib/access"

export default async function DetalhesPage() {
  await requireAuthenticated("/detalhes")
  await requireConfirmedBooking("/agendar")

  return (
    <section className="mx-auto w-full max-w-3xl">
      <DetailsForm />
    </section>
  )
}
