export type GudangRow = {
  kode: string;
  nama: string;
  alamat: string;
  /** Koordinat peta, disarankan: `latitude, longitude` (contoh: -6.9175, 107.6191). */
  lokasi: string;
  pic: string;
  nomorKontak: string;
  luasM2: number;
  /** Kapasitas penyimpanan (teks bebas: palet, m³, tonase, dll.). */
  kapasitasPenyimpanan: string;
};

export const mockGudang: GudangRow[] = [
  {
    kode: "GD-001",
    nama: "Gudang Pusat Bandung",
    alamat: "Jl. Soekarno-Hatta No. 12, Kiaracondong, Kota Bandung",
    lokasi: "-6.9175, 107.6191",
    pic: "Budi Santoso",
    nomorKontak: "+62 812-3456-7890",
    luasM2: 2500,
    kapasitasPenyimpanan: "1200 palet",
  },
  {
    kode: "GD-002",
    nama: "DC Jakarta Timur",
    alamat: "Kawasan industri MM2100, Cibitung",
    lokasi: "-6.2480, 107.0856",
    pic: "Rina Wijaya",
    nomorKontak: "021-5550123",
    luasM2: 4800,
    kapasitasPenyimpanan: "8500 m³ estimasi",
  },
];
