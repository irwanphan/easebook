/**
 * Banner yang muncul saat user "keluar sementara" dari wizard onboarding
 * untuk mengisi halaman pengaturan yang terlalu kompleks untuk di-embed
 * ke modal (kas awal, stok awal, dll).
 *
 * Banner ini menampilkan diri sendiri **hanya bila wizard onboarding
 * belum `completed`** — jadi setelah user selesai onboarding,
 * halaman-halaman tersebut bersih dari noise wizard.
 *
 * Komponen sengaja kecil & opinionated. Tidak menerima daftar prop
 * kustom — kalau di masa depan butuh variasi, pisahkan jadi komponen
 * lain ketimbang menumpuk prop di sini (SRP).
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingStatus } from "@/features/onboarding/useOnboardingStatus";
import { ONBOARDING_PATH } from "@/features/onboarding/OnboardingGate";

export function OnboardingResumeBanner() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { status, loading } = useOnboardingStatus();

  if (loading) return null;
  if (!session?.isAdmin) return null;
  if (status?.completed) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"
        >
          <Compass className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-brand-900">
            Anda sedang menyelesaikan pengaturan awal.
          </p>
          <p className="text-xs text-brand-800/80">
            Selesaikan halaman ini, lalu kembali ke wizard untuk melanjutkan
            langkah berikutnya.
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={() => navigate(ONBOARDING_PATH)}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke pengaturan awal
      </Button>
    </div>
  );
}
