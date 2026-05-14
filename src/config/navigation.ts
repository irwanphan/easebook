import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Briefcase,
  Settings,
  LogOut,
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
    id: "manajemen",
    label: "Manajemen",
    icon: Briefcase,
    children: [
      { id: "mj-kategori", label: "Kategori / grup barang", path: "/manajemen/kategori" },
      { id: "mj-merk", label: "Merek", path: "/manajemen/merek" },
      { id: "mj-lain", label: "Master lainnya", path: "/manajemen/lainnya" },
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
