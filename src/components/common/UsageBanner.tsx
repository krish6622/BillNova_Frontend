import { useSubscription } from "@/features/subscription/api";

/** Global banner surfaced at 80% (warning) and 100%/inactive (block). */
export function UsageBanner() {
  const { data } = useSubscription();
  if (!data?.warning) return null;

  const isBlocked = data.warning === "LIMIT_REACHED";
  const msg = isBlocked
    ? `Monthly bill limit reached (${data.usage.bills_count}/${data.monthly_bill_limit}). New bills are blocked — contact support to upgrade your plan.`
    : `You've used ${data.usage.percent}% of your monthly bills (${data.usage.bills_count}/${data.monthly_bill_limit}). Consider upgrading soon.`;

  return (
    <div
      className={
        isBlocked
          ? "border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive"
          : "border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-800"
      }
    >
      {msg}
    </div>
  );
}
