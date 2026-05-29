import { useLocation, useNavigate } from "react-router-dom";
import { PelunasanHutangBatchForm } from "@/features/keuangan/PelunasanHutangBatchForm";
import type { BuatPelunasanHutangLocationState } from "@/data/pelunasanHutang";

export function BuatPelunasanHutangPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BuatPelunasanHutangLocationState;

  return (
    <PelunasanHutangBatchForm
      cancelHref="/keuangan/hutang/daftar-hutang"
      initialPemasokKode={state.pemasokKode ?? ""}
      preselectNomor={state.preselectNomor ?? []}
      onSuccess={() => navigate("/keuangan/hutang/daftar-hutang")}
    />
  );
}
