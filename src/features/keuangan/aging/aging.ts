/**
 * Pure helpers untuk laporan aging (piutang & hutang). Tidak menyentuh
 * Tauri / DOM supaya gampang ditest dan dipakai ulang.
 *
 * Konvensi bucket (industry standard untuk SME Indonesia):
 *   - Belum jatuh tempo (hari ≤ 0 dari basis "jatuh_tempo"; atau "baru" untuk basis "tanggal_faktur")
 *   - 1–30 hari
 *   - 31–60 hari
 *   - 61–90 hari
 *   - > 90 hari
 *
 * Basis perhitungan:
 *   - `jatuh_tempo`     → hari lewat dari tanggal jatuh tempo (rekomendasi default)
 *   - `tanggal_faktur`  → umur piutang dari tanggal faktur terbit
 */

export type AgingBucketKey =
  | "BELUM"
  | "B1_30"
  | "B31_60"
  | "B61_90"
  | "B90_PLUS";

export type AgingBasis = "jatuh_tempo" | "tanggal_faktur";

export type AgingBucketDef = {
  key: AgingBucketKey;
  /** Label panjang untuk header tabel & summary card. */
  label: string;
  /** Singkatan untuk header kolom tabel (mis. "1–30"). */
  short: string;
  /** Warna aksen untuk badge/heading (key tone yang dipakai komponen). */
  tone: "neutral" | "amber" | "orange" | "rose" | "red";
};

/** Pelabelan bucket berbeda tergantung basis. */
export function getAgingBuckets(basis: AgingBasis): AgingBucketDef[] {
  if (basis === "jatuh_tempo") {
    return [
      { key: "BELUM", label: "Belum jatuh tempo", short: "Belum", tone: "neutral" },
      { key: "B1_30", label: "1 – 30 hari lewat", short: "1–30", tone: "amber" },
      { key: "B31_60", label: "31 – 60 hari lewat", short: "31–60", tone: "orange" },
      { key: "B61_90", label: "61 – 90 hari lewat", short: "61–90", tone: "rose" },
      { key: "B90_PLUS", label: "> 90 hari lewat", short: "> 90", tone: "red" },
    ];
  }
  return [
    { key: "BELUM", label: "Baru (≤ 0 hari)", short: "Baru", tone: "neutral" },
    { key: "B1_30", label: "1 – 30 hari", short: "1–30", tone: "amber" },
    { key: "B31_60", label: "31 – 60 hari", short: "31–60", tone: "orange" },
    { key: "B61_90", label: "61 – 90 hari", short: "61–90", tone: "rose" },
    { key: "B90_PLUS", label: "> 90 hari", short: "> 90", tone: "red" },
  ];
}

/**
 * Hitung selisih hari (cutoff − tanggalRef). Positif berarti tanggal
 * referensi sudah lewat dari cutoff. Mengabaikan komponen jam (semua
 * tanggal dianggap di tengah hari lokal supaya aman dari DST).
 */
export function hariSelisih(tanggalRef: string, cutoff: string): number {
  const a = new Date(`${tanggalRef}T12:00:00`);
  const b = new Date(`${cutoff}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Klasifikasi jumlah hari ke bucket aging. */
export function bucketUntukHari(hari: number): AgingBucketKey {
  if (hari <= 0) return "BELUM";
  if (hari <= 30) return "B1_30";
  if (hari <= 60) return "B31_60";
  if (hari <= 90) return "B61_90";
  return "B90_PLUS";
}

/** Satu baris faktur yang sudah dikomputasi umur & bucket-nya. */
export type AgingFakturRow = {
  nomor: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  partnerKode: string;
  partnerNama: string;
  total: number;
  catatan: string;
  /** Selisih hari (positif = sudah lewat referensi cutoff). */
  hari: number;
  bucket: AgingBucketKey;
};

/** Ringkasan aging per partner (pelanggan untuk piutang, pemasok untuk hutang). */
export type AgingPartnerSummary = {
  partnerKode: string;
  partnerNama: string;
  totals: Record<AgingBucketKey, number>;
  total: number;
  fakturCount: number;
};

/** Snapshot lengkap laporan aging. */
export type AgingSnapshot = {
  cutoff: string;
  basis: AgingBasis;
  faktur: AgingFakturRow[];
  perPartner: AgingPartnerSummary[];
  bucketTotals: Record<AgingBucketKey, number>;
  totalKeseluruhan: number;
};

function emptyBuckets(): Record<AgingBucketKey, number> {
  return { BELUM: 0, B1_30: 0, B31_60: 0, B61_90: 0, B90_PLUS: 0 };
}

/**
 * Komputasi aging generic. Tidak terikat ke tipe faktur tertentu — pemanggil
 * menyediakan accessor untuk field yang dibutuhkan. Berlaku untuk piutang
 * (pelanggan) maupun hutang (pemasok).
 *
 * Hasil sudah terurut:
 * - `faktur`: berdasarkan `hari` desc (paling lewat di atas)
 * - `perPartner`: berdasarkan total desc (eksposur terbesar di atas)
 */
export function computeAging<T>(args: {
  rows: T[];
  cutoff: string;
  basis: AgingBasis;
  getNomor: (r: T) => string;
  getTanggalFaktur: (r: T) => string;
  getJatuhTempo: (r: T) => string;
  getPartnerKode: (r: T) => string;
  getPartnerNama: (r: T) => string;
  getTotal: (r: T) => number;
  getCatatan?: (r: T) => string;
}): AgingSnapshot {
  const {
    rows,
    cutoff,
    basis,
    getNomor,
    getTanggalFaktur,
    getJatuhTempo,
    getPartnerKode,
    getPartnerNama,
    getTotal,
    getCatatan,
  } = args;

  const faktur: AgingFakturRow[] = rows.map((r) => {
    const tanggalRef = basis === "jatuh_tempo" ? getJatuhTempo(r) : getTanggalFaktur(r);
    const hari = hariSelisih(tanggalRef, cutoff);
    const bucket = bucketUntukHari(hari);
    return {
      nomor: getNomor(r),
      tanggalFaktur: getTanggalFaktur(r),
      jatuhTempo: getJatuhTempo(r),
      partnerKode: getPartnerKode(r),
      partnerNama: getPartnerNama(r),
      total: getTotal(r),
      catatan: getCatatan ? getCatatan(r) : "",
      hari,
      bucket,
    };
  });

  faktur.sort((a, b) => b.hari - a.hari);

  const perPartnerMap = new Map<string, AgingPartnerSummary>();
  const bucketTotals = emptyBuckets();
  let totalKeseluruhan = 0;

  for (const f of faktur) {
    bucketTotals[f.bucket] += f.total;
    totalKeseluruhan += f.total;

    let summary = perPartnerMap.get(f.partnerKode);
    if (!summary) {
      summary = {
        partnerKode: f.partnerKode,
        partnerNama: f.partnerNama,
        totals: emptyBuckets(),
        total: 0,
        fakturCount: 0,
      };
      perPartnerMap.set(f.partnerKode, summary);
    }
    summary.totals[f.bucket] += f.total;
    summary.total += f.total;
    summary.fakturCount += 1;
  }

  const perPartner = [...perPartnerMap.values()].sort((a, b) => b.total - a.total);

  return {
    cutoff,
    basis,
    faktur,
    perPartner,
    bucketTotals,
    totalKeseluruhan,
  };
}
