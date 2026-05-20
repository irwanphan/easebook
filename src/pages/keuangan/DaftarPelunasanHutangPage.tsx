import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { PelunasanHutangRiwayatRow } from "@/data/pelunasanHutang";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput } from "@/components/ui/TokoInput";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDariBulanIni() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultTanggalSampaiBulanIni() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
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

function formatWaktuDicatat(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DaftarPelunasanHutangPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDariBulanIni);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampaiBulanIni);
  const [rows, setRows] = useState<PelunasanHutangRiwayatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hapusTarget, setHapusTarget] = useState<PelunasanHutangRiwayatRow | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const totalPeriode = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

  const fetchRows = useCallback(async () => {
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PelunasanHutangRiwayatRow[]>("pelunasan_hutang_riwayat_list", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function handleHapus() {
    if (!hapusTarget) return;
    if (!session?.username) {
      setError("Sesi pengguna tidak terbaca — silakan login ulang.");
      return;
    }
    setMenghapus(true);
    setError(null);
    try {
      await invoke("pelunasan_hutang_delete", {
        nomor: hapusTarget.nomor,
        actorUsername: session.username,
        actorNama: session.namaLengkap ?? "",
      });
      setHapusTarget(null);
      await fetchRows();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/keuangan/pelunasan-hutang"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Kembali ke hutang belum lunas
        </Link>
        <PageHeader
          title="Daftar pelunasan hutang"
          description="Riwayat pelunasan hutang yang tercatat di sistem. Klik baris untuk melihat detail faktur pembelian dan kas pembayaran."
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label htmlFor="lh-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <TokoInput
                id="lh-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lh-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <TokoInput
                id="lh-sampai"
                type="date"
                value={tanggalSampai}
                onChange={(e) => setTanggalSampai(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={loading}>
            {loading ? "Memuat…" : "Terapkan filter"}
          </Button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <p className="text-sm text-zinc-500">
            {loading
              ? "Memuat…"
              : rows.length === 0
                ? "Belum ada pelunasan pada periode ini. Hanya pelunasan yang disimpan lewat menu ini yang tercatat."
                : `${rows.length} pelunasan · total ${formatRupiah(totalPeriode)}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. pelunasan</th>
                <th className="px-5 py-3">Tanggal pelunasan</th>
                <th className="px-5 py-3">Dicatat</th>
                <th className="px-5 py-3">Pemasok</th>
                <th className="px-5 py-3">Dibayar dari kas</th>
                <th className="px-5 py-3 text-right">Faktur</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat riwayat…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Tidak ada data pelunasan untuk filter ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggal)}</td>
                    <td className="px-5 py-3 text-zinc-500">{formatWaktuDicatat(row.createdAt)}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{row.pemasokNama}</td>
                    <td className="px-5 py-3 text-zinc-700">
                      <span className="font-mono text-xs">{row.akunKasKode}</span>
                      {row.akunKasNama ? (
                        <span className="ml-1.5 text-zinc-600">— {row.akunKasNama}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600">{row.jumlahFaktur}</td>
                    <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() =>
                            navigate(`/keuangan/pelunasan-hutang/daftar/${encodeURIComponent(row.nomor)}`)
                          }
                        >
                          Detail
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => setHapusTarget(row)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={hapusTarget !== null}
        title="Hapus pelunasan hutang ini?"
        message={
          hapusTarget
            ? `Pelunasan ${hapusTarget.nomor} untuk ${hapusTarget.pemasokNama} (${formatRupiah(hapusTarget.total)}) akan dihapus. ` +
              `Sistem otomatis membuat jurnal pembalik untuk jurnal asal, sehingga saldo akun kembali seperti sebelum pelunasan. ` +
              `${hapusTarget.jumlahFaktur} faktur pembelian terkait akan dibuka kembali sebagai hutang belum lunas. ` +
              `Jurnal asal dan baris audit log tetap tersimpan sebagai jejak.`
            : ""
        }
        confirmLabel="Ya, hapus pelunasan"
        variant="danger"
        loading={menghapus}
        onConfirm={() => void handleHapus()}
        onCancel={() => {
          if (!menghapus) setHapusTarget(null);
        }}
      />
    </div>
  );
}
