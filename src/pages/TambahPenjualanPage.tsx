import { useNavigate } from "react-router-dom";
import { PenjualanFakturForm } from "@/features/penjualan/PenjualanFakturForm";
import { BlockedTransactionCreate } from "@/features/activation/BlockedTransactionCreate";
import { useLicenseGate } from "@/features/activation/useLicenseGate";

export function TambahPenjualanPage() {
  const navigate = useNavigate();
  const { blocked, loading } = useLicenseGate();

  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">Memeriksa lisensi…</p>;
  }

  if (blocked) {
    return (
      <BlockedTransactionCreate
        title="Penjualan baru"
        description="Faktur jual ke pelanggan"
        backHref="/penjualan"
        backLabel="Kembali ke daftar penjualan"
      />
    );
  }

  return (
    <PenjualanFakturForm
      mode="create"
      cancelHref="/penjualan"
      onSuccess={() => navigate("/penjualan")}
    />
  );
}
