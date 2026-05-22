import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatWaktuDicatat(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Baris akun (pendapatan untuk penerimaan; biaya untuk pengeluaran). */
export type KasTransaksiDetailLine = {
  id: number;
  akunKode: string;
  akunNama: string;
  jumlah: number;
  catatan: string;
};

/** Bentuk data umum penerimaan / pengeluaran kas. */
export type KasTransaksiDetailData = {
  nomor: string;
  tanggal: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  catatan: string;
  createdAt: number;
  updatedAt: number;
  lines: KasTransaksiDetailLine[];
};

/** Konfigurasi label & arah jurnal untuk menyesuaikan tampilan antara penerimaan vs pengeluaran. */
export type KasTransaksiDetailVariant = {
  kasLabel: string;
  akunBarisLabel: string;
  baristTitle: string;
  arahJurnal: string;
};

type KasTransaksiDetailViewProps = {
  detail: KasTransaksiDetailData;
  variant: KasTransaksiDetailVariant;
};

export function KasTransaksiDetailView({ detail, variant }: KasTransaksiDetailViewProps) {
  return (
    <>
      <Card>
        {/*
         * Catatan: class `print:*` di view ini TIDAK mempengaruhi output cetak,
         * karena tombol Cetak membuka HTML standalone (`kasTransaksiPrintTemplate.ts`)
         * di browser default — bukan mencetak komponen React ini.
         * Untuk mengubah hasil cetak, edit `buildKasTransaksiPrintHtml`.
         */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">No. bukti</p>
            <p className="mt-1 font-mono text-sm font-semibold text-brand-800">{detail.nomor}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tanggal transaksi</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{formatTanggal(detail.tanggal)}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dicatat pada</p>
            <p className="mt-1 text-sm text-zinc-800">{formatWaktuDicatat(detail.createdAt)}</p>
            {detail.updatedAt > detail.createdAt ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                Terakhir diperbarui {formatWaktuDicatat(detail.updatedAt)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-zinc-500">Waktu sistem saat transaksi disimpan di aplikasi.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{variant.kasLabel}</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{detail.akunKasNama || detail.akunKasKode}</p>
            <p className="font-mono text-xs text-zinc-500">{detail.akunKasKode}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{formatRupiah(detail.total)}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{detail.lines.length} baris akun</p>
          </div>

          {detail.catatan.trim() ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Catatan</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{detail.catatan}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">{variant.baristTitle}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {detail.lines.length} baris · total {formatRupiah(detail.total)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">{variant.akunBarisLabel}</th>
                <th className="px-5 py-3">Catatan baris</th>
                <th className="px-5 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {detail.lines.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-zinc-500">
                    Tidak ada baris tercatat.
                  </td>
                </tr>
              ) : (
                detail.lines.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-5 py-3 text-zinc-800">
                      <span className="font-medium">{row.akunNama || row.akunKode}</span>
                      <span className="ml-1.5 font-mono text-xs text-zinc-500">{row.akunKode}</span>
                    </td>
                    <td className="max-w-[260px] px-5 py-3 text-zinc-600">
                      <span className="block whitespace-pre-wrap">{row.catatan || "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.jumlah)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {detail.lines.length > 0 ? (
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50/80">
                  <td colSpan={2} className="px-5 py-3 text-right text-sm font-semibold text-zinc-700">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-zinc-900">
                    {formatRupiah(detail.total)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>

      <Card>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pengaruh jurnal</p>
          <p className="mt-1 text-sm text-zinc-700">{variant.arahJurnal}</p>
          <Link
            to="/keuangan/jurnal-umum"
            className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Lihat di jurnal umum
          </Link>
        </div>
      </Card>
    </>
  );
}
