/**
 * Gate yang memaksa admin ke `/onboarding` jika status onboarding belum
 * `completed`. Untuk user non-admin, gate tidak memblok — mereka cukup
 * boleh melihat banner ringan agar tidak panik kalau setup belum jadi.
 *
 * Tempatkan di antara `RequireAuth` dan `AppShell` agar:
 *  - tidak menyala saat user masih di halaman login (`session` belum ada),
 *  - tidak ikut menggatekeep halaman POS (router POS terpisah dan tidak
 *    perlu wizard untuk dipakai).
 *
 * Tidak men-gate halaman `/onboarding` sendiri (kalau by chance admin
 * navigasi manual ke sana saat sudah completed, halaman tetap bisa diakses
 * untuk re-view checklist).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingStatus } from "@/features/onboarding/useOnboardingStatus";

const ONBOARDING_PATH = "/onboarding";

export function OnboardingGate() {
  const { session } = useAuth();
  const location = useLocation();
  const { status, loading } = useOnboardingStatus();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Memeriksa status pengaturan…</p>
      </div>
    );
  }

  const completed = status?.completed ?? false;
  const isAdmin = session?.isAdmin ?? false;
  const sudahDiOnboarding = location.pathname.startsWith(ONBOARDING_PATH);

  if (!completed && isAdmin && !sudahDiOnboarding) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }

  return <Outlet />;
}
