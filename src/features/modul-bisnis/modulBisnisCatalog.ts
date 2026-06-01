/**
 * Katalog modul bisnis aplikasi — sumber kebenaran untuk:
 *  - daftar modul yang user pilih saat onboarding (step "Modul Bisnis"),
 *  - mapping modul → entry navigasi sidebar yang ikut tersembunyi
 *    bila modul-nya dimatikan.
 *
 * Mengapa di-list manual (bukan di-derive dari `navigation.ts`)?
 * Karena hubungan modul ↔ entry sidebar bersifat *kurasi* — beberapa
 * modul punya banyak entry yang relevan (mis. Penjualan: faktur,
 * laporan ringkasan, piutang, aging piutang). Eksplisit di sini lebih
 * mudah dipahami daripada konvensi naming.
 *
 * Konsep `wajib` (core module):
 *  - Modul ber-flag `wajib: true` adalah inti aplikasi (Penjualan,
 *    Pembelian, Inventory). Mereka **selalu aktif**, tidak bisa
 *    di-uncheck oleh user, dan tetap masuk ke `Set` aktif walau
 *    storage rusak/dimanipulasi.
 *  - Hanya modul `wajib: false` yang merupakan toggle bebas user.
 *
 * Saat menambah modul baru:
 *  1. Tambah `ModulBisnisId` di union.
 *  2. Tambah entri di `MODUL_CATALOG` (ikon dari lucide-react).
 *  3. Set `wajib: false` (mayoritas modul baru pasti opsional —
 *     biarkan user yang memutuskan mereka butuh atau tidak).
 *  4. Daftarkan `navEntryIds` & `navSubItemIds` yang harus
 *     disembunyikan saat modul off.
 */
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Factory,
  ScanLine,
  ShoppingCart,
  Truck,
} from "lucide-react";

export type ModulBisnisId =
  | "penjualan"
  | "pembelian"
  | "inventory"
  | "pos"
  | "produksi";

export type ModulBisnisMeta = {
  id: ModulBisnisId;
  /** Label singkat di UI (judul card). */
  label: string;
  /** Penjelasan satu-dua kalimat untuk user awam. */
  deskripsi: string;
  icon: LucideIcon;
  /**
   * `true` = modul inti, selalu aktif & tidak bisa dimatikan user.
   * `false` = modul opsional, user bebas toggle on/off.
   */
  wajib: boolean;
  /**
   * Daftar id NavLink (entry level-1 di sidebar) yang harus
   * disembunyikan bila modul ini dimatikan. Untuk modul `wajib: true`
   * field ini boleh diisi tapi efeknya tidak akan terjadi karena modul
   * tidak pernah off.
   */
  navEntryIds: ReadonlyArray<string>;
  /**
   * Daftar id NavSubItem (child di group laporan/manajemen/keuangan)
   * yang harus disembunyikan bila modul ini dimatikan.
   */
  navSubItemIds: ReadonlyArray<string>;
};

export const MODUL_CATALOG: ReadonlyArray<ModulBisnisMeta> = [
  {
    id: "penjualan",
    label: "Penjualan",
    deskripsi:
      "Faktur penjualan, retur, dan piutang ke pelanggan. Modul inti yang dibutuhkan hampir semua usaha.",
    icon: ShoppingCart,
    wajib: true,
    navEntryIds: ["penjualan"],
    navSubItemIds: [
      "lap-penjualan-ringkasan",
      "ke-piutang",
      "ke-piutang-aging",
    ],
  },
  {
    id: "pembelian",
    label: "Pembelian",
    deskripsi:
      "Pesanan & faktur pembelian dari pemasok serta hutang dagang. Modul inti yang menjaga arus barang masuk.",
    icon: Truck,
    wajib: true,
    navEntryIds: ["pembelian"],
    navSubItemIds: [
      "lap-pembelian-ringkasan",
      "ke-hutang",
      "ke-hutang-aging",
    ],
  },
  {
    id: "inventory",
    label: "Inventory / Stok",
    deskripsi:
      "Manajemen barang & jasa, kategori, merek, dan pergerakan stok antar gudang. Modul inti untuk pencatatan barang.",
    icon: Boxes,
    wajib: true,
    navEntryIds: ["barang-jasa"],
    navSubItemIds: [
      "lap-stok",
      "lap-mutasi-gudang",
      "lap-hpp",
      "mj-kategori",
      "mj-merk",
      "mj-gudang",
    ],
  },
  {
    id: "pos",
    label: "POS (Kasir)",
    deskripsi:
      "Mode kasir untuk transaksi langsung di toko, dengan shift kasir dan rekap penjualan harian.",
    icon: ScanLine,
    wajib: false,
    navEntryIds: [],
    navSubItemIds: ["lap-log-shift-pos"],
  },
  {
    id: "produksi",
    label: "Produksi / Manufaktur",
    deskripsi:
      "Konversi bahan baku menjadi barang jadi dengan perhitungan biaya produksi. Aktifkan untuk usaha manufaktur ringan.",
    icon: Factory,
    wajib: false,
    navEntryIds: [],
    navSubItemIds: [],
  },
];

/** Modul inti — selalu aktif walau storage corrupt. */
export const MODUL_WAJIB_IDS: ReadonlySet<ModulBisnisId> = new Set(
  MODUL_CATALOG.filter((m) => m.wajib).map((m) => m.id),
);

/** Default: semua modul aktif — user kurangi saat onboarding bila perlu. */
export const DEFAULT_MODUL_AKTIF: ReadonlySet<ModulBisnisId> = new Set(
  MODUL_CATALOG.map((m) => m.id),
);

export function isModulId(value: string): value is ModulBisnisId {
  return MODUL_CATALOG.some((m) => m.id === value);
}

export function isModulWajib(id: ModulBisnisId): boolean {
  return MODUL_WAJIB_IDS.has(id);
}
