/**
 * Footer navigasi step.
 *
 * Hanya menyajikan tombol Kembali + Lanjut/Selesai. Tindakan simpan
 * dipicu oleh tombol Lanjut/Selesai melalui `OnboardingStepHandle.submit`
 * yang dikelola di {@link OnboardingPage} — komponen ini sengaja tidak
 * tahu detail validasi per step (single responsibility).
 */
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  /** True saat submit/finish sedang berjalan — disable seluruh tombol. */
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  /** Pesan kecil di kiri (mis. "Auto-disimpan saat Lanjut"). Opsional. */
  hint?: string;
};

export function OnboardingStepFooter({
  isFirst,
  isLast,
  busy,
  onBack,
  onNext,
  onFinish,
  hint,
}: Props) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {hint ? <span>{hint}</span> : <span aria-hidden>&nbsp;</span>}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isFirst || busy}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali
        </Button>

        {isLast ? (
          <Button type="button" variant="primary" onClick={onFinish} disabled={busy}>
            <Check className="h-4 w-4" aria-hidden />
            {busy ? "Menyelesaikan…" : "Selesai"}
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onNext} disabled={busy}>
            {busy ? "Menyimpan…" : "Lanjut"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </footer>
  );
}
