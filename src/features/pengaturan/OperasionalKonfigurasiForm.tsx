import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  formatTanggalLokal,
  OPERASIONAL_KONFIGURASI_DEFAULT,
  type OperasionalKonfigurasi,
} from "@/data/operasionalKonfigurasi";
import {
  operasionalKonfigurasiGet,
  operasionalKonfigurasiSet,
} from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

/**
 * Form pengaturan operasional global.
 *
 * Tanggung jawab tunggal: load + simpan `operasional_konfigurasi`. Tidak
 * memuat atau menulis data lain. Form ini self-contained (load saat mount,
 * simpan via tombol) sehingga dapat dipakai ulang di halaman lain (mis.
 * wizard setup pertama).
 */
export function OperasionalKonfigurasiForm() {
  const [cfg, setCfg] = useState<OperasionalKonfigurasi>(OPERASIONAL_KONFIGURASI_DEFAULT);
  const [original, setOriginal] = useState<OperasionalKonfigurasi>(
    OPERASIONAL_KONFIGURASI_DEFAULT,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await operasionalKonfigurasiGet();
      setCfg(current);
      setOriginal(current);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    setSaving(true);
    try {
      const updated = await operasionalKonfigurasiSet({
        awalPeriode: cfg.awalPeriode,
      });
      setCfg(updated);
      setOriginal(updated);
      setHint("Pengaturan operasional disimpan.");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat pengaturan operasional…</p>;
  }

  const lengkap = Boolean(cfg.awalPeriode);
  const sudahDiset = Boolean(original.awalPeriode);
  const akanBerubah =
    sudahDiset && original.awalPeriode !== cfg.awalPeriode;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
      {hint ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{hint}</span>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Untuk apa tanggal ini dipakai?</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>Saldo awal stok dianggap berlaku per tanggal ini.</li>
            <li>Saldo awal kas dan akun keuangan dianggap berlaku per tanggal ini.</li>
            <li>Laporan keuangan dimulai dari tanggal ini (periode sebelumnya tidak dianggap).</li>
          </ul>
        </div>
      </div>

      <div>
        <label htmlFor="op-awal" className="block text-sm font-medium text-zinc-700">
          Tanggal awal periode operasional
          <span className="ml-1 text-rose-600">*</span>
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Pilih hari pertama pembukuan resmi. Disarankan diset sekali di awal dan tidak diubah lagi
          setelah ada saldo awal/transaksi.
        </p>
        <div className="relative mt-1 max-w-xs">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            aria-hidden
          />
          <input
            id="op-awal"
            type="date"
            value={cfg.awalPeriode ?? ""}
            onChange={(e) =>
              setCfg({ awalPeriode: e.target.value ? e.target.value : null })
            }
            className={`${inputClass} pl-9`}
            disabled={saving}
          />
        </div>
        {cfg.awalPeriode ? (
          <p className="mt-1 text-xs text-zinc-500">
            Setara: <strong className="text-zinc-700">{formatTanggalLokal(cfg.awalPeriode)}</strong>
          </p>
        ) : null}
      </div>

      {akanBerubah ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Anda mengubah tanggal awal periode</p>
            <p className="mt-0.5">
              Sebelumnya: <strong>{formatTanggalLokal(original.awalPeriode)}</strong>. Mengubah
              tanggal ini dapat menyebabkan inkonsistensi pada saldo awal dan laporan yang sudah
              dibuat. Pastikan Anda paham implikasinya.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan pengaturan operasional"}
        </Button>
        {lengkap ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Sudah diset.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Belum diset — saldo awal & laporan belum punya acuan tanggal.
          </span>
        )}
      </div>
    </form>
  );
}
