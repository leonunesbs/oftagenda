"use client";

import { useRouter } from "next/navigation";

import { AdminAvailabilityCreateDialog } from "@/components/admin-availability-create-dialog";

export default function AdminAvailabilityCreateModalPage() {
  const router = useRouter();

  return (
    <AdminAvailabilityCreateDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    />
  );
}
