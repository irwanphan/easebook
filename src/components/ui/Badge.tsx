type BadgeVariant = "processing" | "shipped" | "delayed" | "neutral" | "success" | "warning";

const styles: Record<BadgeVariant, string> = {
  processing: "bg-sky-100 text-sky-800 ring-sky-200/60",
  shipped: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
  delayed: "bg-rose-100 text-rose-800 ring-rose-200/60",
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200/60",
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
  warning: "bg-amber-100 text-amber-900 ring-amber-200/60",
};

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
