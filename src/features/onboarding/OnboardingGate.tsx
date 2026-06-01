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
 *
 * Whitelist (`ONBOARDING_ESCAPE_HATCHES`) memberi izin masuk ke halaman
 * pengaturan tertentu meskipun wizard belum selesai. Ini dipakai dari
 * Step "Saldo awal" — saldo awal terlalu kompleks untuk di-embed ke
 * modal, jadi user dilempar ke halaman pengaturannya yang asli dan
 * diberi banner kembali ke wizard.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingStatus } from "@/features/onboarding/useOnboardingStatus";

export const ONBOARDING_PATH = "/onboarding";

/**
 * Path-path yang boleh diakses admin meskipun wizard belum selesai.
 * Setiap path yang dimasukkan harus punya banner navigasi balik ke
 * `/onboarding` agar user tidak terjebak di "limbo".
 */
export const ONBOARDING_ESCAPE_HATCHES: ReadonlyArray<string> = [
  "/keuangan/kas-awal",
  "/barang-jasa/atur-stok-awal",
];

function isEscapeHatch(pathname: string): boolean {
  return ONBOARDING_ESCAPE_HATCHES.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

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
  const sudahDiEscapeHatch = isEscapeHatch(location.pathname);

  if (!completed && isAdmin && !sudahDiOnboarding && !sudahDiEscapeHatch) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }

  return <Outlet />;
}
