import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { LicenseInfo } from "./activationApi";

type Props = {
  license: LicenseInfo | null;
  loading?: boolean;
};

export function TransactionGateBanner({ license, loading }: Props) {
  if (loading || !license?.blocked) return null;

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold">Batas uji coba tercapai</p>
        <p className="mt-1 leading-relaxed text-amber-900/90">
          Anda telah mencatat {license.transactionCount} transaksi (pembelian + penjualan).
          Tambah faktur baru dinonaktifkan sampai lisensi diaktivasi.
        </p>
        <Link
          to="/pengaturan?tab=aktivasi"
          className="mt-2 inline-block font-semibold text-amber-800 underline hover:text-amber-950"
        >
          Buka Pengaturan → Aktivasi
        </Link>
      </div>
    </div>
  );
}
