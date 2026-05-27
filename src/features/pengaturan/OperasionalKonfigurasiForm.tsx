import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Info,
  Lock,
  ShieldAlert,
  Unlock,
} from "lucide-react";
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
import { PasswordConfirmModal } from "@/features/auth/PasswordConfirmModal";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

/** Permission key untuk mengubah tanggal awal periode (didefinisikan di
 *  `halamanAkses.ts` di grup "Umum"). */
const AKSES_UBAH_AWAL_PERIODE = "pengaturan-ubah-awal-periode";

/**
 * Form pengaturan operasional global.
 *
 * Perilaku kunci:
 *  - Saat tanggal awal periode belum diset → field terbuka, user bebas isi
 *    dan simpan (first-time setup).
 *  - Saat sudah diset → field di-lock (read-only) dengan ikon gembok. Untuk
 *    mengubah, user perlu (1) memiliki hak akses `pengaturan-ubah-awal-periode`,
 *    dan (2) memverifikasi kata sandi via {@link PasswordConfirmModal}.
 *  - Setelah berhasil simpan, kunci kembali otomatis.
 */
export function OperasionalKonfigurasiForm() {
  const { session } = useAuth();
  const [cfg, setCfg] = useState<OperasionalKonfigurasi>(OPERASIONAL_KONFIGURASI_DEFAULT);
  const [original, setOriginal] = useState<OperasionalKonfigurasi>(
    OPERASIONAL_KONFIGURASI_DEFAULT,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /** True = field unlock untuk editing. False = read-only. */
  const [editing, setEditing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const isAdmin = session?.isAdmin ?? false;
  const allowedKeys = useMemo(
    () => new Set(session?.halamanAkses ?? []),
    [session?.halamanAkses],
  );
  const punyaHakUbah = isAdmin || allowedKeys.has(AKSES_UBAH_AWAL_PERIODE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await operasionalKonfigurasiGet();
      setCfg(current);
      setOriginal(current);
      // First-time setup: kalau belum pernah diset, langsung mode editing.
      setEditing(!current.awalPeriode);
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
      setEditing(false);
      setHint("Pengaturan operasional disimpan.");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setCfg(original);
    setEditing(false);
    setError(null);
    setHint(null);
  }

  function handleRequestUnlock() {
    if (!punyaHakUbah) {
      setError(
        "Anda tidak memiliki hak akses untuk mengubah tanggal awal periode. Hubungi administrator.",
      );
      return;
    }
    setPasswordModalOpen(true);
  }

  function handlePasswordConfirmed() {
    setPasswordModalOpen(false);
    setEditing(true);
    setError(null);
    setHint("Kunci dibuka. Anda dapat mengubah tanggal awal periode.");
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat pengaturan operasional…</p>;
  }

  const lengkap = Boolean(cfg.awalPeriode);
  const sudahDiset = Boolean(original.awalPeriode);
  const fieldDisabled = !editing || saving;
  const akanBerubah = sudahDiset && original.awalPeriode !== cfg.awalPeriode;

  return (
    <>
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
              className={`${inputClass} pl-9 ${fieldDisabled ? "pr-9" : ""}`}
              disabled={fieldDisabled}
              aria-readonly={fieldDisabled}
            />
            {fieldDisabled && sudahDiset ? (
              <Lock
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                aria-hidden
              />
            ) : null}
          </div>
          {cfg.awalPeriode ? (
            <p className="mt-1 text-xs text-zinc-500">
              Setara:{" "}
              <strong className="text-zinc-700">{formatTanggalLokal(cfg.awalPeriode)}</strong>
            </p>
          ) : null}
        </div>

        {/* Banner lock saat sudah diset dan field terkunci */}
        {sudahDiset && !editing ? (
          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-zinc-800">Tanggal awal periode dikunci</p>
              <p className="mt-0.5">
                Untuk melindungi konsistensi pembukuan, perubahan setelah ditetapkan butuh konfirmasi
                kata sandi. {!punyaHakUbah ? (
                  <span className="font-medium text-rose-700">
                    Hak akses ini belum diberikan kepada Anda.
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        ) : null}

        {/* Peringatan saat user mengubah tanggal yang sudah pernah diset */}
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
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan pengaturan operasional"}
                </Button>
                {sudahDiset ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestUnlock}
                disabled={!punyaHakUbah}
                title={
                  punyaHakUbah
                    ? "Buka kunci untuk mengubah tanggal"
                    : "Anda tidak punya hak akses untuk aksi ini"
                }
              >
                <Unlock className="h-4 w-4" aria-hidden />
                Ubah
              </Button>
            )}
          </div>
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

      <PasswordConfirmModal
        open={passwordModalOpen}
        title="Buka kunci tanggal awal periode"
        description="Anda akan mengubah tanggal yang sudah ditetapkan sebagai acuan saldo awal dan pembukuan. Masukkan kata sandi untuk membuka kunci."
        confirmLabel="Buka kunci"
        confirmVariant="danger"
        onClose={() => setPasswordModalOpen(false)}
        onConfirmed={handlePasswordConfirmed}
      />
    </>
  );
}
