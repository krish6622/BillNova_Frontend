import { Async } from "@/components/common/Async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { usePlans, useSubscription } from "@/features/subscription/api";

export default function Subscription() {
  const { data, isLoading, isError } = useSubscription();
  const { data: plans } = usePlans();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Subscription</h1>
      <p className="text-sm text-muted-foreground">Your plan and monthly bill usage.</p>

      <Async isLoading={isLoading} isError={isError}>
        {data && (
          <div className="mt-6 grid max-w-3xl gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{data.plan ?? "Trial"}</span>
                  <span className="text-sm font-normal text-muted-foreground">{data.status}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">This month</span>
                  <span>
                    {data.usage.bills_count} / {data.monthly_bill_limit} bills ({data.usage.percent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      data.usage.percent >= 100
                        ? "h-full bg-destructive"
                        : data.usage.percent >= 80
                          ? "h-full bg-amber-500"
                          : "h-full bg-primary"
                    }
                    style={{ width: `${Math.min(100, data.usage.percent)}%` }}
                  />
                </div>
                {data.period_end && (
                  <div className="text-xs text-muted-foreground">Renews / ends on {data.period_end}</div>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  Plans are activated manually. To upgrade, contact support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>Plan</TH>
                      <TH className="text-right">Bills / month</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {plans?.map((p) => (
                      <TR key={p.id}>
                        <TD className={data.plan === p.name ? "font-semibold" : ""}>
                          {p.name} {data.plan === p.name && "(current)"}
                        </TD>
                        <TD className="text-right">{p.monthly_bill_limit.toLocaleString("en-IN")}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
