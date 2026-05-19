import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getActivationStatus, type ActivationStatus } from "./activationApi";

export function RequireActivation() {
  const [status, setStatus] = useState<ActivationStatus | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getActivationStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Memeriksa lisensi…</p>
      </div>
    );
  }

  if (!status?.activated) {
    return <Navigate to="/aktivasi" replace />;
  }

  return <Outlet />;
}
