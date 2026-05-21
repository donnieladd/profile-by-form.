import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function One39Logo({
  small = false,
  script = false,
  className = "",
}: {
  small?: boolean;
  script?: boolean;
  className?: string;
}) {
  if (script) {
    return (
      <div
        className={cn(
          "font-serif italic tracking-[-0.13em] text-white",
          small ? "text-3xl" : "text-5xl",
          className,
        )}
      >
        One
        <span className="ml-1 align-super text-sm not-italic tracking-normal text-[color:var(--gold)]">
          39
        </span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "font-serif tracking-[-0.08em] text-white",
        small ? "text-2xl" : "text-4xl",
        className,
      )}
    >
      ONE
      <span className="ml-1 align-super text-sm tracking-normal text-[color:var(--gold)]">
        39
      </span>
    </div>
  );
}

export function WilsonMark({ className = "" }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg viewBox="0 0 80 64" className="h-full w-full" fill="none">
        <path
          d="M14 43C21 24 32 10 52 9C42 15 37 22 35 33C44 22 55 19 68 22C58 26 51 31 47 42C39 38 31 38 23 47"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 18L35 4L39 18"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M46 28C53 33 59 39 65 50"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M19 44C13 49 8 55 5 60"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

const pillTones = {
  gold:
    "border-[color:var(--gold)]/30 bg-[color:var(--gold)]/12 text-[color:var(--gold-deep)]",
  green: "border-emerald-600/20 bg-emerald-50 text-emerald-700",
  blue: "border-blue-500/20 bg-blue-50 text-blue-700",
  purple: "border-purple-500/20 bg-purple-50 text-purple-700",
  dark: "border-white/10 bg-white/10 text-white/70",
  soft: "border-foreground/10 bg-foreground/[0.035] text-foreground/55",
} as const;

export function Pill({
  children,
  tone = "gold",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof pillTones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ShellCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-foreground/10 bg-card shadow-[0_30px_100px_rgba(16,14,10,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DarkCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-[color:var(--deep)] text-white shadow-2xl shadow-black/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <ShellCard className="p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35">
        {label}
      </div>
      <div className="mt-3 text-4xl font-semibold tracking-tight">{value}</div>
      {hint && (
        <div className="mt-2 text-xs text-foreground/50">{hint}</div>
      )}
    </ShellCard>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-5xl tracking-[-0.055em]">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-3xl text-foreground/55">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
