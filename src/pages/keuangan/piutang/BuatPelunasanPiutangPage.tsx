import { useLocation, useNavigate } from "react-router-dom";
import { PelunasanPiutangBatchForm } from "@/features/keuangan/PelunasanPiutangBatchForm";
import type { BuatPelunasanPiutangLocationState } from "@/data/pelunasanPiutang";

export function BuatPelunasanPiutangPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BuatPelunasanPiutangLocationState;

  return (
    <PelunasanPiutangBatchForm
      cancelHref="/keuangan/piutang/daftar-piutang"
      initialPelangganKode={state.pelangganKode ?? ""}
      preselectNomor={state.preselectNomor ?? []}
      onSuccess={() => navigate("/keuangan/piutang/daftar-piutang")}
    />
  );
}
