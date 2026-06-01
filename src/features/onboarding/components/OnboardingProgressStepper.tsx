/**
 * Daftar step vertikal di kolom kiri wizard onboarding.
 *
 * Komponen presentasional murni — tidak fetch, tidak transisi state.
 * Bisa dipakai ulang di luar wizard (mis. ringkasan progress di
 * dashboard) tanpa perlu konteks router.
 */
import { Check, Circle, CircleDot } from "lucide-react";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/features/onboarding/onboardingSteps";
import type { OnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";

type Props = {
  activeId: OnboardingStepId;
  checklist: OnboardingChecklist;
  onSelect?: (id: OnboardingStepId) => void;
};

export function OnboardingProgressStepper({ activeId, checklist, onSelect }: Props) {
  return (
    <ol className="flex flex-col gap-1.5">
      {ONBOARDING_STEPS.map((step, idx) => {
        const done = checklist[step.id];
        const active = step.id === activeId;
        const interactive = typeof onSelect === "function";

        const itemContent = (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={
                done
                  ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                  : active
                    ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm shadow-brand-600/40"
                    : "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500"
              }
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <CircleDot className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </span>
            <div className="flex flex-1 flex-col">
              <span
                className={
                  active
                    ? "text-sm font-semibold text-zinc-900"
                    : done
                      ? "text-sm font-medium text-zinc-700"
                      : "text-sm font-medium text-zinc-500"
                }
              >
                <span className="mr-1 text-xs font-semibold text-zinc-400">
                  {String(step.nomor).padStart(2, "0")}.
                </span>
                {step.judul}
              </span>
              <span className="text-xs text-zinc-500">{step.subjudul}</span>
              {!step.wajib ? (
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Opsional
                </span>
              ) : null}
            </div>
          </div>
        );

        return (
          <li key={step.id}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(step.id)}
                className={
                  active
                    ? "w-full rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-left transition"
                    : "w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:bg-zinc-50"
                }
                aria-current={active ? "step" : undefined}
              >
                {itemContent}
              </button>
            ) : (
              <div
                className={
                  active
                    ? "rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5"
                    : "rounded-xl border border-transparent px-3 py-2.5"
                }
                aria-current={active ? "step" : undefined}
              >
                {itemContent}
              </div>
            )}
            {idx < ONBOARDING_STEPS.length - 1 ? (
              <div className="ml-6 h-1.5" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
