/**
 * Shell layout 2-kolom untuk wizard onboarding.
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Brand header (logo + judul + persen progress)                 │
 *   ├──────────────────────────┬─────────────────────────────────────┤
 *   │  Stepper (5 step)        │  Step body (header + slot + footer) │
 *   │                          │                                     │
 *   └──────────────────────────┴─────────────────────────────────────┘
 *
 * Tujuan: memberi konteks visual yang berbeda dari `AppShell` (tidak ada
 * sidebar navigasi penuh) supaya user awam fokus pada satu pekerjaan
 * (set-up awal), bukan eksplorasi menu.
 */
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import easebookIcon from "@/assets/icons/easebook-icon.svg";
import { OnboardingProgressStepper } from "@/features/onboarding/components/OnboardingProgressStepper";
import type { OnboardingStepId } from "@/features/onboarding/onboardingSteps";
import type { OnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";

type Props = {
  activeId: OnboardingStepId;
  checklist: OnboardingChecklist;
  onSelectStep?: (id: OnboardingStepId) => void;
  /** Total step yang dianggap "siap". Dipakai untuk progress %. */
  doneCount: number;
  totalCount: number;
  children: ReactNode;
};

export function OnboardingShell({
  activeId,
  checklist,
  onSelectStep,
  doneCount,
  totalCount,
  children,
}: Props) {
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-50 via-white to-brand-50/30">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={easebookIcon}
              alt="EasyBook"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl shadow-sm shadow-brand-600/20"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900">EasyBook</span>
              <span className="text-xs text-zinc-500">Pengaturan awal aplikasi</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Progress
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {doneCount} dari {totalCount} langkah ({percent}%)
              </span>
            </div>
            <div
              className="relative h-2 w-32 overflow-hidden rounded-full bg-zinc-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-6 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Daftar langkah
            </div>
            <OnboardingProgressStepper
              activeId={activeId}
              checklist={checklist}
              onSelect={onSelectStep}
            />
          </div>
        </aside>

        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
