import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Factory, FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ListFilterBar,
  type SelectFilterOption,
} from "@/components/ui/ListFilterBar";
import { produksiList } from "@/features/produksi/produksiInvoke";
import type { ProduksiListRow, ProduksiStatus } from "@/data/produksi";
import { PRODUKSI_STATUS_OPTIONS } from "@/data/produksi";
import { TransactionGateBanner } from "@/features/activation/TransactionGateBanner";
import { useLicenseGate } from "@/features/activation/useLicenseGate";
import { tauriErrorMessage } from "@/lib/tauriError";
import { formatRupiah, formatTanggalIso } from "@/lib/format";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDari() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultTanggalSampai() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

const INITIAL_TANGGAL_DARI = defaultTanggalDari();
const INITIAL_TANGGAL_SAMPAI = defaultTanggalSampai();
const STATUS_ALL = "" as const;

function statusVariant(s: ProduksiStatus) {
  if (s === "Selesai") return "success" as const;
  if (s === "Menunggu") return "processing" as const;
  return "delayed" as const;
}

export function ProduksiPage() {
  const navigate = useNavigate();
  const { license, loading: licenseLoading, canCreateTransaction } = useLicenseGate();
  const [rows, setRows] = useState<ProduksiListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tanggalDari, setTanggalDari] = useState(INITIAL_TANGGAL_DARI);
  const [tanggalSampai, setTanggalSampai] = useState(INITIAL_TANGGAL_SAMPAI);
  const [statusFilter, setStatusFilter] = useState<ProduksiStatus | "">(STATUS_ALL);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await produksiList({});
      setRows(list);
    } catch (e) {
      setLoadError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return false;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const filteredRows = useMemo(() => {
    if (rentangInvalid) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tanggalDari && row.tanggal < tanggalDari) return false;
      if (tanggalSampai && row.tanggal > tanggalSampai) return false;
      if (statusFilter !== STATUS_ALL && row.status !== statusFilter) return false;
      if (q) {
        const hay = `${row.nomor} ${row.catatan} ${row.gudangBbNama} ${row.gudangHasilNama} ${row.dibuatOleh}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, statusFilter, tanggalDari, tanggalSampai, rentangInvalid]);

  const totalBiaya = useMemo(
    () => filteredRows.reduce((s, r) => s + r.biayaProduksi, 0),
    [filteredRows],
  );

  const statusOptions = useMemo<SelectFilterOption[]>(
    () => [
      { value: STATUS_ALL, label: "Semua status" },
      ...PRODUKSI_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    ],
    [],
  );

  const isDefault =
    tanggalDari === INITIAL_TANGGAL_DARI &&
    tanggalSampai === INITIAL_TANGGAL_SAMPAI &&
    statusFilter === STATUS_ALL &&
    query === "";

  const handleReset = useCallback(() => {
    setTanggalDari(INITIAL_TANGGAL_DARI);
    setTanggalSampai(INITIAL_TANGGAL_SAMPAI);
    setStatusFilter(STATUS_ALL);
    setQuery("");
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Daftar produksi"
        description="Catat konversi bahan baku menjadi barang jadi, lengkap dengan biaya produksi & jurnal otomatis."
        actions={
          <Button
            type="button"
            disabled={!canCreateTransaction}
            onClick={() => navigate("/barang-jasa/produksi/tambah")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Produksi baru
          </Button>
        }
      />

      <TransactionGateBanner license={license} loading={licenseLoading} />

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {loadError}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <ListFilterBar
          dateRange={{
            from: tanggalDari,
            to: tanggalSampai,
            onFromChange: setTanggalDari,
            onToChange: setTanggalSampai,
          }}
          selects={[
            {
              label: "Status",
              value: statusFilter,
              onChange: (v) => setStatusFilter(v as ProduksiStatus | ""),
              options: statusOptions,
            },
          ]}
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari no. produksi, gudang, catatan, atau pembuat…",
          }}
          onReset={handleReset}
          canReset={!isDefault}
          errorMessage={
            rentangInvalid
              ? "Tanggal akhir tidak boleh sebelum tanggal mulai."
              : null
          }
          summary={
            loading
              ? "Memuat daftar produksi…"
              : filteredRows.length === 0
                ? rows.length === 0
                  ? "Belum ada catatan produksi."
                  : "Tidak ada produksi yang cocok dengan filter."
                : `${filteredRows.length} produksi · biaya ${formatRupiah(totalBiaya)}`
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. produksi</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Alur gudang</th>
                <th className="px-5 py-3">Bahan baku</th>
                <th className="px-5 py-3">Hasil</th>
                <th className="px-5 py-3">Biaya</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat daftar produksi…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                    {rows.length === 0 ? (
                      <span className="inline-flex flex-col items-center gap-3">
                        <Factory className="h-7 w-7 text-zinc-400" aria-hidden />
                        <span>
                          Belum ada catatan produksi. Klik{" "}
                          <span className="font-semibold">Produksi baru</span> untuk
                          memulai.
                        </span>
                      </span>
                    ) : (
                      "Tidak ada produksi yang cocok dengan filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.nomor}
                    className="bg-white hover:bg-zinc-50/50"
                    onDoubleClick={() =>
                      navigate(`/barang-jasa/produksi/detail/${encodeURIComponent(row.nomor)}`)
                    }
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                      {row.nomor}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggalIso(row.tanggal)}</td>
                    <td className="px-5 py-3 text-zinc-700">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.gudangBbNama || row.gudangBbKode}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                        <span className="font-medium">{row.gudangHasilNama || row.gudangHasilKode}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      <span className="text-zinc-900">{row.jumlahBahan}</span>
                      <span className="text-zinc-400"> baris · </span>
                      <span>{formatRupiah(row.totalNilaiBb)}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      <span className="text-zinc-900">{row.jumlahHasil}</span>
                      <span className="text-zinc-400"> baris · </span>
                      <span>{formatRupiah(row.totalNilaiHasil)}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{formatRupiah(row.biayaProduksi)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        onClick={() =>
                          navigate(`/barang-jasa/produksi/detail/${encodeURIComponent(row.nomor)}`)
                        }
                        variant="outline"
                        className="px-2 py-1 text-xs"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
