import { BookingForm } from "@/components/booking-form";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/access";

export default async function AgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <BookingForm isAuthenticated={Boolean(userId)} clerkEnabled={clerkEnabled} />
    </section>
  );
}
