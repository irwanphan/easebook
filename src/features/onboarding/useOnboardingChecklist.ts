/**
 * Hook yang menghitung status setiap langkah wizard onboarding dari
 * sumber kebenaran yang sudah ada di sistem.
 *
 * Setiap langkah punya satu sumber kebenaran:
 *  - `info-perusahaan`   → localStorage `easybook-informasi-perusahaan` (nama wajib).
 *  - `periode-pembukuan` → `operasional_konfigurasi_get.awalPeriode` + localStorage PPN.
 *  - `coa`               → `akun_keuangan_list`. Step dianggap done baik
 *                          jika sudah ada akun (user memilih opsi
 *                          "Standar") maupun jika user eksplisit memilih
 *                          "Mulai dari nol" (jejak ada di localStorage
 *                          `easybook-onboarding-coa-pilihan`).
 *  - `gudang`            → `gudang_list` (minimal 1 entri).
 *  - `password-admin`    → `pengguna_verifikasi_kata_sandi("admin", "admin123")`
 *                          → kalau berhasil = masih default → step belum done.
 *  - `modul-bisnis`      → localStorage `easybook-modul-aktif` (default semua aktif).
 *
 * Hook ini cukup di-call sekali per render wizard; setiap step yang baru
 * disimpan akan memanggil `refresh()` agar checklist re-evaluasi.
 *
 * Catatan: saldo awal kas & stok **bukan bagian wizard** — diatur dari
 * menu Pengaturan setelah user menambah daftar produk pasca-login.
 */
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { operasionalKonfigurasiGet } from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { loadInformasiPerusahaan } from "@/features/pengaturan/informasiPerusahaanStorage";
import { loadPengaturanTransaksi } from "@/features/pengaturan/pengaturanTransaksiStorage";
import { loadCoAPilihan } from "@/features/onboarding/coaPilihanStorage";
import { loadModulAktif } from "@/features/modul-bisnis/modulBisnisStorage";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { GudangRow } from "@/data/gudang";
import type { OnboardingStepId } from "@/features/onboarding/onboardingSteps";

export type OnboardingChecklist = Record<OnboardingStepId, boolean>;

const DEFAULT_CHECKLIST: OnboardingChecklist = {
  "info-perusahaan": false,
  "periode-pembukuan": false,
  coa: false,
  gudang: false,
  "password-admin": false,
  // Default true: storage default = semua modul aktif, jadi "siap"
  // kecuali user secara eksplisit mengosongkan & belum submit.
  "modul-bisnis": true,
  // Step closing — selalu false di checklist; "centang"-nya terjadi
  // implisit saat user menekan Selesai (yang langsung navigate ke "/").
  selesai: false,
};

/**
 * Cek apakah password admin masih default. Kita tidak bisa decode bcrypt,
 * jadi caranya: panggil `pengguna_verifikasi_kata_sandi("admin","admin123")`.
 * Jika tidak melempar error → password masih default. Jika melempar →
 * password sudah diganti (atau user `admin` dihapus, yang juga berarti
 * tidak relevan lagi).
 */
async function isAdminPasswordMasihDefault(): Promise<boolean> {
  try {
    await invoke("pengguna_verifikasi_kata_sandi", {
      username: "admin",
      password: "admin123",
    });
    return true;
  } catch {
    return false;
  }
}

export function useOnboardingChecklist() {
  const [checklist, setChecklist] = useState<OnboardingChecklist>(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    const info = loadInformasiPerusahaan();
    const transaksi = loadPengaturanTransaksi();
    const coaPilihan = loadCoAPilihan();
    const modulAktif = loadModulAktif();

    const [opCfg, akunList, gudangList, adminDefault] = await Promise.all([
      operasionalKonfigurasiGet().catch(() => ({ awalPeriode: null })),
      invoke<AkunKeuanganRow[]>("akun_keuangan_list").catch(() => [] as AkunKeuanganRow[]),
      invoke<GudangRow[]>("gudang_list").catch(() => [] as GudangRow[]),
      isAdminPasswordMasihDefault(),
    ]);

    const periodeSiap = Boolean(opCfg.awalPeriode) && Number.isFinite(transaksi.ppnPersen);
    // CoA done bila: ada akun di DB (user pakai standar) ATAU user
    // eksplisit memilih "kosong" via wizard.
    const coaSiap = akunList.length > 0 || coaPilihan === "kosong";

    setChecklist({
      "info-perusahaan": info.namaPerusahaan.trim().length > 0,
      "periode-pembukuan": periodeSiap,
      coa: coaSiap,
      gudang: gudangList.length > 0,
      "password-admin": !adminDefault,
      "modul-bisnis": modulAktif.size > 0,
      selesai: false,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { checklist, loading, refresh };
}
