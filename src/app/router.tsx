import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { BarangJasaPage } from "@/pages/BarangJasaPage";
import { PenjualanPage } from "@/pages/PenjualanPage";
import { PembelianPage } from "@/pages/PembelianPage";
import { PengaturanPage } from "@/pages/PengaturanPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "barang-jasa", element: <BarangJasaPage /> },
      { path: "penjualan", element: <PenjualanPage /> },
      { path: "pembelian", element: <PembelianPage /> },
      { path: "pengaturan", element: <PengaturanPage /> },
    ],
  },
]);
