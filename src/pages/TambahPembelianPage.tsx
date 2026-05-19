import { useNavigate } from "react-router-dom";
import { PembelianFakturForm } from "@/features/pembelian/PembelianFakturForm";
import { BlockedTransactionCreate } from "@/features/activation/BlockedTransactionCreate";
import { useLicenseGate } from "@/features/activation/useLicenseGate";

export function TambahPembelianPage() {
  const navigate = useNavigate();
  const { blocked, loading } = useLicenseGate();

  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">Memeriksa lisensi…</p>;
  }

  if (blocked) {
    return (
      <BlockedTransactionCreate
        title="Faktur beli baru"
        description="Pembelian dari pemasok"
        backHref="/pembelian"
        backLabel="Kembali ke daftar pembelian"
      />
    );
  }

  return (
    <PembelianFakturForm
      mode="create"
      cancelHref="/pembelian"
      onSuccess={(savedNomor) =>
        navigate(`/pembelian/detail/${encodeURIComponent(savedNomor)}`, { replace: true })
      }
    />
  );
}
