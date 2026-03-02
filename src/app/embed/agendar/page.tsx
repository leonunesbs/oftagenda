import { auth } from "@clerk/nextjs/server";

import { BookingForm } from "@/components/booking-form";
import { isClerkConfigured } from "@/lib/access";

export default async function EmbedAgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-0 py-2">
      <BookingForm
        isAuthenticated={Boolean(userId)}
        clerkEnabled={clerkEnabled}
        embedMode
      />
    </section>
  );
}
