import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, FileText, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import type { PenjualanListRow } from "@/data/penjualan";
import type { PesananPenjualanListRow } from "@/data/pesananPenjualan";
import { TransactionGateBanner } from "@/features/activation/TransactionGateBanner";
import { useLicenseGate } from "@/features/activation/useLicenseGate";
import { tauriErrorMessage } from "@/lib/tauriError";

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

function statusVariant(s: string) {
  if (s === "Lunas") return "success" as const;
  if (s === "Dipesan") return "processing" as const;
  if (s === "Dibatalkan") return "delayed" as const;
  return "neutral" as const;
}

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

export function PenjualanPage() {
  const navigate = useNavigate();
  const { license, loading: licenseLoading, canCreateTransaction } = useLicenseGate();
  const [rows, setRows] = useState<PenjualanListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tanggalDari, setTanggalDari] = useState(INITIAL_TANGGAL_DARI);
  const [tanggalSampai, setTanggalSampai] = useState(INITIAL_TANGGAL_SAMPAI);
  const [query, setQuery] = useState("");

  // Jumlah pesanan aktif (status Draft / belum difakturkan) untuk ditampilkan
  // sebagai bubble pada tombol "Pesanan".
  const [pesananAktif, setPesananAktif] = useState(0);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await invoke<PenjualanListRow[]>("penjualan_list");
      setRows(list);
    } catch (e) {
      setLoadError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPesananAktif = useCallback(async () => {
    try {
      const list = await invoke<PesananPenjualanListRow[]>(
        "pesanan_penjualan_list",
      );
      setPesananAktif(list.filter((r) => r.status === "Draft").length);
    } catch {
      setPesananAktif(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshPesananAktif();
  }, [refresh, refreshPesananAktif]);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return false;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const filteredRows = useMemo(() => {
    if (rentangInvalid) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tanggalDari && row.tanggalFaktur < tanggalDari) return false;
      if (tanggalSampai && row.tanggalFaktur > tanggalSampai) return false;
      if (q) {
        const hay =
          `${row.nomor} ${row.pelangganNama} ${row.salesman} ${row.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, tanggalDari, tanggalSampai, rentangInvalid]);

  const totalPeriode = useMemo(
    () => filteredRows.reduce((s, r) => s + r.total, 0),
    [filteredRows],
  );

  const isDefault =
    tanggalDari === INITIAL_TANGGAL_DARI &&
    tanggalSampai === INITIAL_TANGGAL_SAMPAI &&
    query === "";

  const handleReset = useCallback(() => {
    setTanggalDari(INITIAL_TANGGAL_DARI);
    setTanggalSampai(INITIAL_TANGGAL_SAMPAI);
    setQuery("");
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Penjualan"
        description="Faktur jual ke pelanggan"
        actions={
          <>
            <div className="relative inline-flex">
              <Button
                type="button"
                disabled={!canCreateTransaction}
                onClick={() => navigate("/penjualan/pesanan")}
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Pesanan
              </Button>
              {pesananAktif > 0 ? (
                <span
                  className="pointer-events-none absolute -right-2.5 -top-2.5 inline-flex p-2.5 h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold leading-none text-white shadow-sm"
                  aria-label={`${pesananAktif} pesanan aktif menunggu difakturkan`}
                  title={`${pesananAktif} pesanan aktif menunggu difakturkan`}
                >
                  {pesananAktif > 99 ? "99+" : pesananAktif}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              disabled={!canCreateTransaction}
              onClick={() => navigate("/penjualan/tambah")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Faktur jual baru
            </Button>
          </>
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
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari no. faktur, pelanggan, salesman, atau status…",
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
              ? "Memuat daftar faktur…"
              : filteredRows.length === 0
                ? rows.length === 0
                  ? "Belum ada faktur penjualan."
                  : "Tidak ada faktur pada periode/pencarian ini."
                : `${filteredRows.length} faktur · total ${formatRupiah(totalPeriode)}`
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. faktur</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Salesman</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat faktur penjualan…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    {rows.length === 0 ? (
                      <>
                        Belum ada faktur penjualan.{" "}
                        <Button
                          type="button"
                          variant="primary"
                          className="px-2 py-1 text-xs"
                          onClick={() => navigate("/penjualan/tambah")}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Faktur jual baru
                        </Button>
                        .
                      </>
                    ) : (
                      "Tidak ada faktur yang cocok dengan filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggalFaktur)}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{row.pelangganNama}</td>
                    <td className="px-5 py-3 text-zinc-600">{row.salesman || "—"}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{formatRupiah(row.total)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        onClick={() => navigate(`/penjualan/detail/${encodeURIComponent(row.nomor)}`)}
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
