import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PelunasanHutangModal } from "@/features/keuangan/PelunasanHutangModal";
import type { BuatPelunasanHutangLocationState, HutangBelumLunasRow } from "@/data/pelunasanHutang";
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

type FilterTampilan = "semua" | "jatuh_tempo";

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function KeuanganPelunasanHutangPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HutangBelumLunasRow[]>([]);
  const [filter, setFilter] = useState<FilterTampilan>("semua");
  const [filterPemasokKode, setFilterPemasokKode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalFaktur, setModalFaktur] = useState<HutangBelumLunasRow | null>(null);

  const pemasokOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!map.has(r.pemasokKode)) map.set(r.pemasokKode, r.pemasokNama);
    }
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rows]);

  const rowsByPemasok = useMemo(() => {
    if (!filterPemasokKode) return rows;
    return rows.filter((r) => r.pemasokKode === filterPemasokKode);
  }, [rows, filterPemasokKode]);

  const filteredRows = useMemo(() => {
    let list = rowsByPemasok;
    if (filter === "jatuh_tempo") {
      list = list.filter((r) => isJatuhTempoLewat(r.jatuhTempo));
    }
    return list;
  }, [rowsByPemasok, filter]);

  const totalHutang = useMemo(() => filteredRows.reduce((s, r) => s + r.total, 0), [filteredRows]);

  const jatuhTempoCount = useMemo(
    () => rowsByPemasok.filter((r) => isJatuhTempoLewat(r.jatuhTempo)).length,
    [rowsByPemasok],
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<HutangBelumLunasRow[]>("hutang_belum_lunas_list");
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

  useEffect(() => {
    if (!filterPemasokKode) return;
    if (!pemasokOptions.some((p) => p.kode === filterPemasokKode)) {
      setFilterPemasokKode("");
    }
  }, [pemasokOptions, filterPemasokKode]);

  function goBuatPelunasan(state?: BuatPelunasanHutangLocationState) {
    navigate("/keuangan/pelunasan-hutang/buat", { state });
  }

  function openPelunasan(row: HutangBelumLunasRow) {
    setModalFaktur(row);
  }

  function openPelunasanBaru() {
    goBuatPelunasan(filterPemasokKode ? { pemasokKode: filterPemasokKode } : undefined);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pelunasan hutang"
        description="Faktur pembelian kredit (belum dibayar tunai). Catat pembayaran ke supplier untuk melunasi hutang dagang."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Hutang belum lunas</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {loading
                ? "Memuat…"
                : rows.length === 0
                  ? "Tidak ada hutang terbuka."
                  : filteredRows.length === 0
                    ? rowsByPemasok.length === 0
                      ? filterPemasokKode
                        ? "Tidak ada hutang untuk pemasok ini."
                        : filter === "jatuh_tempo"
                          ? `Tidak ada faktur jatuh tempo (${rows.length} hutang lain masih dalam tempo).`
                          : "Tidak ada faktur sesuai filter."
                      : filter === "jatuh_tempo"
                        ? `Tidak ada faktur jatuh tempo untuk filter ini (${rowsByPemasok.length} faktur masih dalam tempo).`
                        : "Tidak ada faktur sesuai filter."
                    : `${filteredRows.length} faktur ditampilkan · total ${formatRupiah(totalHutang)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={() => openPelunasanBaru()} disabled={loading || rows.length === 0}>
              Buat pelunasan
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/keuangan/pelunasan-hutang/daftar")}>
              Daftar pelunasan hutang
            </Button>
            <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={loading}>
              {loading ? "Memuat…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-6 pb-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
            <div>
              <label htmlFor="ph-pemasok" className="block text-sm font-medium text-zinc-700">
                Pemasok
              </label>
              <select
                id="ph-pemasok"
                value={filterPemasokKode}
                onChange={(e) => setFilterPemasokKode(e.target.value)}
                className={`${inputClass} mt-1 w-full`}
                disabled={loading}
              >
                <option value="">Semua pemasok</option>
                {pemasokOptions.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ph-filter" className="block text-sm font-medium text-zinc-700">
                Jatuh tempo
              </label>
              <select
                id="ph-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterTampilan)}
                className={`${inputClass} mt-1 w-full`}
                disabled={loading}
              >
                <option value="semua">Semua hutang belum lunas</option>
                <option value="jatuh_tempo">Hanya jatuh tempo lewat ({jatuhTempoCount})</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. faktur</th>
                <th className="px-5 py-3">Tanggal faktur</th>
                <th className="px-5 py-3">Jatuh tempo</th>
                <th className="px-5 py-3">Pemasok</th>
                <th className="px-5 py-3 text-right">Total hutang</th>
                <th className="px-5 py-3">Metode</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat hutang…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Semua faktur sudah lunas atau pembelian dicatat tunai saat faktur dibuat.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Tidak ada faktur sesuai filter. Ubah pemasok atau jatuh tempo untuk melihat faktur lain.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
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
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.pemasokNama}</td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                      <td className="px-5 py-3 text-zinc-600">{row.metodePembayaran || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => openPelunasan(row)}
                        >
                          Lunaskan
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

      <PelunasanHutangModal
        open={modalFaktur != null}
        faktur={modalFaktur}
        onClose={() => setModalFaktur(null)}
        onSaved={fetchRows}
      />
    </div>
  );
}
