import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { resolveHalamanKeyFromPath } from "@/lib/halamanAkses";
import { getHalamanDef } from "@/config/halamanAkses";
import { Button } from "@/components/ui/Button";

type PageAccessGuardProps = {
  children: React.ReactNode;
};

export function PageAccessGuard({ children }: PageAccessGuardProps) {
  const { pathname } = useLocation();
  const { canAccessPath, loading, session } = useAuth();

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat sesi…</p>;
  }

  if (canAccessPath(pathname)) {
    return <>{children}</>;
  }

  const halamanKey = resolveHalamanKeyFromPath(pathname);
  const label = halamanKey ? getHalamanDef(halamanKey)?.label : pathname;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">Akses ditolak</h1>
      <p className="text-sm text-zinc-600">
        Akun <span className="font-medium">{session?.username ?? "—"}</span> tidak memiliki izin untuk
        membuka halaman{label ? ` “${label}”` : ""}.
      </p>
      <Link to="/">
        <Button type="button" variant="secondary">
          Kembali ke dashboard
        </Button>
      </Link>
    </div>
  );
}
