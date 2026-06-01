/**
 * Halaman utama wizard onboarding first-run.
 *
 * Pola interaksi: setiap step diakses lewat `ref` yang mengexpose
 * `OnboardingStepHandle.submit()`. Tombol Lanjut/Selesai di footer akan
 * memanggil submit step aktif; bila berhasil, wizard maju ke step
 * berikutnya (atau menutup wizard untuk step terakhir). Bila gagal,
 * step tetap di posisi semula dengan error inline.
 *
 * Tombol "Kembali" tidak menyimpan — diasumsikan user memang ingin
 * meninggalkan perubahan di step ini.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthContext";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";
import { OnboardingStepFooter } from "@/features/onboarding/components/OnboardingStepFooter";
import { OnboardingWelcome } from "@/features/onboarding/components/OnboardingWelcome";
import { onboardingComplete } from "@/features/onboarding/onboardingApi";
import { useOnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";
import { useOnboardingFlow } from "@/features/onboarding/useOnboardingFlow";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";
import { StepInfoPerusahaan } from "@/features/onboarding/steps/StepInfoPerusahaan";
import { StepPeriodePembukuan } from "@/features/onboarding/steps/StepPeriodePembukuan";
import { StepCoA } from "@/features/onboarding/steps/StepCoA";
import { StepGudang } from "@/features/onboarding/steps/StepGudang";
import { StepSaldoAwal } from "@/features/onboarding/steps/StepSaldoAwal";
import { StepPasswordAdmin } from "@/features/onboarding/steps/StepPasswordAdmin";
import { tauriErrorMessage } from "@/lib/tauriError";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { checklist, loading: checklistLoading, refresh: refreshChecklist } =
    useOnboardingChecklist();
  const flow = useOnboardingFlow(checklist);
  const stepRef = useRef<OnboardingStepHandle | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Welcome screen di-render setiap kali user masuk ke wizard, hingga
   * mereka eksplisit klik "Mulai". State ini di-reset pada tiap
   * mount (page reload / app restart) — disengaja, karena Welcome
   * berperan sebagai "ruang transisi" yang mengonfirmasi user benar-benar
   * siap melanjutkan setup, bukan sekadar onboarding sekali untuk satu
   * mesin. Posisi step aktif setelah klik Mulai ditentukan oleh
   * `useOnboardingFlow` (auto-skip ke step pertama yang belum done),
   * jadi user yang sudah maju 4/5 tidak akan diulang dari step 1.
   */
  const [sudahKlikMulai, setSudahKlikMulai] = useState(false);

  const doneCount = useMemo(
    () => flow.steps.reduce((acc, s) => acc + (checklist[s.id] ? 1 : 0), 0),
    [checklist, flow.steps],
  );

  const tampilkanWelcome = !checklistLoading && !sudahKlikMulai;

  const handleNext = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = (await stepRef.current?.submit()) ?? true;
      if (ok) flow.goNext();
    } catch (e) {
      toast.error(tauriErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, flow]);

  const handleFinish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = (await stepRef.current?.submit()) ?? true;
      if (!ok) {
        // Validasi gagal di step terakhir, footer akan menampilkan
        // error inline; jangan call onboardingComplete.
        return;
      }
      // Re-ambil checklist freshness untuk yakin semua step wajib done.
      await refreshChecklist();
      await onboardingComplete({
        completedBy: session?.username ?? null,
      });
      toast.success("Pengaturan awal selesai. Selamat menggunakan EasyBook!");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(tauriErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, navigate, refreshChecklist, session?.username]);

  const renderStep = () => {
    if (checklistLoading && !flow.current) {
      return <p className="text-sm text-zinc-500">Memuat status onboarding…</p>;
    }
    switch (flow.current?.id) {
      case "info-perusahaan":
        return <StepInfoPerusahaan ref={stepRef} onSaved={refreshChecklist} />;
      case "periode-pembukuan":
        return <StepPeriodePembukuan ref={stepRef} onSaved={refreshChecklist} />;
      case "coa":
        return <StepCoA ref={stepRef} onSaved={refreshChecklist} />;
      case "gudang":
        return <StepGudang ref={stepRef} onSaved={refreshChecklist} />;
      case "saldo-awal":
        return <StepSaldoAwal ref={stepRef} onSaved={refreshChecklist} />;
      case "password-admin":
        return <StepPasswordAdmin ref={stepRef} onSaved={refreshChecklist} />;
      default:
        return null;
    }
  };

  if (tampilkanWelcome) {
    return (
      <OnboardingWelcome
        namaPengguna={session?.namaLengkap ?? session?.username ?? null}
        onMulai={() => setSudahKlikMulai(true)}
      />
    );
  }

  return (
    <OnboardingShell
      activeId={flow.current?.id ?? flow.steps[0].id}
      checklist={checklist}
      onSelectStep={flow.goTo}
      doneCount={doneCount}
      totalCount={flow.steps.length}
    >
      <div className="flex flex-1 flex-col gap-6">{renderStep()}</div>

      <OnboardingStepFooter
        isFirst={flow.isFirst}
        isLast={flow.isLast}
        busy={busy}
        onBack={flow.goBack}
        onNext={handleNext}
        onFinish={handleFinish}
        hint={
          flow.current?.wajib
            ? "Klik Lanjut untuk menyimpan dan melanjutkan."
            : "Klik Lanjut untuk melewati atau menyimpan."
        }
      />
    </OnboardingShell>
  );
}
