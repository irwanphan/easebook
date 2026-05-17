import { allHalamanAksesKeys } from "@/config/halamanAkses";
import type { PenggunaRow } from "@/data/pengguna";
import { defaultHalamanAksesForUser } from "@/lib/halamanAkses";
import {
  emptyPenggunaFotoState,
  type PenggunaFormValues,
} from "@/features/pengguna/PenggunaFields";

/** Form kosong untuk tambah pengguna baru. */
export function emptyPenggunaForm(): PenggunaFormValues {
  return {
    username: "",
    namaLengkap: "",
    email: "",
    password: "",
    passwordConfirm: "",
    departemen: "",
    nomorHp: "",
    aktif: true,
    isAdmin: false,
    catatan: "",
    halamanAkses: defaultHalamanAksesForUser(false),
    foto: emptyPenggunaFotoState(),
  };
}

/** Salin pengaturan akses & profil (bukan kredensial) dari pengguna sumber. */
export function duplicatePenggunaFormFromRow(
  row: PenggunaRow,
  halamanAkses: string[],
): PenggunaFormValues {
  const akses =
    row.isAdmin ? [...allHalamanAksesKeys] : halamanAkses.length > 0 ? halamanAkses : ["dashboard"];

  return {
    username: "",
    namaLengkap: "",
    email: "",
    password: "",
    passwordConfirm: "",
    departemen: row.departemen,
    nomorHp: "",
    aktif: row.aktif,
    isAdmin: row.isAdmin,
    catatan: "",
    halamanAkses: akses,
    foto: emptyPenggunaFotoState(),
  };
}
