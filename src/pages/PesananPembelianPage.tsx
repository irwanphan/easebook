import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import type {
  PesananPembelianListRow,
  PesananPembelianStatus,
} from "@/data/pesananPembelian";
import { useLicenseGate } from "@/features/activation/useLicenseGate";
import { TransactionGateBanner } from "@/features/activation/TransactionGateBanner";
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
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(s: PesananPembelianStatus) {
  if (s === "Difakturkan") return "success" as const;
  if (s === "Dibatalkan") return "delayed" as const;
  return "processing" as const;
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
const STATUS_ALL = "";

export function PesananPembelianPage() {
  const navigate = useNavigate();
  const { license, loading: licenseLoading, canCreateTransaction } =
    useLicenseGate();
  const [rows, setRows] = useState<PesananPembelianListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tanggalDari, setTanggalDari] = useState(INITIAL_TANGGAL_DARI);
  const [tanggalSampai, setTanggalSampai] = useState(INITIAL_TANGGAL_SAMPAI);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await invoke<PesananPembelianListRow[]>(
        "pesanan_pembelian_list",
      );
      setRows(list);
    } catch (e) {
      setLoadError(tauriErrorMessage(e));
      setRows([]);
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
      if (tanggalDari && row.tanggalPesanan < tanggalDari) return false;
      if (tanggalSampai && row.tanggalPesanan > tanggalSampai) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (q) {
        const hay =
          `${row.nomor} ${row.pemasokNama} ${row.status} ${row.fakturNomor ?? ""}`
            .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, tanggalDari, tanggalSampai, statusFilter, rentangInvalid]);

  const totalPeriode = useMemo(
    () => filteredRows.reduce((s, r) => s + r.total, 0),
    [filteredRows],
  );
  const totalDraft = useMemo(
    () => filteredRows.filter((r) => r.status === "Draft").length,
    [filteredRows],
  );

  const isDefault =
    tanggalDari === INITIAL_TANGGAL_DARI &&
    tanggalSampai === INITIAL_TANGGAL_SAMPAI &&
    query === "" &&
    statusFilter === STATUS_ALL;

  const handleReset = useCallback(() => {
    setTanggalDari(INITIAL_TANGGAL_DARI);
    setTanggalSampai(INITIAL_TANGGAL_SAMPAI);
    setQuery("");
    setStatusFilter(STATUS_ALL);
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/pembelian"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Pembelian
        </Link>
        <PageHeader
          title="Pesanan pembelian"
          description="Komitmen beli ke pemasok yang belum menambah stok. Saat barang diterima, pesanan dapat dikonversi menjadi faktur pembelian."
          actions={
            <Button
              type="button"
              disabled={!canCreateTransaction}
              onClick={() => navigate("/pembelian/pesanan/tambah")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Pesanan baru
            </Button>
          }
        />
      </div>

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
            fromLabel: "Pesanan mulai",
            toLabel: "Pesanan akhir",
          }}
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari no. pesanan, pemasok, faktur, atau status…",
          }}
          selects={[
            {
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: STATUS_ALL, label: "Semua status" },
                { value: "Draft", label: "Draft (belum difakturkan)" },
                { value: "Difakturkan", label: "Difakturkan" },
                { value: "Dibatalkan", label: "Dibatalkan" },
              ],
            },
          ]}
          onReset={handleReset}
          canReset={!isDefault}
          errorMessage={
            rentangInvalid
              ? "Tanggal akhir tidak boleh sebelum tanggal mulai."
              : null
          }
          summary={
            loading
              ? "Memuat daftar pesanan…"
              : filteredRows.length === 0
                ? rows.length === 0
                  ? "Belum ada pesanan pembelian."
                  : "Tidak ada pesanan pada filter ini."
                : `${filteredRows.length} pesanan · ${totalDraft} draft · total ${formatRupiah(totalPeriode)}`
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. pesanan</th>
                <th className="px-5 py-3">Tgl pesanan</th>
                <th className="px-5 py-3">Pemasok</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Faktur</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat pesanan…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    {rows.length === 0 ? (
                      <>
                        Belum ada pesanan pembelian.{" "}
                        <Button
                          type="button"
                          variant="primary"
                          className="px-2 py-1 text-xs"
                          onClick={() => navigate("/pembelian/pesanan/tambah")}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Pesanan baru
                        </Button>
                        .
                      </>
                    ) : (
                      "Tidak ada pesanan yang cocok dengan filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                      {row.nomor}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {formatTanggal(row.tanggalPesanan)}
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      {row.pemasokNama}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {formatRupiah(row.total)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {row.fakturNomor ? (
                        <Link
                          to={`/pembelian/detail/${encodeURIComponent(row.fakturNomor)}`}
                          className="font-mono font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          {row.fakturNomor}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        onClick={() =>
                          navigate(
                            `/pembelian/pesanan/detail/${encodeURIComponent(row.nomor)}`,
                          )
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
