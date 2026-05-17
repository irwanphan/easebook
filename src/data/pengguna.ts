export type PenggunaRow = {
  username: string;
  namaLengkap: string;
  email: string;
  departemen: string;
  nomorHp: string;
  aktif: boolean;
  isAdmin: boolean;
  catatan: string;
};

export type PenggunaInsert = {
  username: string;
  namaLengkap: string;
  email: string;
  password: string;
  departemen: string;
  nomorHp: string;
  aktif: boolean;
  isAdmin: boolean;
  catatan: string;
  halamanAkses: string[];
};

export type PenggunaUpdate = {
  namaLengkap: string;
  email: string;
  password: string;
  departemen: string;
  nomorHp: string;
  aktif: boolean;
  isAdmin: boolean;
  catatan: string;
  halamanAkses: string[];
};

export type PenggunaSession = {
  username: string;
  namaLengkap: string;
  isAdmin: boolean;
  halamanAkses: string[];
  fotoProfilPath: string | null;
};
