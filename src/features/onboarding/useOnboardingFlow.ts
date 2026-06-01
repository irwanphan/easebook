/**
 * State machine sederhana untuk navigasi step wizard onboarding.
 *
 * Tanggung jawab terbatas: hanya mengelola "step mana yang aktif" dan
 * memvalidasi transisi (tidak boleh maju kalau step wajib belum done).
 * Tidak menyentuh data — fetch & persist tetap di hook checklist /
 * komponen step masing-masing.
 */
import { useCallback, useMemo, useState } from "react";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/features/onboarding/onboardingSteps";
import type { OnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";

type UseOnboardingFlowOptions = {
  /** Step awal saat wizard di-mount. Default ke step pertama yang belum done. */
  initialStepId?: OnboardingStepId;
};

export function useOnboardingFlow(
  checklist: OnboardingChecklist,
  options: UseOnboardingFlowOptions = {},
) {
  const initialIdx = useMemo(() => {
    if (options.initialStepId) {
      const i = ONBOARDING_STEPS.findIndex((s) => s.id === options.initialStepId);
      return i >= 0 ? i : 0;
    }
    const firstUnfinished = ONBOARDING_STEPS.findIndex((s) => !checklist[s.id]);
    return firstUnfinished >= 0 ? firstUnfinished : 0;
    // initialStepId & checklist initial value sengaja tidak masuk deps —
    // ini adalah "initial state" yang hanya dihitung sekali. Re-evaluasi
    // posisi step setelah aksi pakai goNext / goTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentIdx, setCurrentIdx] = useState<number>(initialIdx);

  const current = ONBOARDING_STEPS[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === ONBOARDING_STEPS.length - 1;

  const canFinish = useMemo(
    () => ONBOARDING_STEPS.every((s) => (s.wajib ? checklist[s.id] : true)),
    [checklist],
  );

  /** Apakah step aktif boleh dilewati Lanjut. Step wajib harus done dulu. */
  const canAdvance = useMemo(() => {
    if (!current) return false;
    if (current.wajib && !checklist[current.id]) return false;
    return true;
  }, [current, checklist]);

  const goNext = useCallback(() => {
    setCurrentIdx((idx) => Math.min(idx + 1, ONBOARDING_STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setCurrentIdx((idx) => Math.max(idx - 1, 0));
  }, []);

  const goTo = useCallback((id: OnboardingStepId) => {
    const i = ONBOARDING_STEPS.findIndex((s) => s.id === id);
    if (i >= 0) setCurrentIdx(i);
  }, []);

  return {
    steps: ONBOARDING_STEPS,
    current,
    currentIdx,
    isFirst,
    isLast,
    canAdvance,
    canFinish,
    goNext,
    goBack,
    goTo,
  };
}
