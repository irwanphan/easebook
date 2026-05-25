import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  ExternalLink,
  FileCheck2,
  Pencil,
  Trash2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type {
  PesananPenjualanDetail,
  PesananPenjualanKonversiPayload,
  PesananPenjualanStatus,
} from "@/data/pesananPenjualan";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
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
    month: "long",
    year: "numeric",
  });
}

function statusVariant(s: PesananPenjualanStatus) {
  if (s === "Difakturkan") return "success" as const;
  if (s === "Dibatalkan") return "delayed" as const;
  return "processing" as const;
}

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function plusDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PesananPenjualanDetailPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";
  const { refresh: refreshBarang } = useBarangJasa();

  const [detail, setDetail] = useState<PesananPenjualanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  // Modal state
  const [konversiOpen, setKonversiOpen] = useState(false);
  const [konversiTglFaktur, setKonversiTglFaktur] = useState(todayLocalISODate);
  const [konversiJatuhTempo, setKonversiJatuhTempo] = useState(() =>
    plusDays(todayLocalISODate(), 30),
  );
  const [konversiAkunKas, setKonversiAkunKas] = useState("");
  const [konversiSalesman, setKonversiSalesman] = useState("");
  const [konversiSubmitting, setKonversiSubmitting] = useState(false);
  const [konversiError, setKonversiError] = useState<string | null>(null);
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunKasLoading, setAkunKasLoading] = useState(false);

  // Confirm modals
  const [batalkanOpen, setBatalkanOpen] = useState(false);
  const [batalkanBusy, setBatalkanBusy] = useState(false);
  const [hapusOpen, setHapusOpen] = useState(false);
  const [hapusBusy, setHapusBusy] = useState(false);

  const load = useCallback(async () => {
    if (!nomor.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await invoke<PesananPenjualanDetail>(
        "pesanan_penjualan_detail",
        { nomor: nomor.trim() },
      );
      setDetail(d);
      setKonversiSalesman(d.salesman);
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

  // Muat daftar akun kas saat modal konversi dibuka (lazy).
  useEffect(() => {
    if (!konversiOpen) return;
    let cancelled = false;
    setAkunKasLoading(true);
    (async () => {
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (!cancelled) setAkunKasList(list.filter((a) => a.isAkunKas));
      } catch {
        if (!cancelled) setAkunKasList([]);
      } finally {
        if (!cancelled) setAkunKasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [konversiOpen]);

  async function handleKonversi() {
    if (!detail) return;
    setKonversiError(null);
    if (!konversiTglFaktur.trim()) {
      setKonversiError("Tanggal faktur wajib diisi.");
      return;
    }
    if (!konversiJatuhTempo.trim()) {
      setKonversiError("Jatuh tempo wajib diisi.");
      return;
    }
    if (konversiJatuhTempo < konversiTglFaktur) {
      setKonversiError("Jatuh tempo tidak boleh sebelum tanggal faktur.");
      return;
    }
    const payload: PesananPenjualanKonversiPayload = {
      tanggalFaktur: konversiTglFaktur.trim(),
      jatuhTempo: konversiJatuhTempo.trim(),
      akunKasKode: konversiAkunKas.trim() ? konversiAkunKas.trim() : null,
      salesman: konversiSalesman.trim() || undefined,
    };
    setKonversiSubmitting(true);
    try {
      const nomorFaktur = await invoke<string>(
        "pesanan_penjualan_konversi_ke_faktur",
        { nomor: detail.nomor, payload },
      );
      // Stok kepotong saat konversi → refresh barang context.
      await refreshBarang();
      setKonversiOpen(false);
      navigate(`/penjualan/detail/${encodeURIComponent(nomorFaktur)}`, {
        replace: true,
      });
    } catch (err) {
      setKonversiError(tauriErrorMessage(err));
    } finally {
      setKonversiSubmitting(false);
    }
  }

  async function handleBatalkan() {
    if (!detail) return;
    setBatalkanBusy(true);
    setError(null);
    try {
      await invoke("pesanan_penjualan_batalkan", { nomor: detail.nomor });
      setBatalkanOpen(false);
      setActionInfo("Pesanan berhasil dibatalkan.");
      await load();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setBatalkanBusy(false);
    }
  }

  async function handleHapus() {
    if (!detail) return;
    setHapusBusy(true);
    setError(null);
    try {
      await invoke("pesanan_penjualan_delete", { nomor: detail.nomor });
      setHapusOpen(false);
      navigate("/penjualan/pesanan", { replace: true });
    } catch (e) {
      setError(tauriErrorMessage(e));
      setHapusBusy(false);
    }
  }

  if (!nomor.trim()) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader
          title="Pesanan tidak valid"
          description="Nomor pesanan tidak valid."
        />
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => navigate("/penjualan/pesanan")}
        >
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  const dapatDifakturkan = detail?.status === "Draft";
  const dapatDiubah = detail?.status === "Draft";
  const dapatDibatalkan = detail?.status === "Draft";
  const dapatDihapus =
    detail?.status === "Draft" || detail?.status === "Dibatalkan";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to="/penjualan/pesanan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar pesanan
        </Link>
        <PageHeader
          title="Detail pesanan penjualan"
          description={detail ? `Nomor ${detail.nomor}` : "Memuat data pesanan…"}
          actions={
            detail ? (
              <div className="flex flex-wrap items-center gap-2">
                {dapatDifakturkan ? (
                  <Button
                    type="button"
                    onClick={() => setKonversiOpen(true)}
                  >
                    <FileCheck2 className="h-4 w-4" aria-hidden />
                    Buat faktur penjualan
                  </Button>
                ) : null}
                {dapatDiubah ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    onClick={() =>
                      navigate(
                        `/penjualan/pesanan/ubah/${encodeURIComponent(detail.nomor)}`,
                      )
                    }
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Ubah
                  </Button>
                ) : null}
                {dapatDibatalkan ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    onClick={() => setBatalkanOpen(true)}
                  >
                    <Ban className="h-4 w-4" aria-hidden />
                    Batalkan
                  </Button>
                ) : null}
                {dapatDihapus ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setHapusOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Hapus
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {actionInfo ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {actionInfo}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat…</p> : null}

      {detail && !loading ? (
        <>
          {detail.status === "Difakturkan" && detail.fakturNomor ? (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-emerald-900">
                  <p className="font-semibold">Pesanan sudah difakturkan.</p>
                  <p className="mt-0.5">
                    Stok telah dipotong saat pembuatan faktur. Klik tombol di
                    sebelah kanan untuk melihat faktur penjualannya.
                  </p>
                </div>
                <Link
                  to={`/penjualan/detail/${encodeURIComponent(detail.fakturNomor)}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Lihat faktur {detail.fakturNomor}
                </Link>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Nomor pesanan
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-800">
                  {detail.nomor}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </p>
                <p className="mt-1">
                  <Badge variant={statusVariant(detail.status)}>
                    {detail.status}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Pelanggan
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {detail.pelangganKode} — {detail.pelangganNama}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Gudang
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {detail.gudangKode} — {detail.gudangNama}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Salesman
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {detail.salesman || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Tanggal pesanan
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {formatTanggal(detail.tanggalPesanan)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Target tanggal kirim
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {detail.tanggalKirim ? formatTanggal(detail.tanggalKirim) : "—"}
                </p>
              </div>
              {detail.catatan ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Catatan
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                    {detail.catatan}
                  </p>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ringkasan nilai
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Subtotal barang</dt>
                    <dd className="font-medium text-zinc-900">
                      {formatRupiah(detail.subtotalBarang)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Diskon pesanan</dt>
                    <dd className="text-zinc-800">
                      {detail.diskonFaktur > 0
                        ? `−${formatRupiah(detail.diskonFaktur)}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">Pajak</dt>
                    <dd className="text-zinc-800">
                      {detail.pajak > 0 ? formatRupiah(detail.pajak) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2">
                    <dt className="font-medium text-zinc-900">Total pesanan</dt>
                    <dd className="text-lg font-bold text-zinc-900">
                      {formatRupiah(detail.total)}
                    </dd>
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
                  {detail.lines.map((row, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-5 py-3 font-mono text-xs text-zinc-800">
                        {row.barangKode}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {row.barangNama}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-700">
                        {row.qty}
                      </td>
                      <td className="px-5 py-3 text-zinc-700">
                        {row.satuanNama || "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-700">
                        {formatRupiah(row.hargaSatuan)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-700">
                        {row.diskon > 0 ? formatRupiah(row.diskon) : "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {row.catatan || "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-zinc-900">
                        {formatRupiah(row.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-zinc-500">
            Pesanan TIDAK memotong stok. Stok &amp; jurnal hanya berubah saat
            pesanan dikonversi menjadi faktur penjualan.
          </p>
        </>
      ) : null}

      {/* --- Modal: Konversi ke faktur --- */}
      {detail ? (
        <Modal
          open={konversiOpen}
          title={`Buat faktur dari ${detail.nomor}`}
          onClose={() => {
            if (!konversiSubmitting) {
              setKonversiOpen(false);
              setKonversiError(null);
            }
          }}
          panelClassName="max-w-xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={konversiSubmitting}
                onClick={() => {
                  setKonversiOpen(false);
                  setKonversiError(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => void handleKonversi()}
                disabled={konversiSubmitting}
              >
                {konversiSubmitting ? "Memproses…" : "Buat faktur sekarang"}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-zinc-600">
              Faktur penjualan akan dibuat dengan pelanggan, gudang, dan baris
              item yang sama dengan pesanan ini.
              <strong className="ml-1 text-zinc-800">
                Stok akan dipotong saat faktur tersimpan.
              </strong>
            </p>

            {konversiError ? (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {konversiError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="konv-tgl"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Tanggal faktur
                </label>
                <TokoInput
                  id="konv-tgl"
                  type="date"
                  value={konversiTglFaktur}
                  onChange={(e) => {
                    const next = e.target.value;
                    setKonversiTglFaktur(next);
                    if (konversiJatuhTempo < next) {
                      setKonversiJatuhTempo(plusDays(next, 30));
                    }
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="konv-jt"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Jatuh tempo
                </label>
                <TokoInput
                  id="konv-jt"
                  type="date"
                  value={konversiJatuhTempo}
                  min={konversiTglFaktur}
                  onChange={(e) => setKonversiJatuhTempo(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="konv-salesman"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Salesman
                </label>
                <TokoInput
                  id="konv-salesman"
                  type="text"
                  value={konversiSalesman}
                  onChange={(e) => setKonversiSalesman(e.target.value)}
                  placeholder="(opsional, ikut pesanan kalau kosong)"
                />
              </div>
              <div>
                <label
                  htmlFor="konv-kas"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Diterima melalui
                </label>
                <TokoSelect
                  id="konv-kas"
                  value={konversiAkunKas}
                  onChange={(e) => setKonversiAkunKas(e.target.value)}
                  disabled={akunKasLoading}
                >
                  <option value="">— Piutang (belum diterima) —</option>
                  {akunKasList.map((a) => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} — {a.nama}
                    </option>
                  ))}
                </TokoSelect>
                {akunKasLoading ? (
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Memuat daftar akun kas…
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* --- Confirm: Batalkan pesanan --- */}
      <ConfirmModal
        open={batalkanOpen}
        title="Batalkan pesanan?"
        message={`Pesanan ${detail?.nomor ?? ""} akan ditandai sebagai Dibatalkan. Tindakan ini bisa diikuti dengan menghapus pesanan.`}
        variant="danger"
        confirmLabel="Ya, batalkan"
        loading={batalkanBusy}
        onConfirm={() => void handleBatalkan()}
        onCancel={() => setBatalkanOpen(false)}
      />

      {/* --- Confirm: Hapus pesanan --- */}
      <ConfirmModal
        open={hapusOpen}
        title="Hapus pesanan?"
        message={`Pesanan ${detail?.nomor ?? ""} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="Hapus permanen"
        loading={hapusBusy}
        onConfirm={() => void handleHapus()}
        onCancel={() => setHapusOpen(false)}
      />
    </div>
  );
}
