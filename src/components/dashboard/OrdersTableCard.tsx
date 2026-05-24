import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  PesananPenjualanListRow,
  PesananPenjualanStatus,
} from "@/data/pesananPenjualan";
import { tauriErrorMessage } from "@/lib/tauriError";

const MAX_ROWS = 6;

function statusVariant(status: PesananPenjualanStatus) {
  if (status === "Difakturkan") return "success" as const;
  if (status === "Dibatalkan") return "delayed" as const;
  return "processing" as const;
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
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function OrdersTableCard() {
  const [rows, setRows] = useState<PesananPenjualanListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await invoke<PesananPenjualanListRow[]>(
          "pesanan_penjualan_list",
        );
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) {
          setError(tauriErrorMessage(e));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = useMemo(() => rows.slice(0, MAX_ROWS), [rows]);
  const totalDraft = useMemo(
    () => rows.filter((r) => r.status === "Draft").length,
    [rows],
  );

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Pesanan penjualan
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {loading
              ? "Memuat pesanan terbaru…"
              : rows.length === 0
                ? "Belum ada pesanan tercatat."
                : `${rows.length} pesanan · ${totalDraft} masih draft`}
          </p>
        </div>
        <Link
          to="/penjualan/pesanan"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Lihat semua
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">No. pesanan</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  Memuat data…
                </td>
              </tr>
            ) : recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                  <p>Belum ada pesanan penjualan.</p>
                  <Link
                    to="/penjualan/pesanan/tambah"
                    className="mt-3 inline-block"
                  >
                    <Button type="button" variant="primary" className="px-3 py-1.5 text-xs">
                      <Plus className="h-4 w-4" aria-hidden />
                      Buat pesanan
                    </Button>
                  </Link>
                </td>
              </tr>
            ) : (
              recent.map((row) => (
                <tr key={row.nomor} className="bg-white hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/penjualan/pesanan/detail/${encodeURIComponent(row.nomor)}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      {row.nomor}
                    </Link>
                    {row.fakturNomor ? (
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-emerald-700">
                        Faktur {row.fakturNomor}
                      </p>
                    ) : row.salesman ? (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        {row.salesman}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.pelangganNama}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {formatTanggal(row.tanggalPesanan)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatRupiah(row.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
