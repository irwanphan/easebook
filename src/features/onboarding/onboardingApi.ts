/**
 * Tipis-tipis di atas tauri `invoke` untuk command onboarding.
 *
 * Onboarding sengaja dipecah jadi 2 saja di backend:
 *  - {@link onboardingStatusGet}: ambil status global (sudah selesai atau belum).
 *  - {@link onboardingComplete}: tandai selesai.
 *
 * Checklist per-langkah dihitung di frontend ({@link computeOnboardingChecklist})
 * dari berbagai sumber kebenaran yang sudah ada (localStorage info perusahaan
 * & PPN, command operasional/gudang/pengguna), supaya backend tidak harus
 * paham bentuk wizard.
 */
import { invoke } from "@tauri-apps/api/core";

export type OnboardingStatus = {
  completed: boolean;
  /** Unix timestamp detik. Null bila belum selesai. */
  completedAt: number | null;
  completedBy: string | null;
  appVersion: string | null;
};

export type OnboardingCompletePayload = {
  completedBy?: string | null;
  appVersion?: string | null;
};

export function onboardingStatusGet() {
  return invoke<OnboardingStatus>("onboarding_status_get");
}

export function onboardingComplete(payload: OnboardingCompletePayload = {}) {
  return invoke<OnboardingStatus>("onboarding_complete", { payload });
}
