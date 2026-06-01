/**
 * Header standar untuk setiap konten step.
 *
 * Memastikan typografi, spasi, dan posisi badge "Wajib/Opsional" konsisten
 * di seluruh wizard. Komponen step bertanggung jawab atas form-body,
 * komponen ini hanya menyajikan label + deskripsi.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  judul: string;
  deskripsi: ReactNode;
  wajib?: boolean;
};

export function OnboardingStepHeader({ icon: Icon, judul, deskripsi, wajib }: Props) {
  return (
    <header className="flex items-start gap-4 border-b border-zinc-100 pb-5">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">{judul}</h2>
          {wajib === false ? (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              Opsional
            </span>
          ) : wajib === true ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Wajib
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-zinc-600">{deskripsi}</p>
      </div>
    </header>
  );
}
