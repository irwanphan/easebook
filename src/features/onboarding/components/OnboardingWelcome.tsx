/**
 * Halaman sambutan first-time yang muncul sebelum wizard.
 *
 * Tujuan: memberi user awam gambaran apa yang akan mereka kerjakan
 * sebelum melompat ke form pertama, jadi tidak ada efek "tiba-tiba"
 * saat aplikasi pertama dibuka.
 *
 * Komponen ini purely presentational — keputusan kapan menampilkan
 * Welcome vs wizard ada di {@link OnboardingPage} (saat ini: bila
 * belum ada satu pun step yang done dan user belum klik Mulai di sesi
 * ini). Itu menjaga komponen Welcome bebas dari state machine wizard.
 */
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Coins,
  KeyRound,
  Sparkles,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import easebookIcon from "@/assets/icons/easebook-icon.svg";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_STEPS } from "@/features/onboarding/onboardingSteps";

const STEP_ICON: Record<(typeof ONBOARDING_STEPS)[number]["id"], LucideIcon> = {
  "info-perusahaan": Building2,
  "periode-pembukuan": CalendarDays,
  gudang: Warehouse,
  "saldo-awal": Coins,
  "password-admin": KeyRound,
};

type Props = {
  /** Nama user yang sedang login, untuk salam personal. Opsional. */
  namaPengguna?: string | null;
  onMulai: () => void;
};

export function OnboardingWelcome({ namaPengguna, onMulai }: Props) {
  const sapaan = namaPengguna?.trim()
    ? `Selamat datang, ${namaPengguna.trim()}!`
    : "Selamat datang di EasyBook";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-brand-50/40 px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-900/5 backdrop-blur sm:p-12">
          <header className="flex flex-col items-center text-center">
            <span className="relative inline-flex">
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-brand-400/40 to-brand-600/40 blur-xl"
              />
              <img
                src={easebookIcon}
                alt="EasyBook"
                width={72}
                height={72}
                className="h-18 w-18 rounded-3xl shadow-lg shadow-brand-600/30"
              />
            </span>

            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Pengaturan awal
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {sapaan}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Sebelum mulai bertransaksi, kami akan memandu Anda mengatur
              <span className="font-semibold text-zinc-800"> 5 hal penting</span> agar pembukuan
              berjalan rapi sejak hari pertama. Cukup beberapa menit, dan setelah ini Anda
              langsung bisa memakai aplikasi sepenuhnya.
            </p>
          </header>

          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            {ONBOARDING_STEPS.map((step) => {
              const Icon = STEP_ICON[step.id];
              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {String(step.nomor).padStart(2, "0")}
                      </span>
                      <p className="text-sm font-semibold text-zinc-900">{step.judul}</p>
                      {!step.wajib ? (
                        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Opsional
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{step.subjudul}</p>
                  </div>
                </div>
              );
            })}
          </section>

          <footer className="mt-8 flex flex-col items-center gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-zinc-500">
              Estimasi waktu: ±5 menit. Anda bisa kembali ke langkah sebelumnya kapan saja.
            </p>
            <Button type="button" onClick={onMulai} className="px-5 py-2.5">
              Mulai pengaturan
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
