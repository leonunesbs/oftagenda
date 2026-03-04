import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";

import { BookingFormContainer } from "@/components/booking-form-container";
import { BookingFormFallback } from "@/components/booking-form-fallback";
import { isClerkConfigured } from "@/lib/access";

export default async function EmbedAgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-0 py-2">
      <Suspense fallback={<BookingFormFallback embedMode />}>
        <BookingFormContainer
          isAuthenticated={Boolean(userId)}
          clerkEnabled={clerkEnabled}
          embedMode
        />
      </Suspense>
    </section>
  );
}
