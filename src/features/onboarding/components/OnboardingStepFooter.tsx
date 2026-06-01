/**
 * Footer navigasi step (Kembali / Lewati / Lanjut).
 *
 * Komponen ini hanya pemicu callback — keputusan apakah `Lanjut` aktif
 * (mis. step wajib belum done) dikelola oleh `useOnboardingFlow.canAdvance`
 * yang di-pass ke prop `canAdvance`.
 */
import { ArrowLeft, ArrowRight, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  canAdvance: boolean;
  canFinish: boolean;
  finishing: boolean;
  /** Apakah tombol "Lewati" boleh dimunculkan (step opsional). */
  canSkip: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
  /**
   * Pesan kecil di sisi kiri footer (mis. "Disimpan otomatis"). Berguna
   * untuk feedback ringkas tanpa mengganggu alur navigasi.
   */
  hint?: string;
};

export function OnboardingStepFooter({
  isFirst,
  isLast,
  canAdvance,
  canFinish,
  finishing,
  canSkip,
  onBack,
  onNext,
  onSkip,
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
          disabled={isFirst || finishing}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali
        </Button>

        {canSkip && !isLast ? (
          <Button type="button" variant="outline" onClick={onSkip} disabled={finishing}>
            <SkipForward className="h-4 w-4" aria-hidden />
            Lewati
          </Button>
        ) : null}

        {isLast ? (
          <Button
            type="button"
            variant="primary"
            onClick={onFinish}
            disabled={!canFinish || finishing}
            title={
              canFinish
                ? "Selesaikan pengaturan awal"
                : "Lengkapi semua langkah wajib terlebih dahulu"
            }
          >
            <Check className="h-4 w-4" aria-hidden />
            {finishing ? "Menyelesaikan…" : "Selesai"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
            disabled={!canAdvance || finishing}
            title={canAdvance ? "Lanjut ke langkah berikutnya" : "Selesaikan langkah ini dulu"}
          >
            Lanjut
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </footer>
  );
}
