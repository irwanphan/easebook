import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow, JurnalKonfigurasi } from "@/data/keuangan";
import type { PengeluaranInsertPayload } from "@/data/pengeluaran";
import { filterAkunBiayaPengeluaran } from "@/lib/akunBiayaPengeluaran";
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

type LineDraft = {
  id: string;
  akunKode: string;
  jumlah: number;
  catatan: string;
};

function newLine(defaultAkun = ""): LineDraft {
  return { id: crypto.randomUUID(), akunKode: defaultAkun, jumlah: 0, catatan: "" };
}

export type PengeluaranFormProps = {
  cancelHref: string;
  onSuccess: () => void;
};

export function PengeluaranForm({ cancelHref, onSuccess }: PengeluaranFormProps) {
  const navigate = useNavigate();
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [kasKode, setKasKode] = useState("");
  const [catatan, setCatatan] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunBiayaList, setAkunBiayaList] = useState<AkunKeuanganRow[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMasterLoading(true);
      try {
        const [akun, config] = await Promise.all([
          invoke<AkunKeuanganRow[]>("akun_keuangan_list"),
          invoke<JurnalKonfigurasi>("jurnal_konfigurasi_get").catch(() => null),
        ]);
        if (cancelled) return;
        const kas = akun.filter((a) => a.isAkunKas);
        const biaya = filterAkunBiayaPengeluaran(akun);
        setAkunKasList(kas);
        setAkunBiayaList(biaya);
        setKasKode((prev) => prev || kas[0]?.kode || "");
        const defaultBiaya = config?.akunPengeluaranLainnya?.trim() || biaya[0]?.kode || "";
        setLines((prev) => {
          if (prev.length === 1 && !prev[0].akunKode && defaultBiaya) {
            return [{ ...prev[0], akunKode: defaultBiaya }];
          }
          return prev;
        });
      } catch {
        if (!cancelled) {
          setAkunKasList([]);
          setAkunBiayaList([]);
        }
      } finally {
        if (!cancelled) setMasterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + Math.max(0, Math.round(l.jumlah)), 0), [lines]);

  function addLine() {
    setLines((prev) => [...prev, newLine(akunBiayaList[0]?.kode || "")]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const payloadLines = lines
      .map((l) => ({
        akunKode: l.akunKode.trim(),
        jumlah: Math.round(l.jumlah),
        catatan: l.catatan.trim(),
      }))
      .filter((l) => l.akunKode && l.jumlah > 0);

    if (!kasKode.trim()) {
      setError("Pilih akun kas pembayaran.");
      return;
    }
    if (payloadLines.length === 0) {
      setError("Isi minimal satu baris biaya dengan akun dan jumlah.");
      return;
    }

    const payload: PengeluaranInsertPayload = {
      tanggal: tanggal.trim(),
      kasKode: kasKode.trim(),
      catatan: catatan.trim(),
      lines: payloadLines,
    };

    setSubmitting(true);
    setError(null);
    try {
      await invoke("pengeluaran_insert", { payload });
      onSuccess();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || masterLoading;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke pengeluaran
        </Link>
        <PageHeader
          title="Tambah pengeluaran"
          description="Catat pembayaran biaya dari kas atau bank. Setiap baris memilih akun beban/biaya."
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
          <h2 className="text-sm font-semibold text-zinc-900">Informasi pembayaran</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pg-tgl" className="block text-sm font-medium text-zinc-700">
                Tanggal
              </label>
              <input
                id="pg-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={inputClass}
                disabled={disabled}
                required
              />
            </div>
            <div>
              <label htmlFor="pg-kas" className="block text-sm font-medium text-zinc-700">
                Dibayar dari (kas / bank)
              </label>
              <select
                id="pg-kas"
                value={kasKode}
                onChange={(e) => setKasKode(e.target.value)}
                className={inputClass}
                disabled={disabled}
                required
              >
                <option value="">— Pilih akun kas —</option>
                {akunKasList.map((a) => (
                  <option key={a.kode} value={a.kode}>
                    {a.kode} — {a.nama}
                  </option>
                ))}
              </select>
              {masterLoading ? (
                <p className="mt-1.5 text-xs text-zinc-400">Memuat akun kas…</p>
              ) : akunKasList.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-700">Belum ada akun kas di Daftar akun.</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pg-catatan" className="block text-sm font-medium text-zinc-700">
                Catatan
              </label>
              <input
                id="pg-catatan"
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className={inputClass}
                disabled={disabled}
                placeholder="opsional"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Baris biaya</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pilih akun beban (mis. 6019 Biaya lain-lain) dan jumlah per item.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 gap-2"
              onClick={addLine}
              disabled={disabled || akunBiayaList.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah baris
            </Button>
          </div>

          {masterLoading ? (
            <p className="px-6 py-8 text-sm text-zinc-500">Memuat daftar akun biaya…</p>
          ) : akunBiayaList.length === 0 ? (
            <p className="px-6 py-8 text-sm text-amber-700">
              Tidak ada akun biaya. Tambahkan akun kelompok Biaya di Daftar akun.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Akun biaya</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                    <th className="px-4 py-3">Keterangan baris</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lines.map((line) => (
                    <tr key={line.id} className="bg-white">
                      <td className="px-4 py-3">
                        <select
                          value={line.akunKode}
                          onChange={(e) => updateLine(line.id, { akunKode: e.target.value })}
                          className={`${inputClass} mt-0`}
                          disabled={disabled}
                          required
                        >
                          <option value="">— Pilih akun —</option>
                          {akunBiayaList.map((a) => (
                            <option key={a.kode} value={a.kode}>
                              {a.kode} — {a.nama}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={line.jumlah || ""}
                          onChange={(e) =>
                            updateLine(line.id, { jumlah: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                          }
                          className={`${inputClass} mt-0 text-right`}
                          disabled={disabled}
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.catatan}
                          onChange={(e) => updateLine(line.id, { catatan: e.target.value })}
                          className={`${inputClass} mt-0`}
                          disabled={disabled}
                          placeholder="opsional"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          onClick={() => removeLine(line.id)}
                          disabled={disabled || lines.length <= 1}
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">
            <div className="ml-auto flex max-w-xs items-center justify-between gap-4 text-sm">
              <span className="font-medium text-zinc-700">Total pengeluaran</span>
              <span className="text-lg font-bold text-zinc-900">{formatRupiah(total)}</span>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Jurnal: debet akun biaya per baris, kredit akun kas yang dipilih (prinsip pembayaran tunai).
            </p>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(cancelHref)} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={disabled || total <= 0 || akunKasList.length === 0 || akunBiayaList.length === 0}
          >
            {submitting ? "Menyimpan…" : "Simpan pengeluaran"}
          </Button>
        </div>
      </form>
    </div>
  );
}
