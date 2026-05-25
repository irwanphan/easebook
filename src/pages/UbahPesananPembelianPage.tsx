import { useNavigate, useParams } from "react-router-dom";
import { PesananPembelianForm } from "@/features/pembelian/PesananPembelianForm";

export function UbahPesananPembelianPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";
  const detailHref = `/pembelian/pesanan/detail/${encodeURIComponent(nomor)}`;
  return (
    <PesananPembelianForm
      mode="edit"
      nomor={nomor}
      cancelHref={detailHref}
      onSuccess={() => navigate(detailHref, { replace: true })}
    />
  );
}
