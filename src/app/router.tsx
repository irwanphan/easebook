import { createHashRouter, Outlet } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AuthProvider } from "@/features/auth/AuthContext";
import { RequireActivation } from "@/features/activation/RequireActivation";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AktivasiPage } from "@/pages/AktivasiPage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { BarangJasaPage } from "@/pages/BarangJasaPage";
import { TambahBarangJasaPage } from "@/pages/TambahBarangJasaPage";
import { UbahBarangJasaPage } from "@/pages/UbahBarangJasaPage";
import { KartuStokBarangPage } from "@/pages/KartuStokBarangPage";
import { BarangStokPerGudangPage } from "@/pages/BarangStokPerGudangPage";
import { MutasiAntarGudangPage } from "@/pages/MutasiAntarGudangPage";
import { PenjualanPage } from "@/pages/PenjualanPage";
import { TambahPenjualanPage } from "@/pages/TambahPenjualanPage";
import { PenjualanDetailPage } from "@/pages/PenjualanDetailPage";
import { UbahPenjualanPage } from "@/pages/UbahPenjualanPage";
import { PembelianPage } from "@/pages/PembelianPage";
import { PembelianDetailPage } from "@/pages/PembelianDetailPage";
import { TambahPembelianPage } from "@/pages/TambahPembelianPage";
import { UbahPembelianPage } from "@/pages/UbahPembelianPage";
import { PengaturanPage } from "@/pages/PengaturanPage";
import { KategoriGrupPage } from "@/pages/manajemen/KategoriGrupPage";
import { TambahKategoriGrupPage } from "@/pages/manajemen/TambahKategoriGrupPage";
import { MerekPage } from "@/pages/manajemen/MerekPage";
import { TambahMerekPage } from "@/pages/manajemen/TambahMerekPage";
import { GudangPage } from "@/pages/manajemen/GudangPage";
import { TambahGudangPage } from "@/pages/manajemen/TambahGudangPage";
import { PenggunaPage } from "@/pages/manajemen/PenggunaPage";
import { TambahPenggunaPage } from "@/pages/manajemen/TambahPenggunaPage";
import { UbahPenggunaPage } from "@/pages/manajemen/UbahPenggunaPage";
import { PelangganPage } from "@/pages/manajemen/PelangganPage";
import { TambahPelangganPage } from "@/pages/manajemen/TambahPelangganPage";
import { UbahPelangganPage } from "@/pages/manajemen/UbahPelangganPage";
import { PemasokPage } from "@/pages/manajemen/PemasokPage";
import { TambahPemasokPage } from "@/pages/manajemen/TambahPemasokPage";
import { UbahPemasokPage } from "@/pages/manajemen/UbahPemasokPage";
import { KeuanganPengeluaranPage } from "@/pages/keuangan/KeuanganPengeluaranPage";
import { TambahPengeluaranPage } from "@/pages/keuangan/TambahPengeluaranPage";
import { KeuanganPenerimaanPage } from "@/pages/keuangan/KeuanganPenerimaanPage";
import { TambahPenerimaanPage } from "@/pages/keuangan/TambahPenerimaanPage";
import { KeuanganPelunasanPiutangPage } from "@/pages/keuangan/KeuanganPelunasanPiutangPage";
import { BuatPelunasanPiutangPage } from "@/pages/keuangan/BuatPelunasanPiutangPage";
import { DaftarPelunasanPiutangPage } from "@/pages/keuangan/DaftarPelunasanPiutangPage";
import { PelunasanPiutangDetailPage } from "@/pages/keuangan/PelunasanPiutangDetailPage";
import { KeuanganPelunasanHutangPage } from "@/pages/keuangan/KeuanganPelunasanHutangPage";
import { BuatPelunasanHutangPage } from "@/pages/keuangan/BuatPelunasanHutangPage";
import { DaftarPelunasanHutangPage } from "@/pages/keuangan/DaftarPelunasanHutangPage";
import { PelunasanHutangDetailPage } from "@/pages/keuangan/PelunasanHutangDetailPage";
import { KeuanganTransferPage } from "@/pages/keuangan/KeuanganTransferPage";
import { DaftarAkunPage } from "@/pages/keuangan/DaftarAkunPage";
import { JurnalUmumPage } from "@/pages/keuangan/JurnalUmumPage";
import { KonfigurasiAkunJurnalPage } from "@/pages/keuangan/KonfigurasiAkunJurnalPage";
import { LaporanPergerakanStokPage } from "@/pages/laporan/LaporanPergerakanStokPage";
import { LaporanMutasiAntarGudangPage } from "@/pages/laporan/LaporanMutasiAntarGudangPage";
import { ProfilPenggunaPage } from "@/pages/ProfilPenggunaPage";

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createHashRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "aktivasi", element: <AktivasiPage /> },
      {
        element: <RequireActivation />,
        children: [
          { path: "login", element: <LoginPage /> },
          {
            element: <RequireAuth />,
        children: [
          {
            path: "/",
            element: <AppShell />,
            children: [
      { index: true, element: <DashboardPage /> },
      { path: "profil", element: <ProfilPenggunaPage /> },
      { path: "barang-jasa/tambah", element: <TambahBarangJasaPage /> },
      { path: "barang-jasa/ubah/:kode", element: <UbahBarangJasaPage /> },
      { path: "barang-jasa/kartu-stok/:kode", element: <KartuStokBarangPage /> },
      { path: "barang-jasa/per-gudang", element: <BarangStokPerGudangPage /> },
      { path: "barang-jasa/mutasi-antar-gudang", element: <MutasiAntarGudangPage /> },
      { path: "barang-jasa", element: <BarangJasaPage /> },
      { path: "laporan/pergerakan-stok", element: <LaporanPergerakanStokPage /> },
      { path: "laporan/mutasi-antar-gudang", element: <LaporanMutasiAntarGudangPage /> },
      { path: "penjualan/tambah", element: <TambahPenjualanPage /> },
      { path: "penjualan/detail/:nomor", element: <PenjualanDetailPage /> },
      { path: "penjualan/ubah/:nomor", element: <UbahPenjualanPage /> },
      { path: "penjualan", element: <PenjualanPage /> },
      { path: "pembelian/tambah", element: <TambahPembelianPage /> },
      { path: "pembelian/detail/:nomor", element: <PembelianDetailPage /> },
      { path: "pembelian/ubah/:nomor", element: <UbahPembelianPage /> },
      { path: "pembelian", element: <PembelianPage /> },
      { path: "manajemen/kategori", element: <KategoriGrupPage /> },
      { path: "manajemen/kategori/tambah", element: <TambahKategoriGrupPage /> },
      { path: "manajemen/merek", element: <MerekPage /> },
      { path: "manajemen/merek/tambah", element: <TambahMerekPage /> },
      { path: "manajemen/gudang", element: <GudangPage /> },
      { path: "manajemen/gudang/tambah", element: <TambahGudangPage /> },
      { path: "manajemen/pelanggan/tambah", element: <TambahPelangganPage /> },
      { path: "manajemen/pelanggan/ubah/:kode", element: <UbahPelangganPage /> },
      { path: "manajemen/pelanggan", element: <PelangganPage /> },
      { path: "manajemen/pemasok/tambah", element: <TambahPemasokPage /> },
      { path: "manajemen/pemasok/ubah/:kode", element: <UbahPemasokPage /> },
      { path: "manajemen/pemasok", element: <PemasokPage /> },
      { path: "manajemen/pengguna/tambah", element: <TambahPenggunaPage /> },
      { path: "manajemen/pengguna/ubah/:username", element: <UbahPenggunaPage /> },
      { path: "manajemen/pengguna", element: <PenggunaPage /> },
      { path: "keuangan/pengeluaran", element: <KeuanganPengeluaranPage /> },
      { path: "keuangan/pengeluaran/tambah", element: <TambahPengeluaranPage /> },
      { path: "keuangan/penerimaan", element: <KeuanganPenerimaanPage /> },
      { path: "keuangan/penerimaan/tambah", element: <TambahPenerimaanPage /> },
      { path: "keuangan/pelunasan-piutang", element: <KeuanganPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-piutang/daftar", element: <DaftarPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-piutang/daftar/:nomor", element: <PelunasanPiutangDetailPage /> },
      { path: "keuangan/pelunasan-piutang/buat", element: <BuatPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-hutang", element: <KeuanganPelunasanHutangPage /> },
      { path: "keuangan/pelunasan-hutang/daftar", element: <DaftarPelunasanHutangPage /> },
      { path: "keuangan/pelunasan-hutang/daftar/:nomor", element: <PelunasanHutangDetailPage /> },
      { path: "keuangan/pelunasan-hutang/buat", element: <BuatPelunasanHutangPage /> },
      { path: "keuangan/transfer", element: <KeuanganTransferPage /> },
      { path: "keuangan/daftar-akun", element: <DaftarAkunPage /> },
      { path: "keuangan/akun-kas", element: <DaftarAkunPage /> },
      { path: "keuangan/konfigurasi-akun-jurnal", element: <KonfigurasiAkunJurnalPage /> },
      { path: "keuangan/jurnal-umum", element: <JurnalUmumPage /> },
      { path: "pengaturan", element: <PengaturanPage /> },
            ],
          },
        ],
          },
        ],
      },
    ],
  },
]);
