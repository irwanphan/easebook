import { createHashRouter, Outlet } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { POSShell } from "@/app/layout/POSShell";
import { AuthProvider } from "@/features/auth/AuthContext";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { POSPage } from "@/pages/pos/POSPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { BarangJasaPage } from "@/pages/BarangJasaPage";
import { TambahBarangJasaPage } from "@/pages/TambahBarangJasaPage";
import { UbahBarangJasaPage } from "@/pages/UbahBarangJasaPage";
import { KartuStokBarangPage } from "@/pages/KartuStokBarangPage";
import { BarangStokPerGudangPage } from "@/pages/BarangStokPerGudangPage";
import { MutasiAntarGudangPage } from "@/pages/MutasiAntarGudangPage";
import { KoreksiStokPage } from "@/pages/KoreksiStokPage";
import { ProduksiPage } from "@/pages/ProduksiPage";
import { TambahProduksiPage } from "@/pages/TambahProduksiPage";
import { UbahProduksiPage } from "@/pages/UbahProduksiPage";
import { ProduksiDetailPage } from "@/pages/ProduksiDetailPage";
import { PenjualanPage } from "@/pages/PenjualanPage";
import { TambahPenjualanPage } from "@/pages/TambahPenjualanPage";
import { PenjualanDetailPage } from "@/pages/PenjualanDetailPage";
import { UbahPenjualanPage } from "@/pages/UbahPenjualanPage";
import { PesananPenjualanPage } from "@/pages/PesananPenjualanPage";
import { TambahPesananPenjualanPage } from "@/pages/TambahPesananPenjualanPage";
import { UbahPesananPenjualanPage } from "@/pages/UbahPesananPenjualanPage";
import { PesananPenjualanDetailPage } from "@/pages/PesananPenjualanDetailPage";
import { PembelianPage } from "@/pages/PembelianPage";
import { PembelianDetailPage } from "@/pages/PembelianDetailPage";
import { TambahPembelianPage } from "@/pages/TambahPembelianPage";
import { UbahPembelianPage } from "@/pages/UbahPembelianPage";
import { PesananPembelianPage } from "@/pages/PesananPembelianPage";
import { TambahPesananPembelianPage } from "@/pages/TambahPesananPembelianPage";
import { UbahPesananPembelianPage } from "@/pages/UbahPesananPembelianPage";
import { PesananPembelianDetailPage } from "@/pages/PesananPembelianDetailPage";
import { PengaturanPage } from "@/pages/PengaturanPage";
import { KategoriGrupPage } from "@/pages/manajemen/KategoriGrupPage";
import { TambahKategoriGrupPage } from "@/pages/manajemen/TambahKategoriGrupPage";
import { UbahKategoriGrupPage } from "@/pages/manajemen/UbahKategoriGrupPage";
import { MerekPage } from "@/pages/manajemen/MerekPage";
import { TambahMerekPage } from "@/pages/manajemen/TambahMerekPage";
import { UbahMerekPage } from "@/pages/manajemen/UbahMerekPage";
import { GudangPage } from "@/pages/manajemen/GudangPage";
import { TambahGudangPage } from "@/pages/manajemen/TambahGudangPage";
import { UbahGudangPage } from "@/pages/manajemen/UbahGudangPage";
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
import { PengeluaranDetailPage } from "@/pages/keuangan/PengeluaranDetailPage";
import { KeuanganPenerimaanPage } from "@/pages/keuangan/KeuanganPenerimaanPage";
import { TambahPenerimaanPage } from "@/pages/keuangan/TambahPenerimaanPage";
import { PenerimaanDetailPage } from "@/pages/keuangan/PenerimaanDetailPage";
import { KeuanganPelunasanPiutangPage } from "@/pages/keuangan/KeuanganPelunasanPiutangPage";
import { BuatPelunasanPiutangPage } from "@/pages/keuangan/BuatPelunasanPiutangPage";
import { DaftarPelunasanPiutangPage } from "@/pages/keuangan/DaftarPelunasanPiutangPage";
import { PelunasanPiutangDetailPage } from "@/pages/keuangan/PelunasanPiutangDetailPage";
import { KeuanganPelunasanHutangPage } from "@/pages/keuangan/KeuanganPelunasanHutangPage";
import { BuatPelunasanHutangPage } from "@/pages/keuangan/BuatPelunasanHutangPage";
import { DaftarPelunasanHutangPage } from "@/pages/keuangan/DaftarPelunasanHutangPage";
import { PelunasanHutangDetailPage } from "@/pages/keuangan/PelunasanHutangDetailPage";
import { KeuanganTransferPage } from "@/pages/keuangan/KeuanganTransferPage";
import { TransferKasDetailPage } from "@/pages/keuangan/TransferKasDetailPage";
import { UbahTransferKasPage } from "@/pages/keuangan/UbahTransferKasPage";
import { DaftarAkunPage } from "@/pages/keuangan/DaftarAkunPage";
import { JurnalUmumPage } from "@/pages/keuangan/JurnalUmumPage";
import { KonfigurasiAkunJurnalPage } from "@/pages/keuangan/KonfigurasiAkunJurnalPage";
import { LaporanPergerakanStokPage } from "@/pages/laporan/LaporanPergerakanStokPage";
import { LaporanMutasiAntarGudangPage } from "@/pages/laporan/LaporanMutasiAntarGudangPage";
import { LaporanHppPage } from "@/pages/laporan/LaporanHppPage";
import { LaporanHppDetailPage } from "@/pages/laporan/LaporanHppDetailPage";
import { LaporanLogShiftPosPage } from "@/pages/laporan/LaporanLogShiftPosPage";
import { ProfilPenggunaPage } from "@/pages/ProfilPenggunaPage";
import { PengaturanAksesCepatPage } from "@/pages/PengaturanAksesCepatPage";

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const mainRouter = createHashRouter([
  {
    element: <AuthLayout />,
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
      { path: "profil/akses-cepat", element: <PengaturanAksesCepatPage /> },
      { path: "barang-jasa/tambah", element: <TambahBarangJasaPage /> },
      { path: "barang-jasa/ubah/:kode", element: <UbahBarangJasaPage /> },
      { path: "barang-jasa/kartu-stok/:kode", element: <KartuStokBarangPage /> },
      { path: "barang-jasa/per-gudang", element: <BarangStokPerGudangPage /> },
      { path: "barang-jasa/mutasi-antar-gudang", element: <MutasiAntarGudangPage /> },
      { path: "barang-jasa/koreksi-stok", element: <KoreksiStokPage /> },
      { path: "barang-jasa/produksi/tambah", element: <TambahProduksiPage /> },
      { path: "barang-jasa/produksi/ubah/:nomor", element: <UbahProduksiPage /> },
      { path: "barang-jasa/produksi/detail/:nomor", element: <ProduksiDetailPage /> },
      { path: "barang-jasa/produksi", element: <ProduksiPage /> },
      { path: "barang-jasa", element: <BarangJasaPage /> },
      { path: "laporan/pergerakan-stok", element: <LaporanPergerakanStokPage /> },
      { path: "laporan/mutasi-antar-gudang", element: <LaporanMutasiAntarGudangPage /> },
      { path: "laporan/hpp", element: <LaporanHppPage /> },
      { path: "laporan/hpp/:kode", element: <LaporanHppDetailPage /> },
      { path: "laporan/log-shift-pos", element: <LaporanLogShiftPosPage /> },
      { path: "penjualan/tambah", element: <TambahPenjualanPage /> },
      { path: "penjualan/detail/:nomor", element: <PenjualanDetailPage /> },
      { path: "penjualan/ubah/:nomor", element: <UbahPenjualanPage /> },
      { path: "penjualan/pesanan/tambah", element: <TambahPesananPenjualanPage /> },
      { path: "penjualan/pesanan/ubah/:nomor", element: <UbahPesananPenjualanPage /> },
      { path: "penjualan/pesanan/detail/:nomor", element: <PesananPenjualanDetailPage /> },
      { path: "penjualan/pesanan", element: <PesananPenjualanPage /> },
      { path: "penjualan", element: <PenjualanPage /> },
      { path: "pembelian/tambah", element: <TambahPembelianPage /> },
      { path: "pembelian/detail/:nomor", element: <PembelianDetailPage /> },
      { path: "pembelian/ubah/:nomor", element: <UbahPembelianPage /> },
      { path: "pembelian/pesanan/tambah", element: <TambahPesananPembelianPage /> },
      { path: "pembelian/pesanan/ubah/:nomor", element: <UbahPesananPembelianPage /> },
      { path: "pembelian/pesanan/detail/:nomor", element: <PesananPembelianDetailPage /> },
      { path: "pembelian/pesanan", element: <PesananPembelianPage /> },
      { path: "pembelian", element: <PembelianPage /> },
      { path: "manajemen/kategori", element: <KategoriGrupPage /> },
      { path: "manajemen/kategori/tambah", element: <TambahKategoriGrupPage /> },
      { path: "manajemen/kategori/ubah/:kode", element: <UbahKategoriGrupPage /> },
      { path: "manajemen/merek", element: <MerekPage /> },
      { path: "manajemen/merek/tambah", element: <TambahMerekPage /> },
      { path: "manajemen/merek/ubah/:kode", element: <UbahMerekPage /> },
      { path: "manajemen/gudang", element: <GudangPage /> },
      { path: "manajemen/gudang/tambah", element: <TambahGudangPage /> },
      { path: "manajemen/gudang/ubah/:kode", element: <UbahGudangPage /> },
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
      { path: "keuangan/pengeluaran/detail/:nomor", element: <PengeluaranDetailPage /> },
      { path: "keuangan/penerimaan", element: <KeuanganPenerimaanPage /> },
      { path: "keuangan/penerimaan/tambah", element: <TambahPenerimaanPage /> },
      { path: "keuangan/penerimaan/detail/:nomor", element: <PenerimaanDetailPage /> },
      { path: "keuangan/pelunasan-piutang", element: <KeuanganPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-piutang/daftar", element: <DaftarPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-piutang/daftar/:nomor", element: <PelunasanPiutangDetailPage /> },
      { path: "keuangan/pelunasan-piutang/buat", element: <BuatPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-hutang", element: <KeuanganPelunasanHutangPage /> },
      { path: "keuangan/pelunasan-hutang/daftar", element: <DaftarPelunasanHutangPage /> },
      { path: "keuangan/pelunasan-hutang/daftar/:nomor", element: <PelunasanHutangDetailPage /> },
      { path: "keuangan/pelunasan-hutang/buat", element: <BuatPelunasanHutangPage /> },
      { path: "keuangan/transfer/detail/:nomor", element: <TransferKasDetailPage /> },
      { path: "keuangan/transfer/ubah/:nomor", element: <UbahTransferKasPage /> },
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
]);

/**
 * Router khusus window POS. Tidak memuat AppShell utama (sidebar) — hanya
 * shell minimal supaya kasir punya layar penuh. Tetap melewati AuthLayout +
 * RequireAuth supaya kasir wajib login (session di-share via SQLite).
 */
export const posRouter = createHashRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/",
            element: <POSShell />,
            children: [
              { index: true, element: <POSPage /> },
              { path: "pos", element: <POSPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

/** Backward-compat: beberapa file mungkin masih import { router }. */
export const router = mainRouter;
