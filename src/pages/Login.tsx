import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Package,
  Receipt,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  { icon: Zap, label: "Fast Billing" },
  { icon: Package, label: "Inventory Tracking" },
  { icon: FileText, label: "GST Ready" },
  { icon: BarChart3, label: "Auditor Reports" },
];

const TESTIMONIALS = [
  { quote: "Billing is now super fast and effortless. BillNova changed how we run our shop.", name: "Ramesh Kumar", role: "Textile Shop Owner" },
  { quote: "GST reports that used to take hours are ready in one click. My auditor loves it.", name: "Anita Shah", role: "Fancy Store Owner" },
  { quote: "Stock alerts mean we never run out of bestsellers anymore.", name: "Suresh Nair", role: "Footwear Store Owner" },
];

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values, remember);
      const to = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(to, { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    // Auth is always the dark "luxury" brand experience, regardless of app theme.
    <div className="dark relative flex min-h-screen bg-[#050B2B] text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050B2B]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070f33] via-[#050B2B] to-[#0a0820]" />
        <div className="absolute -left-40 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-600/15 blur-[150px]" />
      </div>
      <BrandPanel />

      {/* Right — glass login card */}
      <div className="flex w-full flex-1 items-center justify-center p-5 sm:p-8 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Receipt className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold">BillNova</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your BillNova account.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input id="email" type="email" autoComplete="username" placeholder="you@business.in" className={inputCls} {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" className={`${inputCls} pr-11`} {...register("password")} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-indigo-500" />
                Remember me
              </label>
              <button type="button" onClick={() => setForgot(!forgot)} className="font-medium text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </button>
            </div>
            {forgot && (
              <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                Ask your business owner to reset it from Settings → Users, or contact support.
              </p>
            )}

            {serverError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-shadow hover:shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
              {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to BillNova?{" "}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Start your free trial
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-white/20 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15";

function BrandPanel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);
  const t = TESTIMONIALS[idx];

  return (
    <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-900/50">
          <Receipt className="h-6 w-6 text-white" />
        </span>
        <div>
          <div className="text-xl font-bold tracking-tight">BillNova</div>
          <div className="text-xs text-indigo-200/70">Smart Billing. Simple Business.</div>
        </div>
      </div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md text-4xl font-extrabold leading-tight"
        >
          Run your shop like the pros.
        </motion.h2>
        <p className="mt-3 max-w-md text-sm text-indigo-100/70">
          Lightning-fast billing, real-time inventory, GST-ready reports — all in one elegant workspace.
        </p>

        <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={h.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 ring-1 ring-white/10">
                <h.icon className="h-[18px] w-[18px] text-indigo-200" />
              </span>
              <span className="text-sm font-medium">{h.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonial carousel */}
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
        <div className="flex gap-0.5 text-amber-300">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <p className="mt-3 text-sm leading-relaxed text-indigo-50/90">"{t.quote}"</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-xs font-bold">
                {t.name.split(" ").map((w) => w[0]).join("")}
              </span>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-indigo-200/60">{t.role}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex gap-1.5">
          {TESTIMONIALS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-indigo-400" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
