import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

export const primaryNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { id: "barang-jasa", label: "Barang & jasa", path: "/barang-jasa", icon: Package },
  { id: "penjualan", label: "Penjualan", path: "/penjualan", icon: ShoppingCart },
  { id: "pembelian", label: "Pembelian", path: "/pembelian", icon: Truck },
  { id: "pengaturan", label: "Pengaturan", path: "/pengaturan", icon: Settings },
];

export const logoutNavItem: NavItem = {
  id: "keluar",
  label: "Keluar",
  path: "#keluar",
  icon: LogOut,
};
