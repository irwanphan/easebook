/**
 * Daftar canonical step pada wizard onboarding.
 *
 * Sengaja dipisah dari komponen agar urutan, label, dan id step menjadi
 * single source of truth untuk:
 *  - stepper visual di {@link OnboardingProgressStepper},
 *  - hook flow state ({@link useOnboardingFlow}),
 *  - dan checklist evaluator.
 *
 * Untuk menambah/menghapus step, cukup ubah array {@link ONBOARDING_STEPS}
 * dan tambahkan komponen step yang sesuai di `OnboardingPage`.
 */

export type OnboardingStepId =
  | "info-perusahaan"
  | "periode-pembukuan"
  | "coa"
  | "gudang"
  | "saldo-awal"
  | "password-admin"
  | "modul-bisnis"
  | "selesai";

export type OnboardingStepMeta = {
  id: OnboardingStepId;
  /** Nomor urut yang ditampilkan ke user (1-based). */
  nomor: number;
  judul: string;
  /** Subjudul ringkas di stepper. */
  subjudul: string;
  /** Apakah langkah ini wajib (tidak bisa di-skip) untuk menyelesaikan wizard. */
  wajib: boolean;
};

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    id: "info-perusahaan",
    nomor: 1,
    judul: "Informasi perusahaan",
    subjudul: "Nama, alamat, kontak",
    wajib: true,
  },
  {
    id: "password-admin",
    nomor: 2,
    judul: "Akun admin Anda",
    subjudul: "Identitas & kata sandi",
    wajib: true,
  },
  {
    id: "modul-bisnis",
    nomor: 3,
    judul: "Modul bisnis",
    subjudul: "Aktifkan menu yang dipakai",
    wajib: true,
  },
  {
    id: "periode-pembukuan",
    nomor: 4,
    judul: "Periode pembukuan & PPN",
    subjudul: "Tanggal awal & tarif default",
    wajib: true,
  },
  {
    id: "coa",
    nomor: 5,
    judul: "Struktur akun (CoA)",
    subjudul: "Pilih template atau mulai kosong",
    wajib: true,
  },
  {
    id: "gudang",
    nomor: 6,
    judul: "Gudang default",
    subjudul: "Lokasi penyimpanan utama",
    wajib: false,
  },
  {
    id: "saldo-awal",
    nomor: 7,
    judul: "Saldo awal kas & stok",
    subjudul: "Opsional, dapat diisi nanti",
    wajib: false,
  },
  {
    id: "selesai",
    nomor: 8,
    judul: "Selesai",
    subjudul: "Konfirmasi & masuk aplikasi",
    wajib: true,
  },
];

export function findStepIndex(id: OnboardingStepId): number {
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}
