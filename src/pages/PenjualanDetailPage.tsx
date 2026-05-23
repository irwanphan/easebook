import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PrintButton } from "@/components/ui/PrintButton";
import {
  buildFakturPrintHtml,
  type FakturPrintConfig,
} from "@/features/keuangan/templates/fakturPrintTemplate";
import type { SignatureColumn } from "@/features/keuangan/printSignature";
import type { PenjualanDetail } from "@/data/penjualan";
import { tauriErrorMessage } from "@/lib/tauriError";

// Faktur penjualan: dokumen serah-terima barang dari kita ke pelanggan.
// Kiri = sales / kasir kita ("Hormat Kami"). Kanan = pelanggan yang
// menerima barang.
const PENJUALAN_SIGNATURES: SignatureColumn[] = [
  { label: "Hormat Kami" },
  { label: "Penerima" },
];

const PENJUALAN_PRINT_CONFIG: FakturPrintConfig = {
  judulDokumen: "Faktur penjualan",
  pihakLabel: "Pelanggan",
  pembayaranLabel: "Diterima melalui",
  pembayaranKreditFallback: "Piutang (belum diterima)",
  showLineCatatan: true,
  showSalesman: true,
  signatures: PENJUALAN_SIGNATURES,
  signatureMode: "paraf",
};

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

function statusVariant(s: string) {
  if (s === "Lunas") return "success" as const;
  if (s === "Dipesan") return "processing" as const;
  if (s === "Dibatalkan") return "delayed" as const;
  return "neutral" as const;
}

export function PenjualanDetailPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";

  const [detail, setDetail] = useState<PenjualanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!nomor.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await invoke<PenjualanDetail>("penjualan_detail", { nomor: nomor.trim() });
      setDetail(d);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [nomor]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!nomor.trim()) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader 
          title="Faktur tidak valid" 
          // description="Nomor faktur tidak ada di URL." 
        />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/penjualan")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  const ubahHref = `/penjualan/ubah/${encodeURIComponent(nomor)}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to="/penjualan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar penjualan
        </Link>
        <PageHeader
          title="Detail faktur penjualan"
          description={detail ? `Nomor ${detail.nomor}` : "Memuat data faktur…"}
          actions={
            detail ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate(ubahHref)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Ubah faktur
                </Button>
                <PrintButton
                  mode="browser"
                  label="Cetak"
                  filenameHint={`faktur-penjualan-${detail.nomor}`}
                  htmlBuilder={({ paperSize }) =>
                    buildFakturPrintHtml(
                      {
                        nomor: detail.nomor,
                        tanggalFaktur: detail.tanggalFaktur,
                        jatuhTempo: detail.jatuhTempo,
                        status: detail.status,
                        pihakKode: detail.pelangganKode,
                        pihakNama: detail.pelangganNama,
                        gudangKode: detail.gudangKode,
                        gudangNama: detail.gudangNama,
                        salesman: detail.salesman || undefined,
                        catatan: detail.catatanFaktur || undefined,
                        akunKasKode: detail.akunKasKode,
                        akunKasNama: detail.akunKasNama,
                        subtotalBarang: detail.subtotalBarang ?? 0,
                        diskonFaktur: detail.diskonFaktur ?? 0,
                        pajak: detail.pajak ?? 0,
                        total: detail.total,
                        lines: (detail.lines ?? []).map((row) => ({
                          barangKode: row.barangKode,
                          barangNama: row.barangNama,
                          qty: row.qty,
                          satuanNama: row.satuanNama ?? "",
                          hargaSatuan: row.hargaSatuan,
                          diskon: row.diskon ?? 0,
                          subtotal: row.subtotal,
                          catatan: row.catatan || undefined,
                        })),
                      },
                      PENJUALAN_PRINT_CONFIG,
                      paperSize,
                    )
                  }
                  onError={(msg) => setError(msg)}
                />
              </div>
            ) : null
          }
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat…</p> : null}

      {!loading && !detail && !error ? (
        <p className="text-sm text-zinc-500">Data faktur tidak tersedia.</p>
      ) : null}

      {detail && !loading ? (
        <>
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nomor faktur</p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-800">{detail.nomor}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
                <p className="mt-1">
                  <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pelanggan</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {detail.pelangganKode} — {detail.pelangganNama}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gudang</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {detail.gudangKode} — {detail.gudangNama}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Salesman</p>
                <p className="mt-1 text-sm text-zinc-800">{detail.salesman || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tanggal faktur</p>
                <p className="mt-1 text-sm text-zinc-800">{formatTanggal(detail.tanggalFaktur)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Jatuh tempo</p>
                <p className="mt-1 text-sm text-zinc-800">{formatTanggal(detail.jatuhTempo)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Diterima melalui</p>
                <p className="mt-1 text-sm text-zinc-800">
                  {detail.akunKasKode
                    ? `${detail.akunKasKode}${detail.akunKasNama ? ` — ${detail.akunKasNama}` : ""} (tunai)`
                    : "Piutang (belum diterima)"}
                </p>
              </div>
              {detail.catatanFaktur ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Catatan faktur</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{detail.catatanFaktur}</p>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ringkasan nilai</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Subtotal barang</dt>
                    <dd className="font-medium text-zinc-900">{formatRupiah(detail.subtotalBarang ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Diskon faktur</dt>
                    <dd className="text-zinc-800">
                      {(detail.diskonFaktur ?? 0) > 0 ? `−${formatRupiah(detail.diskonFaktur ?? 0)}` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Pajak</dt>
                    <dd className="text-zinc-800">
                      {(detail.pajak ?? 0) > 0 ? formatRupiah(detail.pajak ?? 0) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2">
                    <dt className="font-medium text-zinc-900">Total faktur</dt>
                    <dd className="text-lg font-bold text-zinc-900">{formatRupiah(detail.total)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-zinc-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Baris item</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3">Kode</th>
                    <th className="px-5 py-3">Nama</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3">Satuan</th>
                    <th className="px-5 py-3 text-right">Harga satuan</th>
                    <th className="px-5 py-3 text-right">Diskon/satuan</th>
                    <th className="px-5 py-3">Catatan</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(detail.lines ?? []).map((row, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-5 py-3 font-mono text-xs text-zinc-800">{row.barangKode}</td>
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.barangNama}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{row.qty}</td>
                      <td className="px-5 py-3 text-zinc-700">{row.satuanNama ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">{formatRupiah(row.hargaSatuan)}</td>
                      <td className="px-5 py-3 text-right text-zinc-700">
                        {(row.diskon ?? 0) > 0 ? formatRupiah(row.diskon ?? 0) : "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{row.catatan || "—"}</td>
                      <td className="px-5 py-3 text-right font-medium text-zinc-900">{formatRupiah(row.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-zinc-500">
            Ubah faktur menyesuaikan ulang stok barang fisik dan riwayat mutasi sesuai isi faktur terbaru.
          </p>
        </>
      ) : null}
    </div>
  );
}
