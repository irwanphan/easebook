import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { HutangBelumLunasRow, PelunasanHutangBatchPayload } from "@/data/pelunasanHutang";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

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

export type PelunasanHutangBatchFormProps = {
  cancelHref: string;
  onSuccess: () => void;
  initialPemasokKode?: string;
  preselectNomor?: string[];
};

export function PelunasanHutangBatchForm({
  cancelHref,
  onSuccess,
  initialPemasokKode = "",
  preselectNomor = [],
}: PelunasanHutangBatchFormProps) {
  const navigate = useNavigate();
  const [allHutang, setAllHutang] = useState<HutangBelumLunasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pemasokKode, setPemasokKode] = useState(initialPemasokKode);
  const [selectedNomor, setSelectedNomor] = useState<Set<string>>(() => new Set(preselectNomor));
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [kasKode, setKasKode] = useState("");
  const [catatan, setCatatan] = useState("");
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunKasLoading, setAkunKasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preselectApplied, setPreselectApplied] = useState(false);

  const fetchHutang = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<HutangBelumLunasRow[]>("hutang_belum_lunas_list");
      setAllHutang(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setAllHutang([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHutang();
  }, [fetchHutang]);

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

  const pemasokOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allHutang) {
      if (!map.has(r.pemasokKode)) map.set(r.pemasokKode, r.pemasokNama);
    }
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [allHutang]);

  const hutangPemasok = useMemo(() => {
    if (!pemasokKode) return [];
    return allHutang
      .filter((r) => r.pemasokKode === pemasokKode)
      .sort((a, b) => a.tanggalFaktur.localeCompare(b.tanggalFaktur));
  }, [allHutang, pemasokKode]);

  const selectedRows = useMemo(
    () => hutangPemasok.filter((r) => selectedNomor.has(r.nomor)),
    [hutangPemasok, selectedNomor],
  );

  const totalSelected = useMemo(() => selectedRows.reduce((s, r) => s + r.total, 0), [selectedRows]);

  const allChecked =
    hutangPemasok.length > 0 && hutangPemasok.every((r) => selectedNomor.has(r.nomor));
  const someChecked = hutangPemasok.some((r) => selectedNomor.has(r.nomor)) && !allChecked;

  useEffect(() => {
    if (!pemasokKode) return;
    if (!pemasokOptions.some((p) => p.kode === pemasokKode)) {
      setPemasokKode("");
      setSelectedNomor(new Set());
    }
  }, [pemasokOptions, pemasokKode]);

  useEffect(() => {
    if (preselectApplied || loading || !pemasokKode || preselectNomor.length === 0) return;
    const valid = preselectNomor.filter((n) => hutangPemasok.some((r) => r.nomor === n));
    if (valid.length > 0) {
      setSelectedNomor(new Set(valid));
    }
    setPreselectApplied(true);
  }, [loading, pemasokKode, hutangPemasok, preselectNomor, preselectApplied]);

  function handlePemasokChange(kode: string) {
    setPemasokKode(kode);
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
    setSelectedNomor(new Set(hutangPemasok.map((r) => r.nomor)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!pemasokKode.trim()) {
      setError("Pilih pemasok.");
      return;
    }
    if (selectedNomor.size === 0) {
      setError("Pilih minimal satu faktur hutang.");
      return;
    }
    if (!kasKode.trim()) {
      setError("Pilih akun kas pembayaran.");
      return;
    }

    const payload: PelunasanHutangBatchPayload = {
      pemasokKode: pemasokKode.trim(),
      tanggal: tanggal.trim(),
      kasKode: kasKode.trim(),
      catatan: catatan.trim(),
      nomorFaktur: [...selectedNomor],
    };

    setSubmitting(true);
    setError(null);
    try {
      await invoke("pelunasan_hutang_apply_batch", { payload });
      onSuccess();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const pemasokNama = pemasokOptions.find((p) => p.kode === pemasokKode)?.nama;
  const formDisabled = submitting || loading || akunKasLoading;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke pelunasan hutang
        </Link>
        <PageHeader
          title="Buat pelunasan hutang"
          description="Pilih pemasok, centang faktur yang dibayar, lalu catat pembayaran dari kas atau bank."
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
          <h2 className="text-sm font-semibold text-zinc-900">Pemasok</h2>
          <p className="mt-1 text-sm text-zinc-500">Hanya pemasok dengan hutang belum lunas ditampilkan.</p>
          <div className="mt-4 max-w-md">
            <label htmlFor="phb-pemasok" className="block text-sm font-medium text-zinc-700">
              Pemasok
            </label>
            <select
              id="phb-pemasok"
              value={pemasokKode}
              onChange={(e) => handlePemasokChange(e.target.value)}
              className={inputClass}
              disabled={formDisabled || pemasokOptions.length === 0}
              required
            >
              <option value="">— Pilih pemasok —</option>
              {pemasokOptions.map((p) => (
                <option key={p.kode} value={p.kode}>
                  {p.kode} — {p.nama}
                </option>
              ))}
            </select>
            {loading ? (
              <p className="mt-1.5 text-xs text-zinc-400">Memuat hutang…</p>
            ) : pemasokOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">Tidak ada hutang terbuka.</p>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Faktur hutang</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {!pemasokKode
                ? "Pilih pemasok untuk melihat daftar faktur."
                : loading
                  ? "Memuat faktur…"
                  : hutangPemasok.length === 0
                    ? "Tidak ada hutang untuk pemasok ini."
                    : `${hutangPemasok.length} faktur · centang yang akan dilunasi`}
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
                      disabled={!pemasokKode || hutangPemasok.length === 0 || formDisabled}
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
                {!pemasokKode ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Pilih pemasok terlebih dahulu.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Memuat…
                    </td>
                  </tr>
                ) : hutangPemasok.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Semua faktur pemasok ini sudah lunas.
                    </td>
                  </tr>
                ) : (
                  hutangPemasok.map((row) => {
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
          <h2 className="text-sm font-semibold text-zinc-900">Ringkasan & pembayaran</h2>

          <div className="mt-4 space-y-3 border-b border-zinc-100 pb-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">Pemasok</span>
              <span className="font-medium text-zinc-900">{pemasokNama || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">Faktur dipilih</span>
              <span className="font-medium text-zinc-900">{selectedRows.length} faktur</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total pelunasan</span>
              <span className="text-lg font-bold text-zinc-900">{formatRupiah(totalSelected)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phb-tgl" className="block text-sm font-medium text-zinc-700">
                Tanggal pelunasan
              </label>
              <input
                id="phb-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={inputClass}
                disabled={formDisabled}
                required
              />
            </div>
            <div>
              <label htmlFor="phb-kas" className="block text-sm font-medium text-zinc-700">
                Dibayar melalui (kas / bank)
              </label>
              <select
                id="phb-kas"
                value={kasKode}
                onChange={(e) => setKasKode(e.target.value)}
                className={inputClass}
                disabled={formDisabled}
                required
              >
                <option value="">— Pilih akun kas —</option>
                {akunKasList.map((a) => (
                  <option key={a.kode} value={a.kode}>
                    {a.kode} — {a.nama}
                  </option>
                ))}
              </select>
              {akunKasLoading ? (
                <p className="mt-1.5 text-xs text-zinc-400">Memuat akun kas…</p>
              ) : akunKasList.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-700">Belum ada akun kas di Daftar akun.</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="phb-catatan" className="block text-sm font-medium text-zinc-700">
              Catatan
            </label>
            <input
              id="phb-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className={inputClass}
              disabled={formDisabled}
              placeholder="opsional"
            />
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Setiap faktur dilunasi penuh. Saat disimpan, dicatat satu jurnal: debet akun hutang, kredit akun kas yang
            dipilih (akun hutang dari konfigurasi akun jurnal).
          </p>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(cancelHref)} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={formDisabled || !pemasokKode || selectedNomor.size === 0 || akunKasList.length === 0}
          >
            {submitting ? "Menyimpan…" : "Simpan pelunasan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
