/**
 * Hook tipis untuk membaca {@link OnboardingStatus} dari backend.
 *
 * Memisahkan fetch lifecycle (loading / error / data) dari komponen agar
 * Gate, banner login, dan wizard bisa pakai sumber data yang sama tanpa
 * duplikasi state.
 */
import { useCallback, useEffect, useState } from "react";
import {
  onboardingStatusGet,
  type OnboardingStatus,
} from "@/features/onboarding/onboardingApi";
import { tauriErrorMessage } from "@/lib/tauriError";

type OnboardingStatusState = {
  status: OnboardingStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOnboardingStatus(): OnboardingStatusState {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await onboardingStatusGet();
      setStatus(next);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}
