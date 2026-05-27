/** Satu baris saldo awal kas — pasangan akun & nilai. */
export type KasAwalEntryRow = {
  akunKode: string;
  akunNama: string;
  nilaiAwal: number;
};

/** Snapshot lengkap saldo awal kas + prasyarat (awal periode, historical balance). */
export type KasAwalSnapshot = {
  /** YYYY-MM-DD; null bila belum diset di pengaturan operasional. */
  awalPeriode: string | null;
  akunHistoricalBalanceKode: string | null;
  akunHistoricalBalanceNama: string | null;
  /** Entries dari jurnal kas awal aktif. Kosong bila belum pernah disetel. */
  entries: KasAwalEntryRow[];
  /** Tanggal jurnal yang tersimpan (bisa beda dari awalPeriode kalau setting
   *  diubah sesudah kas awal di-set). */
  tanggalJurnal: string | null;
  jurnalId: number | null;
};

export type KasAwalEntryInput = {
  akunKode: string;
  nilaiAwal: number;
};

export type KasAwalSetPayload = {
  entries: KasAwalEntryInput[];
};

export function isKasAwalSiap(snap: KasAwalSnapshot): boolean {
  return Boolean(snap.awalPeriode) && Boolean(snap.akunHistoricalBalanceKode);
}
