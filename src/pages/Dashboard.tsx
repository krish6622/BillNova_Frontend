import { Async } from "@/components/common/Async";
import { useHealth } from "@/features/health/useHealth";

export default function Dashboard() {
  const { data, isLoading, isError } = useHealth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        BillNova — Phase 1 scaffold (M0). KPI cards arrive in milestone M7.
      </p>

      <div className="mt-6 max-w-sm rounded-lg border bg-card p-4">
        <div className="text-sm font-medium">Backend connectivity</div>
        <Async isLoading={isLoading} isError={isError} errorMessage="Backend unreachable.">
          <div className="mt-1 text-sm text-muted-foreground">
            {data?.status === "ok" ? `✓ ${data.service} is healthy` : "Unknown status"}
          </div>
        </Async>
      </div>
    </div>
  );
}
