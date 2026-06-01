/**
 * Step penutup wizard onboarding — "You're good to go!".
 *
 * Tidak ada form. Komponen ini purely presentational dengan dua peran:
 *
 *  1. Memberi user momen "lega" sebelum benar-benar masuk aplikasi —
 *     ringkasan singkat apa yang sudah disiapkan + ajakan untuk
 *     menekan Enter / klik Selesai.
 *  2. `submit()` no-op (`return true`) supaya parent (`OnboardingPage`)
 *     dapat memanggilnya seragam tanpa special-case.
 *
 * Enter shortcut diatur di parent (`OnboardingPage`) — listener global
 * `keydown` saat step ini aktif → trigger `handleFinish`. Itu ditempatkan
 * di parent karena `handleFinish` (yang memanggil `onboardingComplete`
 * + navigate) milik parent, dan komponen step ini sebaiknya tidak
 * tahu rute selanjutnya (SRP).
 */
import { forwardRef, useImperativeHandle } from "react";
import { CheckCircle2, Keyboard, PartyPopper, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/features/onboarding/onboardingSteps";
import type { OnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

type Props = {
  /** Status terkini setiap step — untuk ringkasan visual. */
  checklist: OnboardingChecklist;
  /** Dipanggil saat step mount, untuk sinkronisasi checklist global. */
  onSaved: () => Promise<void>;
};

/** Ikon ringkas per step (subset, hanya untuk recap visual). */
const STEP_ICON_LABEL: Partial<Record<OnboardingStepId, LucideIcon>> = {
  // Pakai ikon generik — recap di sini tidak perlu se-detail Welcome.
};

export const StepSelesai = forwardRef<OnboardingStepHandle, Props>(function StepSelesai(
  { checklist, onSaved: _onSaved },
  ref,
) {
  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        return true;
      },
    }),
    [],
  );

  // Hanya tampilkan step "kerjaan" pada recap — step `selesai` sendiri
  // disembunyikan agar tidak rekursif/redundan.
  const stepsRecap = ONBOARDING_STEPS.filter((s) => s.id !== "selesai");
  const totalWajib = stepsRecap.filter((s) => s.wajib).length;
  const doneWajib = stepsRecap.filter((s) => s.wajib && checklist[s.id]).length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col items-center gap-4 pt-2 text-center">
        <span className="relative inline-flex">
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-emerald-400/30 to-brand-500/30 blur-xl"
          />
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <PartyPopper className="h-8 w-8" aria-hidden />
          </span>
        </span>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Pengaturan awal selesai
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            You&apos;re good to go!
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
            Pengaturan dasar EasyBook sudah siap. Tekan
            <kbd className="mx-1 inline-flex items-center rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 shadow-sm">
              Enter
            </kbd>
            atau klik <span className="font-semibold text-zinc-800">Selesai</span> di bawah untuk mulai bertransaksi.
          </p>
        </div>
      </header>

      <section
        aria-label="Ringkasan langkah onboarding"
        className="grid gap-2 rounded-2xl border border-zinc-200/80 bg-white p-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-2 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Ringkasan langkah
          </p>
          <p className="text-xs font-medium text-zinc-600">
            {doneWajib} dari {totalWajib} langkah wajib selesai
          </p>
        </div>

        <ul className="grid gap-1.5 sm:grid-cols-2">
          {stepsRecap.map((step) => {
            const done = checklist[step.id];
            const Icon = STEP_ICON_LABEL[step.id] ?? CheckCircle2;
            return (
              <li
                key={step.id}
                className={[
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                  done
                    ? "bg-emerald-50/60 text-emerald-900"
                    : "bg-zinc-50 text-zinc-600",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    done
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-zinc-400 ring-1 ring-inset ring-zinc-200",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 truncate">
                  <span className="font-medium">{step.judul}</span>
                  {!step.wajib ? (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      opsional
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Keyboard className="h-3.5 w-3.5" aria-hidden />
        Tip: tekan <kbd className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 shadow-sm">Enter</kbd> untuk menyelesaikan.
      </div>
    </div>
  );
});
