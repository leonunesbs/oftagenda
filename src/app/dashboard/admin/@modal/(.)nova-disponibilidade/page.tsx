"use client";

import { useRouter } from "next/navigation";

import { AdminAvailabilityCreateDialog } from "@/components/admin-availability-create-dialog";
import { closeParallelRoute } from "@/lib/parallel-route-navigation";

export default function AdminAvailabilityCreateModalPage() {
  const router = useRouter();

  return (
    <AdminAvailabilityCreateDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          closeParallelRoute(router, "/dashboard/admin/disponibilidade");
        }
      }}
    />
  );
}
