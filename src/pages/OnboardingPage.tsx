/**
 * Halaman utama wizard onboarding first-run.
 *
 * Bertugas merangkai 5 komponen step ke dalam {@link OnboardingShell}
 * dan mendelegasikan navigasi step ke {@link useOnboardingFlow}. Sumber
 * checklist datang dari {@link useOnboardingChecklist}; setiap aksi
 * simpan di step memanggil `refreshChecklist()` agar progress visual
 * (badge hijau di stepper + persen progress di header) langsung update.
 *
 * Penyelesaian wizard memanggil `onboardingComplete` di backend, lalu
 * navigasi ke "/" — `OnboardingGate` akan berhenti memaksa redirect ke
 * sini setelah status.completed = true.
 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthContext";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";
import { OnboardingStepFooter } from "@/features/onboarding/components/OnboardingStepFooter";
import { onboardingComplete } from "@/features/onboarding/onboardingApi";
import { useOnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";
import { useOnboardingFlow } from "@/features/onboarding/useOnboardingFlow";
import { StepInfoPerusahaan } from "@/features/onboarding/steps/StepInfoPerusahaan";
import { StepPeriodePembukuan } from "@/features/onboarding/steps/StepPeriodePembukuan";
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
  const [finishing, setFinishing] = useState(false);

  const doneCount = useMemo(
    () => flow.steps.reduce((acc, s) => acc + (checklist[s.id] ? 1 : 0), 0),
    [checklist, flow.steps],
  );

  const handleFinish = useCallback(async () => {
    if (!flow.canFinish || finishing) return;
    setFinishing(true);
    try {
      await onboardingComplete({
        completedBy: session?.username ?? null,
      });
      toast.success("Pengaturan awal selesai. Selamat menggunakan EasyBook!");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(tauriErrorMessage(e));
      setFinishing(false);
    }
  }, [flow.canFinish, finishing, navigate, session?.username]);

  const handleSkip = useCallback(() => {
    if (flow.current?.wajib) return;
    flow.goNext();
  }, [flow]);

  const renderStep = () => {
    if (checklistLoading && !flow.current) {
      return <p className="text-sm text-zinc-500">Memuat status onboarding…</p>;
    }
    switch (flow.current?.id) {
      case "info-perusahaan":
        return <StepInfoPerusahaan onSaved={refreshChecklist} />;
      case "periode-pembukuan":
        return <StepPeriodePembukuan onSaved={refreshChecklist} />;
      case "gudang":
        return <StepGudang onSaved={refreshChecklist} />;
      case "saldo-awal":
        return <StepSaldoAwal onSaved={refreshChecklist} />;
      case "password-admin":
        return <StepPasswordAdmin onSaved={refreshChecklist} />;
      default:
        return null;
    }
  };

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
        canAdvance={flow.canAdvance}
        canFinish={flow.canFinish}
        finishing={finishing}
        canSkip={flow.current?.wajib === false}
        onBack={flow.goBack}
        onNext={flow.goNext}
        onSkip={handleSkip}
        onFinish={handleFinish}
        hint={
          flow.current?.wajib && !checklist[flow.current.id]
            ? "Selesaikan langkah ini untuk melanjutkan."
            : flow.isLast && !flow.canFinish
              ? "Beberapa langkah wajib masih belum selesai."
              : undefined
        }
      />
    </OnboardingShell>
  );
}
