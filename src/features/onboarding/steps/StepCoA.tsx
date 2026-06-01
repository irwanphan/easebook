/**
 * Step 3 — Struktur Akun Standar (Chart of Accounts / CoA).
 *
 * Memberi user awam tiga pintu masuk untuk membentuk CoA mereka:
 *
 *  1. **Gunakan CoA Standar** (rekomendasi, default). Backend memanggil
 *     seeder `akun_keuangan_seed_standard` yang idempoten — kalau sudah
 *     ada akun, no-op; kalau kosong, membuat ~120 akun mengikuti
 *     standar Indonesia/PSAK (sama dengan yang di-seed otomatis pada
 *     first boot).
 *
 *  2. **Mulai dari nol**. Hapus seluruh tabel `akun_keuangan` lewat
 *     `akun_keuangan_reset_all`. Hanya boleh ketika belum ada
 *     `jurnal_umum` (proxy untuk "belum ada transaksi"). Diberi
 *     `ConfirmModal` untuk mencegah kecelakaan.
 *
 *  3. **Upload CoA dari Excel** — placeholder. Disabled di MVP ini;
 *     mock label "Akan datang" agar user tahu fiturnya direncanakan.
 *
 * Aturan submit (`Lanjut`):
 *  - Pilihan **Standar** → seed kalau kosong, otherwise no-op.
 *  - Pilihan **Kosong**  → kalau jumlah akun saat ini > 0, tampilkan
 *    `ConfirmModal` untuk konfirmasi. Reset baru dijalankan saat user
 *    mengonfirmasi (lihat `handleConfirmReset`). Jika user batal,
 *    `submit()` mengembalikan `false` agar wizard tidak maju.
 *  - Pilihan **Upload** → blokir lanjut sampai user pilih opsi lain
 *    (atau implementasi upload tersedia).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ListChecks,
  Trash2,
} from "lucide-react";
import { TokoOption } from "@/components/ui/TokoOption";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { AkunKeuanganRow } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import {
  loadCoAPilihan,
  saveCoAPilihan,
} from "@/features/onboarding/coaPilihanStorage";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

type Props = {
  onSaved: () => Promise<void>;
};

type Pilihan = "standar" | "kosong" | "upload";

/**
 * Map kelompok internal → label friendly untuk preview ringkas pada
 * opsi "Standar". Tidak perlu cocok dengan UI laporan; hanya untuk
 * memberi user gambaran cakupan akun.
 */
const KELOMPOK_LABEL: Record<string, string> = {
  AKTIVA_LANCAR: "Aktiva Lancar",
  AKTIVA_TETAP: "Aktiva Tetap",
  HUTANG_LANCAR: "Hutang Lancar",
  HUTANG_JANGKA_PANJANG: "Hutang Jangka Panjang",
  MODAL: "Modal",
  PENDAPATAN: "Pendapatan",
  BIAYA: "Biaya",
};

const KELOMPOK_ORDER = [
  "AKTIVA_LANCAR",
  "AKTIVA_TETAP",
  "HUTANG_LANCAR",
  "HUTANG_JANGKA_PANJANG",
  "MODAL",
  "PENDAPATAN",
  "BIAYA",
];

