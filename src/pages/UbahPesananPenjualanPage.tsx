import { useNavigate, useParams } from "react-router-dom";
import { PesananPenjualanForm } from "@/features/penjualan/PesananPenjualanForm";

export function UbahPesananPenjualanPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";
  const detailHref = `/penjualan/pesanan/detail/${encodeURIComponent(nomor)}`;
  return (
    <PesananPenjualanForm
      mode="edit"
      nomor={nomor}
      cancelHref={detailHref}
      onSuccess={() => navigate(detailHref, { replace: true })}
    />
  );
}
