import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { BarangJasaPage } from "@/pages/BarangJasaPage";
import { TambahBarangJasaPage } from "@/pages/TambahBarangJasaPage";
import { PenjualanPage } from "@/pages/PenjualanPage";
import { PembelianPage } from "@/pages/PembelianPage";
import { PengaturanPage } from "@/pages/PengaturanPage";
import { KategoriGrupPage } from "@/pages/manajemen/KategoriGrupPage";
import { MerekPage } from "@/pages/manajemen/MerekPage";
import { MasterLainnyaPage } from "@/pages/manajemen/MasterLainnyaPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "barang-jasa", element: <BarangJasaPage /> },
      { path: "barang-jasa/tambah", element: <TambahBarangJasaPage /> },
      { path: "penjualan", element: <PenjualanPage /> },
      { path: "pembelian", element: <PembelianPage /> },
      { path: "manajemen/kategori", element: <KategoriGrupPage /> },
      { path: "manajemen/merek", element: <MerekPage /> },
      { path: "manajemen/lainnya", element: <MasterLainnyaPage /> },
      { path: "pengaturan", element: <PengaturanPage /> },
    ],
  },
]);
