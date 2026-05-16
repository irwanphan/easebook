import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { BarangJasaPage } from "@/pages/BarangJasaPage";
import { TambahBarangJasaPage } from "@/pages/TambahBarangJasaPage";
import { KartuStokBarangPage } from "@/pages/KartuStokBarangPage";
import { PenjualanPage } from "@/pages/PenjualanPage";
import { TambahPenjualanPage } from "@/pages/TambahPenjualanPage";
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
import { MasterLainnyaPage } from "@/pages/manajemen/MasterLainnyaPage";
import { PelangganPage } from "@/pages/manajemen/PelangganPage";
import { TambahPelangganPage } from "@/pages/manajemen/TambahPelangganPage";
import { UbahPelangganPage } from "@/pages/manajemen/UbahPelangganPage";
import { PemasokPage } from "@/pages/manajemen/PemasokPage";
import { TambahPemasokPage } from "@/pages/manajemen/TambahPemasokPage";
import { UbahPemasokPage } from "@/pages/manajemen/UbahPemasokPage";
import { KeuanganPengeluaranPage } from "@/pages/keuangan/KeuanganPengeluaranPage";
import { KeuanganPenerimaanPage } from "@/pages/keuangan/KeuanganPenerimaanPage";
import { KeuanganPelunasanPiutangPage } from "@/pages/keuangan/KeuanganPelunasanPiutangPage";
import { KeuanganPelunasanHutangPage } from "@/pages/keuangan/KeuanganPelunasanHutangPage";
import { KeuanganTransferPage } from "@/pages/keuangan/KeuanganTransferPage";
import { DaftarAkunPage } from "@/pages/keuangan/DaftarAkunPage";
import { JurnalUmumPage } from "@/pages/keuangan/JurnalUmumPage";
import { KonfigurasiAkunJurnalPage } from "@/pages/keuangan/KonfigurasiAkunJurnalPage";
import { LaporanPergerakanStokPage } from "@/pages/laporan/LaporanPergerakanStokPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "barang-jasa/tambah", element: <TambahBarangJasaPage /> },
      { path: "barang-jasa/kartu-stok/:kode", element: <KartuStokBarangPage /> },
      { path: "barang-jasa", element: <BarangJasaPage /> },
      { path: "laporan/pergerakan-stok", element: <LaporanPergerakanStokPage /> },
      { path: "penjualan/tambah", element: <TambahPenjualanPage /> },
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
      { path: "manajemen/lainnya", element: <MasterLainnyaPage /> },
      { path: "keuangan/pengeluaran", element: <KeuanganPengeluaranPage /> },
      { path: "keuangan/penerimaan", element: <KeuanganPenerimaanPage /> },
      { path: "keuangan/pelunasan-piutang", element: <KeuanganPelunasanPiutangPage /> },
      { path: "keuangan/pelunasan-hutang", element: <KeuanganPelunasanHutangPage /> },
      { path: "keuangan/transfer", element: <KeuanganTransferPage /> },
      { path: "keuangan/daftar-akun", element: <DaftarAkunPage /> },
      { path: "keuangan/akun-kas", element: <DaftarAkunPage /> },
      { path: "keuangan/konfigurasi-akun-jurnal", element: <KonfigurasiAkunJurnalPage /> },
      { path: "keuangan/jurnal-umum", element: <JurnalUmumPage /> },
      { path: "pengaturan", element: <PengaturanPage /> },
    ],
  },
]);
