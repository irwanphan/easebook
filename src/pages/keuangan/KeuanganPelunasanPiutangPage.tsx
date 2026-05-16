import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PelunasanPiutangModal } from "@/features/keuangan/PelunasanPiutangModal";
import type { PiutangBelumLunasRow } from "@/data/pelunasanPiutang";
import { tauriErrorMessage } from "@/lib/tauriError";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isJatuhTempoLewat(jatuhTempo: string) {
  return jatuhTempo < todayLocalISODate();
}

export function KeuanganPelunasanPiutangPage() {
  const [rows, setRows] = useState<PiutangBelumLunasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PiutangBelumLunasRow | null>(null);

  const totalPiutang = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PiutangBelumLunasRow[]>("piutang_belum_lunas_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  function openPelunasan(row: PiutangBelumLunasRow) {
    setSelected(row);
    setModalOpen(true);
  }

  function openPelunasanBaru() {
    if (rows.length === 0) return;
    openPelunasan(rows[0]);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pelunasan piutang"
        description="Faktur penjualan kredit (belum diterima tunai). Catat pembayaran pelanggan untuk melunasi piutang."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Piutang belum lunas</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {loading
                ? "Memuat…"
                : rows.length === 0
                  ? "Tidak ada piutang terbuka."
                  : `${rows.length} faktur · total ${formatRupiah(totalPiutang)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={() => openPelunasanBaru()} disabled={loading || rows.length === 0}>
              Buat pelunasan
            </Button>
            <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={loading}>
              {loading ? "Memuat…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. faktur</th>
                <th className="px-5 py-3">Tanggal faktur</th>
                <th className="px-5 py-3">Jatuh tempo</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3 text-right">Total piutang</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat piutang…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Semua faktur sudah lunas atau penjualan dicatat tunai saat faktur dibuat.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const lewat = isJatuhTempoLewat(row.jatuhTempo);
                  return (
                    <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                      <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggalFaktur)}</td>
                      <td className="px-5 py-3">
                        <span className={lewat ? "font-medium text-rose-700" : "text-zinc-600"}>
                          {formatTanggal(row.jatuhTempo)}
                        </span>
                        {lewat ? (
                          <span className="ml-2 inline-flex">
                            <Badge variant="delayed">Lewat tempo</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.pelangganNama}</td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                      <td className="max-w-[200px] truncate px-5 py-3 text-zinc-600" title={row.catatanFaktur || undefined}>
                        {row.catatanFaktur || "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => openPelunasan(row)}>
                          Pelunasi
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PelunasanPiutangModal
        open={modalOpen}
        faktur={selected}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSaved={fetchRows}
      />
    </div>
  );
}
