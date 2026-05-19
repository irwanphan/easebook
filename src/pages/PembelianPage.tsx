import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PembelianListRow } from "@/data/pembelian";
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
  if (s === "Diterima") return "success" as const;
  if (s === "Dipesan") return "processing" as const;
  if (s === "Dibatalkan") return "delayed" as const;
  return "neutral" as const;
}

export function PembelianPage() {
  const navigate = useNavigate();
  const { license, loading: licenseLoading, canCreateTransaction } = useLicenseGate();
  const [rows, setRows] = useState<PembelianListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await invoke<PembelianListRow[]>("pembelian_list");
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pembelian"
        description="Faktur beli dari pemasok — tercatat di database lokal."
        actions={
          <Button
            type="button"
            disabled={!canCreateTransaction}
            onClick={() => navigate("/pembelian/tambah")}
          >
            Faktur beli baru
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

      {loading ? <p className="text-sm text-zinc-500">Memuat daftar faktur…</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. faktur</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Pemasok</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Belum ada faktur pembelian.{" "}
                    <button
                      type="button"
                      className="font-semibold text-brand-600 hover:text-brand-700"
                      onClick={() => navigate("/pembelian/tambah")}
                    >
                      Buat faktur beli baru
                    </button>
                    .
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggalFaktur)}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{row.pemasokNama}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{formatRupiah(row.total)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/pembelian/detail/${encodeURIComponent(row.nomor)}`}
                        className="inline-flex rounded-xl px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                      >
                        Detail
                      </Link>
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
