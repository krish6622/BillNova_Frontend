import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Hash,
  Mail,
  Package,
  Phone,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Zap,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const BUSINESS_TYPES = [
  "Textile Shop",
  "Fancy Store",
  "Footwear Store",
  "Grocery Store",
  "Hardware Store",
  "General Retail",
] as const;

const schema = z.object({
  business_name: z.string().min(2, "Enter your business name"),
  business_type: z.enum(BUSINESS_TYPES, { errorMap: () => ({ message: "Select a business type" }) }),
  gst_number: z.string().max(20).optional().or(z.literal("")),
  owner_name: z.string().min(2, "Enter the owner's name"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Business Details", "Owner Details", "Start Free Trial"];
const STEP_FIELDS: (keyof FormValues)[][] = [
  ["business_name", "business_type", "gst_number"],
  ["owner_name", "mobile", "email", "password"],
  [],
];

const FEATURES = [
  { icon: Zap, title: "Fast Billing", desc: "Create bills in seconds with our lightning-fast POS." },
  { icon: Package, title: "Inventory Management", desc: "Track stock in real time and never run out of bestsellers." },
  { icon: BarChart3, title: "Powerful Reports", desc: "Get detailed insights and make smarter decisions." },
  { icon: FileText, title: "GST Ready", desc: "Stay compliant with GST billing and auditor reports." },
  { icon: ShieldCheck, title: "Secure & Reliable", desc: "Enterprise-grade security for growing businesses." },
];

export default function Register() {
  const registerUser = useAuth((s) => s.register);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onTouched" });

  const next = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    setDir(1);
    setStep((s) => Math.min(2, s + 1));
  };
  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await registerUser({
        business_name: values.business_name,
        owner_name: values.owner_name,
        mobile: values.mobile,
        email: values.email,
        password: values.password,
        gst_number: values.gst_number || null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
      setStep(1); // jump back to the account fields so they can fix it
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      <BrandPanel />

      {/* Right — registration */}
      <div className="flex w-full flex-1 items-center justify-center p-5 sm:p-8 lg:w-3/5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-xl rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] sm:p-9"
        >
          {/* Top bar */}
          <div className="mb-7 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              <Gift className="h-3.5 w-3.5" /> 7-Day Free Trial
            </span>
            <span className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500">
                Login
              </Link>
            </span>
          </div>

          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
              <Receipt className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">BillNova</span>
          </div>

          <Stepper step={step} />

          <div className="mt-8">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {step === 0 && <BusinessStep register={register} errors={errors} />}
                {step === 1 && (
                  <OwnerStep register={register} errors={errors} showPw={showPw} setShowPw={setShowPw} />
                )}
                {step === 2 && <ReviewStep values={getValues()} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {serverError && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <CtaButton
              label={step === 2 ? "Start Free Trial" : "Continue"}
              loading={isSubmitting}
              onClick={step === 2 ? handleSubmit(onSubmit) : next}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ----------------------------- Left brand panel ----------------------------- */

function BrandPanel() {
  return (
    <div className="relative hidden w-2/5 flex-col overflow-hidden bg-[#050B2B] p-10 text-white lg:flex xl:p-12">
      {/* Ambient glows */}
      <motion.div
        aria-hidden
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-600/30 blur-[120px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-20 bottom-24 h-96 w-96 rounded-full bg-violet-600/25 blur-[130px]"
      />
      {/* Flowing wave accent */}
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full opacity-30" viewBox="0 0 400 200" preserveAspectRatio="none">
        <path d="M0 120 C100 60 300 200 400 100 L400 200 L0 200 Z" fill="url(#g1)" />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-900/50">
            <Receipt className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xl font-bold tracking-tight">BillNova</div>
            <div className="text-xs text-indigo-200/70">Smart Billing. Simple Business.</div>
          </div>
        </div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10"
        >
          <h1 className="font-display text-3xl font-extrabold leading-tight xl:text-4xl">
            The smarter way to manage your business.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-indigo-100/70">
            BillNova helps you bill faster, manage inventory, track sales, and grow your business with
            confidence.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="mt-8 grid gap-2.5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 ring-1 ring-white/10">
                <f.icon className="h-4.5 w-4.5 text-indigo-200" />
              </span>
              <div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-indigo-100/60">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-auto rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md"
        >
          <div className="flex gap-0.5 text-amber-300">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-indigo-50/90">
            "BillNova has transformed the way we run our shop. Billing is now super fast and effortless!"
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-sm font-bold">
              RK
            </span>
            <div>
              <div className="text-sm font-semibold">Ramesh Kumar</div>
              <div className="text-xs text-indigo-200/60">Textile Shop Owner</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ----------------------------- Stepper ----------------------------- */

function Stepper({ step }: { step: number }) {
  return (
    <div>
      <div className="relative flex items-center justify-between">
        {/* track */}
        <div className="absolute left-0 right-0 top-5 mx-6 h-0.5 bg-slate-100" />
        <motion.div
          className="absolute left-0 top-5 ml-6 h-0.5 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500"
          initial={false}
          animate={{ width: `calc(${(step / (STEPS.length - 1)) * 100}% - ${step === 2 ? 48 : 24}px)` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: active ? 1.05 : 1 }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  done || active
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <Check className="h-5 w-5" /> : i + 1}
              </motion.div>
              <span
                className={cn(
                  "max-w-[80px] text-center text-[11px] font-medium leading-tight sm:text-xs",
                  active ? "text-slate-900" : "text-slate-400",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- Steps ----------------------------- */

function BusinessStep({
  register,
  errors,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}) {
  return (
    <div>
      <StepHeading title="Let's set up your business" subtitle="Tell us about your store." />
      <div className="space-y-4">
        <Field label="Business Name" icon={Building2} error={errors.business_name?.message}>
          <input {...register("business_name")} placeholder="e.g. Sri Textiles" className={inputCls} />
        </Field>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Business Type</label>
          <div className="relative">
            <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <select {...register("business_type")} defaultValue="" className={cn(inputCls, "appearance-none pr-10")}>
              <option value="" disabled>
                Select business type
              </option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {errors.business_type && <p className="text-xs text-red-500">{errors.business_type.message}</p>}
        </div>

        <Field label="GST Number (Optional)" icon={Hash} error={errors.gst_number?.message}>
          <input {...register("gst_number")} placeholder="22ABCDE1234F1Z5" className={inputCls} />
        </Field>
        <p className="-mt-2 text-xs text-slate-400">We'll use this for GST invoices and compliance.</p>

        <SecurityBanner />
      </div>
    </div>
  );
}

function OwnerStep({
  register,
  errors,
  showPw,
  setShowPw,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  showPw: boolean;
  setShowPw: (v: boolean) => void;
}) {
  return (
    <div>
      <StepHeading title="Who runs the show?" subtitle="Your owner & login details." />
      <div className="space-y-4">
        <Field label="Owner Name" icon={User} error={errors.owner_name?.message}>
          <input {...register("owner_name")} placeholder="e.g. Ramesh Kumar" className={inputCls} />
        </Field>
        <Field label="Mobile Number" icon={Phone} error={errors.mobile?.message}>
          <input {...register("mobile")} inputMode="numeric" placeholder="9876543210" className={inputCls} />
        </Field>
        <Field label="Email" icon={Mail} error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="you@business.in" className={inputCls} />
        </Field>
        <Field label="Password" icon={ShieldCheck} error={errors.password?.message}>
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            className={cn(inputCls, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </Field>
      </div>
    </div>
  );
}

function ReviewStep({ values }: { values: FormValues }) {
  const rows: [string, string][] = [
    ["Business", values.business_name || "—"],
    ["Type", values.business_type || "—"],
    ["GST", values.gst_number || "Not provided"],
    ["Owner", values.owner_name || "—"],
    ["Mobile", values.mobile || "—"],
    ["Email", values.email || "—"],
  ];
  return (
    <div>
      <StepHeading title="You're all set 🎉" subtitle="Review and start your 7-day free trial." />
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={cn("flex items-center justify-between px-4 py-3 text-sm", i % 2 === 0 && "bg-slate-50/60")}
          >
            <span className="text-slate-500">{k}</span>
            <span className="font-medium text-slate-900">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
        <Gift className="h-5 w-5 text-indigo-600" />
        <p className="text-sm text-indigo-900">
          Your <span className="font-semibold">Trial</span> includes up to 50 bills this month — no card
          required.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Primitives ----------------------------- */

const inputCls =
  "h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SecurityBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <p className="text-sm text-blue-900">
        Your data is 100% secure with us. We never share your information with anyone.
      </p>
    </div>
  );
}

function CtaButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      className="group relative flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-shadow hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-70"
    >
      <span className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
      <span className="relative">{loading ? "Setting up…" : label}</span>
      {!loading && <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
    </motion.button>
  );
}
