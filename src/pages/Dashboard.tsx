import { Async } from "@/components/common/Async";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboard } from "@/features/dashboard/api";
import { formatINR } from "@/lib/utils";

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Today's snapshot of your business.</p>

      <Async isLoading={isLoading} isError={isError} errorMessage="Failed to load dashboard.">
        {data && (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <Kpi label="Today's Sales" value={formatINR(data.today_sales.amount)} sub={`${data.today_sales.count} bill(s)`} />
            <Kpi label="Monthly Sales" value={formatINR(data.monthly_sales.amount)} sub={`${data.monthly_sales.count} bill(s)`} />
            <Kpi label="Bills This Month" value={String(data.bills_this_month)} />
            <Kpi
              label="Subscription Usage"
              value={`${data.subscription.used} / ${data.subscription.limit}`}
              sub={`${data.subscription.percent}% · ${data.subscription.plan ?? "Trial"}`}
              danger={data.subscription.percent >= 100}
              warn={data.subscription.percent >= 80}
            />
            <Kpi label="Low Stock Items" value={String(data.low_stock_count)} danger={data.low_stock_count > 0} />
          </div>
        )}
      </Async>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  warn,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={
            danger
              ? "mt-2 text-2xl font-semibold text-destructive"
              : warn
                ? "mt-2 text-2xl font-semibold text-amber-600"
                : "mt-2 text-2xl font-semibold"
          }
        >
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
