import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { PelunasanPiutangBatchPayload, PiutangBelumLunasRow } from "@/data/pelunasanPiutang";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";

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

export type PelunasanPiutangBatchFormProps = {
  cancelHref: string;
  onSuccess: () => void;
  initialPelangganKode?: string;
  preselectNomor?: string[];
};

export function PelunasanPiutangBatchForm({
  cancelHref,
  onSuccess,
  initialPelangganKode = "",
  preselectNomor = [],
}: PelunasanPiutangBatchFormProps) {
  const navigate = useNavigate();
  const [allPiutang, setAllPiutang] = useState<PiutangBelumLunasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pelangganKode, setPelangganKode] = useState(initialPelangganKode);
  const [selectedNomor, setSelectedNomor] = useState<Set<string>>(() => new Set(preselectNomor));
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [kasKode, setKasKode] = useState("");
  const [catatan, setCatatan] = useState("");
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunKasLoading, setAkunKasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preselectApplied, setPreselectApplied] = useState(false);

  const fetchPiutang = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PiutangBelumLunasRow[]>("piutang_belum_lunas_list");
      setAllPiutang(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setAllPiutang([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPiutang();
  }, [fetchPiutang]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAkunKasLoading(true);
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (!cancelled) {
          const kas = list.filter((a) => a.isAkunKas);
          setAkunKasList(kas);
          setKasKode((prev) => prev || kas[0]?.kode || "");
        }
      } catch {
        if (!cancelled) setAkunKasList([]);
      } finally {
        if (!cancelled) setAkunKasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pelangganOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allPiutang) {
      if (!map.has(r.pelangganKode)) map.set(r.pelangganKode, r.pelangganNama);
    }
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [allPiutang]);

  const piutangPelanggan = useMemo(() => {
    if (!pelangganKode) return [];
    return allPiutang
      .filter((r) => r.pelangganKode === pelangganKode)
      .sort((a, b) => a.tanggalFaktur.localeCompare(b.tanggalFaktur));
  }, [allPiutang, pelangganKode]);

  const selectedRows = useMemo(
    () => piutangPelanggan.filter((r) => selectedNomor.has(r.nomor)),
    [piutangPelanggan, selectedNomor],
  );

  const totalSelected = useMemo(() => selectedRows.reduce((s, r) => s + r.total, 0), [selectedRows]);

  const allChecked =
    piutangPelanggan.length > 0 && piutangPelanggan.every((r) => selectedNomor.has(r.nomor));
  const someChecked = piutangPelanggan.some((r) => selectedNomor.has(r.nomor)) && !allChecked;

  useEffect(() => {
    if (!pelangganKode) return;
    if (!pelangganOptions.some((p) => p.kode === pelangganKode)) {
      setPelangganKode("");
      setSelectedNomor(new Set());
    }
  }, [pelangganOptions, pelangganKode]);

  useEffect(() => {
    if (preselectApplied || loading || !pelangganKode || preselectNomor.length === 0) return;
    const valid = preselectNomor.filter((n) => piutangPelanggan.some((r) => r.nomor === n));
    if (valid.length > 0) {
      setSelectedNomor(new Set(valid));
    }
    setPreselectApplied(true);
  }, [loading, pelangganKode, piutangPelanggan, preselectNomor, preselectApplied]);

  function handlePelangganChange(kode: string) {
    setPelangganKode(kode);
    setSelectedNomor(new Set());
    setPreselectApplied(true);
  }

  function toggleNomor(nomor: string) {
    setSelectedNomor((prev) => {
      const next = new Set(prev);
      if (next.has(nomor)) next.delete(nomor);
      else next.add(nomor);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedNomor(new Set());
      return;
    }
    setSelectedNomor(new Set(piutangPelanggan.map((r) => r.nomor)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!pelangganKode.trim()) {
      setError("Pilih pelanggan.");
      return;
    }
    if (selectedNomor.size === 0) {
      setError("Pilih minimal satu faktur piutang.");
      return;
    }
    if (!kasKode.trim()) {
      setError("Pilih akun kas penerimaan.");
      return;
    }

    const payload: PelunasanPiutangBatchPayload = {
      pelangganKode: pelangganKode.trim(),
      tanggal: tanggal.trim(),
      kasKode: kasKode.trim(),
      catatan: catatan.trim(),
      nomorFaktur: [...selectedNomor],
    };

    setSubmitting(true);
    setError(null);
    try {
      await invoke("pelunasan_piutang_apply_batch", { payload });
      onSuccess();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const pelangganNama = pelangganOptions.find((p) => p.kode === pelangganKode)?.nama;
  const formDisabled = submitting || loading || akunKasLoading;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke pelunasan piutang
        </Link>
        <PageHeader
          title="Buat pelunasan piutang"
          description="Pilih pelanggan, centang faktur yang dibayar, lalu catat penerimaan ke kas atau bank."
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Pelanggan</h2>
          <p className="mt-1 text-sm text-zinc-500">Hanya pelanggan dengan piutang belum lunas ditampilkan.</p>
          <div className="mt-4 max-w-md">
            <label htmlFor="ppb-pelanggan" className="block text-sm font-medium text-zinc-700">
              Pelanggan
            </label>
            <TokoSelect
              id="ppb-pelanggan"
              value={pelangganKode}
              onChange={(e) => handlePelangganChange(e.target.value)}
              disabled={formDisabled || pelangganOptions.length === 0}
              required
            >
              <option value="">— Pilih pelanggan —</option>
              {pelangganOptions.map((p) => (
                <option key={p.kode} value={p.kode}>
                  {p.kode} — {p.nama}
                </option>
              ))}
            </TokoSelect>
            {loading ? (
              <p className="mt-1.5 text-xs text-zinc-400">Memuat piutang…</p>
            ) : pelangganOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">Tidak ada piutang terbuka.</p>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-100 pb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Faktur piutang</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {!pelangganKode
                ? "Pilih pelanggan untuk melihat daftar faktur."
                : loading
                  ? "Memuat faktur…"
                  : piutangPelanggan.length === 0
                    ? "Tidak ada piutang untuk pelanggan ini."
                    : `${piutangPelanggan.length} faktur · centang yang akan dilunasi`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      disabled={!pelangganKode || piutangPelanggan.length === 0 || formDisabled}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Pilih semua faktur"
                    />
                  </th>
                  <th className="px-4 py-3">No. faktur</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Jatuh tempo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {!pelangganKode ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Pilih pelanggan terlebih dahulu.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Memuat…
                    </td>
                  </tr>
                ) : piutangPelanggan.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Semua faktur pelanggan ini sudah lunas.
                    </td>
                  </tr>
                ) : (
                  piutangPelanggan.map((row) => {
                    const lewat = isJatuhTempoLewat(row.jatuhTempo);
                    const checked = selectedNomor.has(row.nomor);
                    return (
                      <tr
                        key={row.nomor}
                        className={`cursor-pointer bg-white hover:bg-zinc-50/50 ${checked ? "bg-brand-50/30" : ""}`}
                        onClick={() => !formDisabled && toggleNomor(row.nomor)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                            checked={checked}
                            disabled={formDisabled}
                            onChange={() => toggleNomor(row.nomor)}
                            aria-label={`Pilih faktur ${row.nomor}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                        <td className="px-4 py-3 text-zinc-600">{formatTanggal(row.tanggalFaktur)}</td>
                        <td className="px-4 py-3">
                          <span className={lewat ? "font-medium text-rose-700" : "text-zinc-600"}>
                            {formatTanggal(row.jatuhTempo)}
                          </span>
                          {lewat ? (
                            <span className="ml-2 inline-flex">
                              <Badge variant="delayed">Lewat tempo</Badge>
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Ringkasan & penerimaan</h2>

          <div className="mt-4 space-y-3 border-b border-zinc-100 pb-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">Pelanggan</span>
              <span className="font-medium text-zinc-900">{pelangganNama || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">Faktur dipilih</span>
              <span className="font-medium text-zinc-900">
                {selectedRows.length} faktur
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total pelunasan</span>
              <span className="text-lg font-bold text-zinc-900">{formatRupiah(totalSelected)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ppb-tgl" className="block text-sm font-medium text-zinc-700">
                Tanggal pelunasan
              </label>
              <TokoInput
                id="ppb-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={formDisabled}
                required
              />
            </div>
            <div>
              <label htmlFor="ppb-kas" className="block text-sm font-medium text-zinc-700">
                Diterima melalui (kas / bank)
              </label>
              <TokoSelect
                id="ppb-kas"
                value={kasKode}
                onChange={(e) => setKasKode(e.target.value)}
                disabled={formDisabled}
                required
              >
                <option value="">— Pilih akun kas —</option>
                {akunKasList.map((a) => (
                  <option key={a.kode} value={a.kode}>
                    {a.kode} — {a.nama}
                  </option>
                ))}
              </TokoSelect>
              {akunKasLoading ? (
                <p className="mt-1.5 text-xs text-zinc-400">Memuat akun kas…</p>
              ) : akunKasList.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-700">Belum ada akun kas di Daftar akun.</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="ppb-catatan" className="block text-sm font-medium text-zinc-700">
              Catatan
            </label>
            <TokoInput
              id="ppb-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              disabled={formDisabled}
              placeholder="Catatan pelunasan"
            />
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Setiap faktur dilunasi penuh. Saat disimpan, dicatat satu jurnal: debet akun kas yang dipilih, kredit akun
            piutang (dari konfigurasi akun jurnal).
          </p>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(cancelHref)} disabled={submitting}>
            <X className="h-4 w-4" aria-hidden />
            Batal
          </Button>
          <Button
            type="submit"
            disabled={
              formDisabled ||
              !pelangganKode ||
              selectedNomor.size === 0 ||
              akunKasList.length === 0
            }
          >
            <Save className="h-4 w-4" aria-hidden />
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
