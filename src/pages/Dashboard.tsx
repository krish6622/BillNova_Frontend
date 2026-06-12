import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Crown,
  Gauge,
  IndianRupee,
  Package,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/features/dashboard/api";
import { useLowStock } from "@/features/inventory/api";
import { useReport } from "@/features/reports/api";
import { useSales } from "@/features/sales/api";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useDashboard();
  const { data: sales } = useSales(1, 6);
  const { data: gst } = useReport("gst-summary", {});
  const { data: lowStock } = useLowStock();

  const gstTotal = ((gst as { rows?: { total_gst: number }[] } | undefined)?.rows ?? []).reduce(
    (s, r) => s + r.total_gst,
    0,
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here's how your business is doing today.</p>
      </motion.div>

      {/* KPI row */}
      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi i={0} icon={IndianRupee} label="Today's Sales" value={formatINR(data.today_sales.amount)} sub={`${data.today_sales.count} bill(s)`} tint="from-emerald-500/20 to-emerald-500/5" />
          <Kpi i={1} icon={TrendingUp} label="Monthly Revenue" value={formatINR(data.monthly_sales.amount)} sub={`${data.monthly_sales.count} bills this month`} tint="from-indigo-500/20 to-indigo-500/5" />
          <Kpi i={2} icon={ReceiptText} label="Bills Generated" value={String(data.bills_this_month)} sub="this month" tint="from-violet-500/20 to-violet-500/5" />
          <Kpi
            i={3}
            icon={Gauge}
            label="Subscription Usage"
            value={`${data.subscription.used}/${data.subscription.limit}`}
            sub={`${data.subscription.percent}% · ${data.subscription.plan ?? "Trial"}`}
            tint="from-blue-500/20 to-blue-500/5"
            meter={data.subscription.percent}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales trend */}
        <motion.div variants={fade} custom={4} initial="hidden" animate="show" className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Sales Trend</h2>
                <p className="text-xs text-muted-foreground">Daily revenue this month</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                {data ? formatINR(data.monthly_sales.amount) : "—"} total
              </span>
            </div>
            <div className="h-64">
              {data && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Top products */}
        <motion.div variants={fade} custom={5} initial="hidden" animate="show">
          <GlassCard className="h-full p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><Crown className="h-4 w-4 text-amber-400" /> Top Products</h2>
            {data && data.top_products.length > 0 ? (
              <ul className="space-y-3">
                {data.top_products.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.quantity} sold</div>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint icon={Package} text="No sales yet this month." />
            )}
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent bills */}
        <motion.div variants={fade} custom={6} initial="hidden" animate="show" className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="mb-4 font-semibold">Recent Bills</h2>
            {sales && sales.items.length > 0 ? (
              <div className="divide-y divide-white/5">
                {sales.items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300"><ReceiptText className="h-4 w-4" /></span>
                      <div>
                        <div className="font-mono text-sm">{s.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("en-IN")}</div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(s.grand_total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint icon={ReceiptText} text="No bills yet — head to the POS to create one." />
            )}
          </GlassCard>
        </motion.div>

        {/* GST + low stock */}
        <motion.div variants={fade} custom={7} initial="hidden" animate="show" className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="mb-3 font-semibold">GST Summary</h2>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Tax collected (MTD)</span>
              <span className="text-xl font-bold text-emerald-400">{formatINR(gstTotal)}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Low Stock
            </h2>
            {lowStock && lowStock.length > 0 ? (
              <ul className="space-y-2">
                {lowStock.slice(0, 5).map((p) => (
                  <li key={p.product_id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="font-semibold text-amber-400">{p.current_stock}/{p.reorder_level}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint icon={Boxes} text="All stock levels are healthy." />
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function Kpi({
  i,
  icon: Icon,
  label,
  value,
  sub,
  tint,
  meter,
}: {
  i: number;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tint: string;
  meter?: number;
}) {
  return (
    <motion.div variants={fade} custom={i} initial="hidden" animate="show">
      <GlassCard hover className="p-5">
        <div className="flex items-start justify-between">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} ring-1 ring-white/10`}>
            <Icon className="h-5 w-5 text-white" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-4 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label} · {sub}</div>
        {meter !== undefined && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${meter >= 100 ? "bg-red-500" : meter >= 80 ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
              style={{ width: `${Math.min(100, meter)}%` }}
            />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1330] px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-indigo-300">{formatINR(payload[0].value)}</div>
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
