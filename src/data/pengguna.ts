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
};
