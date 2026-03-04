import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/access";
import { BookingFormContainer } from "@/components/booking-form-container";
import { BookingFormFallback } from "@/components/booking-form-fallback";

export default async function AgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <Suspense fallback={<BookingFormFallback />}>
        <BookingFormContainer
          isAuthenticated={Boolean(userId)}
          clerkEnabled={clerkEnabled}
        />
      </Suspense>
    </section>
  );
}