export const StepCoA = forwardRef<OnboardingStepHandle, Props>(function StepCoA(
  { onSaved },
  ref,
) {
  const [pilihan, setPilihan] = useState<Pilihan>(() => {
    // Restore pilihan terakhir bila user pernah lewat step ini.
    const prev = loadCoAPilihan();
    return prev === "standar" || prev === "kosong" || prev === "upload"
      ? prev
      : "standar";
  });
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  /** Resolver yang ditahan saat `ConfirmModal` muncul; di-resolve dari
   *  handler confirm/cancel agar `submit()` (yang dipanggil parent)
   *  benar-benar menunggu keputusan user. */
  const [confirmResolver, setConfirmResolver] = useState<
    ((ok: boolean) => void) | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setAkunList(rows);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Hitung breakdown per kelompok untuk preview pada opsi "Standar".
  const breakdown = (() => {
    const map = new Map<string, number>();
    for (const row of akunList) {
      const key = row.kelompok || "LAIN";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return KELOMPOK_ORDER.filter((k) => (map.get(k) ?? 0) > 0).map((k) => ({
      kelompok: k,
      label: KELOMPOK_LABEL[k] ?? k,
      jumlah: map.get(k) ?? 0,
    }));
  })();

  const jumlahAkun = akunList.length;

  /** Eksekusi reset; dipanggil dari handler ConfirmModal. */
  const doReset = useCallback(async () => {
    setResetBusy(true);
    setError(null);
    try {
      await invoke("akun_keuangan_reset_all");
      saveCoAPilihan("kosong");
      await refresh();
      await onSaved();
      confirmResolver?.(true);
      setConfirmResolver(null);
      setConfirmResetOpen(false);
    } catch (e) {
      const msg = tauriErrorMessage(e);
      setError(msg);
      confirmResolver?.(false);
      setConfirmResolver(null);
      setConfirmResetOpen(false);
    } finally {
      setResetBusy(false);
    }
  }, [confirmResolver, onSaved, refresh]);

  const cancelReset = useCallback(() => {
    if (resetBusy) return;
    confirmResolver?.(false);
    setConfirmResolver(null);
    setConfirmResetOpen(false);
  }, [confirmResolver, resetBusy]);

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        setError(null);
        if (pilihan === "upload") {
          setError(
            "Upload CoA dari Excel belum tersedia. Silakan pilih salah satu opsi lain untuk melanjutkan.",
          );
          return false;
        }
        if (pilihan === "standar") {
          try {
            await invoke<number>("akun_keuangan_seed_standard");
            saveCoAPilihan("standar");
            await refresh();
            await onSaved();
            return true;
          } catch (e) {
            setError(tauriErrorMessage(e));
            return false;
          }
        }
        // pilihan === "kosong"
        if (jumlahAkun === 0) {
          saveCoAPilihan("kosong");
          await onSaved();
          return true;
        }
        // Sudah ada akun — minta konfirmasi sebelum reset.
        return await new Promise<boolean>((resolve) => {
          setConfirmResolver(() => resolve);
          setConfirmResetOpen(true);
        });
      },
    }),
    [pilihan, jumlahAkun, refresh, onSaved],
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <OnboardingStepHeader
        icon={Layers}
        judul="Struktur akun standar (CoA)"
        wajib
        deskripsi="Pilih cara membuat daftar akun (chart of accounts) untuk pembukuan Anda. Anda tetap dapat menambah, mengubah, atau menghapus akun kapan saja dari menu Akuntansi."
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Pilihan struktur akun</legend>

        <TokoOption
          name="coa-pilihan"
          value="standar"
          checked={pilihan === "standar"}
          onChange={() => setPilihan("standar")}
          title="Gunakan CoA Standar (Rekomendasi Sistem)"
          description="Daftar akun bawaan yang mengikuti praktik akuntansi Indonesia (PSAK). Mencakup kas/bank, piutang, hutang, modal, pendapatan, dan biaya — siap pakai untuk usaha dagang & jasa."
          badge="Rekomendasi"
          badgeVariant="brand"
        >
          {loading ? (
            <span className="block text-xs text-zinc-500">Memuat ringkasan…</span>
          ) : jumlahAkun > 0 ? (
            <span className="block">
              <span className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                {jumlahAkun} akun standar sudah tersedia.
              </span>
              <span className="flex flex-wrap gap-1.5">
                {breakdown.map((b) => (
                  <span
                    key={b.kelompok}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200"
                  >
                    {b.label}
                    <span className="text-zinc-400">·</span>
                    <span className="font-semibold text-zinc-900">{b.jumlah}</span>
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span className="block text-xs text-zinc-500">
              Klik <span className="font-semibold text-zinc-700">Lanjut</span> untuk membuat
              ~120 akun standar.
            </span>
          )}
        </TokoOption>

        <TokoOption
          name="coa-pilihan"
          value="kosong"
          checked={pilihan === "kosong"}
          onChange={() => setPilihan("kosong")}
          title="Mulai dari nol (atur sendiri nanti)"
          description="Hapus semua akun bawaan. Anda akan menyiapkan struktur akun sendiri dari menu Akuntansi > Akun Keuangan. Pilih opsi ini hanya jika Anda sudah biasa mendesain CoA."
          badge="Lanjutan"
          badgeVariant="warning"
        >
          {jumlahAkun > 0 ? (
            <span className="flex items-start gap-1.5 rounded-lg bg-amber-50/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {jumlahAkun} akun yang ada sekarang akan dihapus saat Anda klik Lanjut. Operasi
                ini hanya bisa dilakukan sebelum ada jurnal/transaksi.
              </span>
            </span>
          ) : null}
        </TokoOption>

        <TokoOption
          name="coa-pilihan"
          value="upload"
          checked={pilihan === "upload"}
          onChange={() => setPilihan("upload")}
          title={
            <span className="inline-flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-zinc-400" aria-hidden />
              Upload CoA dari Excel
            </span>
          }
          description="Impor daftar akun dari file Excel/CSV milik Anda sendiri. Cocok bila Anda ingin meneruskan CoA dari sistem akuntansi sebelumnya."
          badge="Segera hadir"
          badgeVariant="neutral"
          disabled
        />
      </fieldset>

      <ConfirmModal
        open={confirmResetOpen}
        variant="danger"
        title="Hapus semua akun"
        message={
          <span className="flex flex-col gap-1.5">
            <span>
              {jumlahAkun} akun standar akan dihapus, dan konfigurasi jurnal otomatis akan
              dikosongkan. Anda harus mengatur ulang akun sebelum bisa mencatat transaksi.
            </span>
            <span className="text-xs text-zinc-500">
              Aksi ini tidak dapat dibatalkan.
            </span>
          </span>
        }
        confirmLabel={
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" aria-hidden />
            Ya, hapus semua
          </span>
        }
        loading={resetBusy}
        onConfirm={() => void doReset()}
        onCancel={cancelReset}
      />
    </div>
  );
});
