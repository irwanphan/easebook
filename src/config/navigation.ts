import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Briefcase,
  Wallet,
  Settings,
  LogOut,
  LineChart,
} from "lucide-react";

/** Item tautan tunggal (sidebar + logout). */
export type NavLinkEntry = {
  kind: "link";
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

/** Submenu di bawah grup (tanpa ikon per baris — cukup teks). */
export type NavSubItem = {
  id: string;
  label: string;
  path: string;
};

/** Grup expandable (mis. Manajemen master data). */
export type NavGroupEntry = {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavSubItem[];
};

export type PrimaryNavEntry = NavLinkEntry | NavGroupEntry;

/**
 * Menu utama sidebar.
 * Pengaturan: item `kind: "link"` dengan path `/pengaturan`
 * (halaman `src/pages/PengaturanPage.tsx`, rute `src/app/router.tsx`).
 */
export const primaryNavEntries: PrimaryNavEntry[] = [
  { kind: "link", id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { kind: "link", id: "barang-jasa", label: "Barang & jasa", path: "/barang-jasa", icon: Package },
  { kind: "link", id: "penjualan", label: "Penjualan", path: "/penjualan", icon: ShoppingCart },
  { kind: "link", id: "pembelian", label: "Pembelian", path: "/pembelian", icon: Truck },
  {
    kind: "group",
    id: "laporan",
    label: "Laporan",
    icon: LineChart,
    children: [
      { id: "lap-stok", label: "Pergerakan stok", path: "/laporan/pergerakan-stok" },
      { id: "lap-mutasi-gudang", label: "Mutasi antar gudang", path: "/laporan/mutasi-antar-gudang" },
      { id: "lap-hpp", label: "HPP", path: "/laporan/hpp" },
      { id: "lap-laba-rugi", label: "Laba rugi", path: "/laporan/laba-rugi" },
      { id: "lap-log-shift-pos", label: "Log shift POS", path: "/laporan/log-shift-pos" },
    ],
  },
  {
    kind: "group",
    id: "manajemen",
    label: "Manajemen",
    icon: Briefcase,
    children: [
      { id: "mj-kategori", label: "Kategori / grup barang", path: "/manajemen/kategori" },
      { id: "mj-merk", label: "Merek", path: "/manajemen/merek" },
      { id: "mj-gudang", label: "Gudang", path: "/manajemen/gudang" },
      { id: "mj-pelanggan", label: "Pelanggan", path: "/manajemen/pelanggan" },
      { id: "mj-pemasok", label: "Pemasok", path: "/manajemen/pemasok" },
      { id: "mj-pengguna", label: "Pengguna", path: "/manajemen/pengguna" },
    ],
  },
  {
    kind: "group",
    id: "keuangan",
    label: "Keuangan",
    icon: Wallet,
    children: [
      { id: "ke-pengeluaran", label: "Pengeluaran", path: "/keuangan/pengeluaran" },
      { id: "ke-penerimaan", label: "Penerimaan", path: "/keuangan/penerimaan" },
      { id: "ke-piutang", label: "Pelunasan piutang", path: "/keuangan/pelunasan-piutang" },
      { id: "ke-hutang", label: "Pelunasan hutang", path: "/keuangan/pelunasan-hutang" },
      { id: "ke-transfer", label: "Transfer", path: "/keuangan/transfer" },
      { id: "ke-akun-kas", label: "Akun kas", path: "/keuangan/akun-kas" },
      { id: "ke-daftar-akun", label: "Daftar akun", path: "/keuangan/daftar-akun" },
      { id: "ke-jurnal-umum", label: "Jurnal umum", path: "/keuangan/jurnal-umum" },
      { id: "ke-buku-besar", label: "Buku besar", path: "/keuangan/buku-besar" },
    ],
  },
  { kind: "link", id: "pengaturan", label: "Pengaturan", path: "/pengaturan", icon: Settings },
];

export const logoutNavItem: NavLinkEntry = {
  kind: "link",
  id: "keluar",
  label: "Keluar",
  path: "#keluar",
  icon: LogOut,
};
