"use server";

import { revalidatePath } from "next/cache";
import { api } from "@convex/_generated/api";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

function toDateValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function upsertPatientBirthDateAction(formData: FormData) {
  const { client } = await getAuthenticatedConvexHttpClient();
  const birthDate = toDateValue(formData.get("birthDate"));

  const mutationRef = (api as unknown as {
    patients: {
      upsertCurrentPatientBirthDate: typeof api.patients.getCurrentPatient;
    };
  }).patients.upsertCurrentPatientBirthDate;

  await client.mutation(mutationRef, {
    birthDate: birthDate || undefined,
  });

  revalidatePath("/dashboard");
}
