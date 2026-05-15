/** Baris master pelanggan / pemasok (selaras dengan `KontakMasterRow` di Rust). */
export type KontakMasterRow = {
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telepon: string;
  email: string;
  npwp: string;
  catatan: string;
};

export function emptyKontakMasterRow(): KontakMasterRow {
  return {
    kode: "",
    nama: "",
    alamat: "",
    kota: "",
    telepon: "",
    email: "",
    npwp: "",
    catatan: "",
  };
}
