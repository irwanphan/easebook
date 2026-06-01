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
 * Saat menambah modul baru:
 *  1. Tambah `ModulBisnisId` di union.
 *  2. Tambah entri di `MODUL_CATALOG` (ikon dari lucide-react).
 *  3. Daftarkan `navEntryIds` & `navSubItemIds` yang harus
 *     disembunyikan saat modul off.
 *  4. Pertimbangkan menambahkannya ke `DEFAULT_MODUL_AKTIF` jika
 *     modul tersebut "selalu on" (umumnya iya untuk modul baru).
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
   * Daftar id NavLink (entry level-1 di sidebar) yang harus
   * disembunyikan bila modul ini dimatikan.
   */
  navEntryIds: ReadonlyArray<string>;
  /**
   * Daftar id NavSubItem (child di group laporan/manajemen/keuangan)
   * yang harus disembunyikan bila modul ini dimatikan.
   */
  navSubItemIds: ReadonlyArray<string>;
};

export const MODUL_CATALOG: ReadonlyArray<ModulBisnisMeta> = [
  // {
  //   id: "penjualan",
  //   label: "Penjualan",
  //   deskripsi:
  //     "Faktur penjualan, retur, dan piutang ke pelanggan. Cocok untuk usaha yang menjual ke pelanggan B2B atau menerbitkan invoice.",
  //   icon: ShoppingCart,
  //   navEntryIds: ["penjualan"],
  //   navSubItemIds: [
  //     "lap-penjualan-ringkasan",
  //     "ke-piutang",
  //     "ke-piutang-aging",
  //   ],
  // },
  // {
  //   id: "pembelian",
  //   label: "Pembelian",
  //   deskripsi:
  //     "Pesanan & faktur pembelian dari pemasok serta hutang dagang. Aktifkan jika Anda stok ulang barang atau menerima invoice dari supplier.",
  //   icon: Truck,
  //   navEntryIds: ["pembelian"],
  //   navSubItemIds: [
  //     "lap-pembelian-ringkasan",
  //     "ke-hutang",
  //     "ke-hutang-aging",
  //   ],
  // },
  // {
  //   id: "inventory",
  //   label: "Inventory / Stok",
  //   deskripsi:
  //     "Manajemen barang & jasa, kategori, merek, dan pergerakan stok antar gudang. Sebagian besar usaha dagang membutuhkan ini.",
  //   icon: Boxes,
  //   navEntryIds: ["barang-jasa"],
  //   navSubItemIds: [
  //     "lap-stok",
  //     "lap-mutasi-gudang",
  //     "lap-hpp",
  //     "mj-kategori",
  //     "mj-merk",
  //     "mj-gudang",
  //   ],
  // },
  {
    id: "pos",
    label: "POS (Kasir)",
    deskripsi:
      "Mode kasir untuk transaksi langsung di toko, dengan shift kasir dan rekap penjualan harian.",
    icon: ScanLine,
    navEntryIds: [],
    navSubItemIds: ["lap-log-shift-pos"],
  },
  {
    id: "produksi",
    label: "Produksi / Manufaktur",
    deskripsi:
      "Konversi bahan baku menjadi barang jadi dengan perhitungan biaya produksi. Aktifkan untuk usaha manufaktur ringan.",
    icon: Factory,
    navEntryIds: [],
    navSubItemIds: [],
  },
];

/** Default: semua modul aktif — user kurangi saat onboarding bila perlu. */
export const DEFAULT_MODUL_AKTIF: ReadonlySet<ModulBisnisId> = new Set(
  MODUL_CATALOG.map((m) => m.id),
);

export function isModulId(value: string): value is ModulBisnisId {
  return MODUL_CATALOG.some((m) => m.id === value);
}
