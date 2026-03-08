import { resolvePreBookingSummary } from "@/lib/pre-booking-summary";
import { ResumoDialog } from "./resumo-dialog";

type ResumoInterceptPageProps = {
  searchParams?:
    | Promise<{
        locationId?: string;
        location?: string;
        date?: string;
        time?: string;
        payment?: string;
        waUserId?: string;
      }>
    | {
        locationId?: string;
        location?: string;
        date?: string;
        time?: string;
        payment?: string;
        waUserId?: string;
      };
};

export default async function ResumoInterceptPage({
  searchParams,
}: ResumoInterceptPageProps) {
  const params = (await searchParams) ?? {};
  const summary = await resolvePreBookingSummary(params);

  return (
    <ResumoDialog
      locationId={summary.locationId}
      locationLabel={summary.locationLabel}
      locationAddress={summary.locationAddress}
      date={summary.date}
      dateLabel={summary.dateLabel}
      time={summary.time}
      timeLabel={summary.timeLabel}
      payment={summary.payment}
      waUserId={params.waUserId}
      hasRedactedParams={summary.hasRedactedParams}
      hasInvalidSelection={summary.hasInvalidSelection}
    />
  );
}
