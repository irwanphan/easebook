/** Satuan bertingkat (1 = terbesar, 3 = terkecil / stok). */
export type BarangSatuanTingkatRow = {
  tingkat: number;
  nama: string;
  qtyIsi: number | null;
  hargaJual: number;
  hargaBeli: number;
  kodeBarcode?: string | null;
};

export type BarangJasaRow = {
  kode: string;
  nama: string;
  tipe: "Barang" | "Jasa";
  /** Satuan terkecil — disinkronkan dari tingkat 3 (barang) atau tingkat 1 (jasa). */
  satuan: string;
  /** Harga jual satuan terkecil / utama — kompatibilitas transaksi. */
  harga: number;
  stok?: number;
  kategoriKode?: string | null;
  merekKode?: string | null;
  defaultGudangKode?: string | null;
  satuanTingkat?: BarangSatuanTingkatRow[];
};

export type BarangSatuanTingkatForm = {
  nama: string;
  qtyIsi: string;
  hargaJual: string;
  hargaBeli: string;
  kodeBarcode: string;
};

export function emptySatuanTingkatForm(): BarangSatuanTingkatForm {
  return { nama: "", qtyIsi: "", hargaJual: "", hargaBeli: "", kodeBarcode: "" };
}

export function defaultSatuanTingkatBarang(): BarangSatuanTingkatForm[] {
  return [emptySatuanTingkatForm(), emptySatuanTingkatForm(), emptySatuanTingkatForm()];
}

/** Ringkasan satuan untuk tabel daftar. */
export function parseHargaInput(raw: string): number | null {
  const n = Number(raw.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/** Kosong → 0; nilai tidak valid → null. */
export function parseHargaInputOptional(raw: string): number | null {
  if (raw.trim() === "") return 0;
  return parseHargaInput(raw);
}

export function parseQtyIsiInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Pastikan form barang selalu punya 3 slot tingkat (UI). */
export function ensureBarangSatuanTiers(tiers: BarangSatuanTingkatForm[]): BarangSatuanTingkatForm[] {
  const out = [...tiers];
  while (out.length < 3) {
    out.push(emptySatuanTingkatForm());
  }
  return out.slice(0, 3);
}

type SatuanPayloadRow = {
  tingkat: number;
  nama: string;
  qtyIsi: number | null;
  hargaJual: number;
  hargaBeli: number;
  kodeBarcode: string | null;
};

/** Satuan terkecil / utama dari payload (tingkat tertinggi yang ada). */
export function getSatuanTerkecilFromPayload(satuanTingkat: SatuanPayloadRow[]): SatuanPayloadRow {
  return [...satuanTingkat].sort((a, b) => b.tingkat - a.tingkat)[0]!;
}

/** Indeks kolom form untuk field stok (satuan terkecil yang dipakai). */
export function stokFormTierIndex(tiers: BarangSatuanTingkatForm[]): number {
  const form = ensureBarangSatuanTiers(tiers);
  if (form[2]?.nama.trim()) return 2;
  if (form[1]?.nama.trim()) return 1;
  return 0;
}

/** Validasi form satuan → payload untuk API. */
export function buildSatuanTingkatPayload(
  tipe: "Barang" | "Jasa",
  tiers: BarangSatuanTingkatForm[],
): { ok: true; satuanTingkat: Array<{
    tingkat: number;
    nama: string;
    qtyIsi: number | null;
    hargaJual: number;
    hargaBeli: number;
    kodeBarcode: string | null;
  }> } | { ok: false; error: string } {
  const normalizeBarcode = (raw: string) => {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  };
  if (tipe === "Jasa") {
    const t = tiers[0];
    if (!t?.nama.trim()) return { ok: false, error: "Nama satuan wajib diisi." };
    const hargaJual = parseHargaInputOptional(t.hargaJual);
    const hargaBeli = parseHargaInputOptional(t.hargaBeli);
    if (hargaJual == null || hargaBeli == null) {
      return { ok: false, error: "Harga jual atau harga beli tidak valid." };
    }
    return {
      ok: true,
      satuanTingkat: [
        {
          tingkat: 1,
          nama: t.nama.trim(),
          qtyIsi: null,
          hargaJual,
          hargaBeli,
          kodeBarcode: normalizeBarcode(t.kodeBarcode),
        },
      ],
    };
  }

  const formTiers = ensureBarangSatuanTiers(tiers);
  const t1 = formTiers[0]!;
  const nama1 = t1.nama.trim();
  if (!nama1) {
    return { ok: false, error: "Nama satuan tingkat 1 wajib diisi." };
  }

  const harga1 = parseHargaInputOptional(t1.hargaJual);
  const beli1 = parseHargaInputOptional(t1.hargaBeli);
  if (harga1 == null || beli1 == null) {
    return { ok: false, error: "Harga tingkat 1 tidak valid." };
  }

  const result: SatuanPayloadRow[] = [
    {
      tingkat: 1,
      nama: nama1,
      qtyIsi: null,
      hargaJual: harga1,
      hargaBeli: beli1,
      kodeBarcode: normalizeBarcode(t1.kodeBarcode),
    },
  ];

  const nama2 = formTiers[1]?.nama.trim() ?? "";
  if (nama2) {
    const qty1 = parseQtyIsiInput(formTiers[0]!.qtyIsi);
    if (qty1 == null) {
      return { ok: false, error: "Isi konversi ke satuan 2 wajib diisi (bilangan bulat > 0)." };
    }
    result[0]!.qtyIsi = qty1;

    const harga2 = parseHargaInputOptional(formTiers[1]!.hargaJual);
    const beli2 = parseHargaInputOptional(formTiers[1]!.hargaBeli);
    if (harga2 == null || beli2 == null) {
      return { ok: false, error: "Harga tingkat 2 tidak valid." };
    }
    result.push({
      tingkat: 2,
      nama: nama2,
      qtyIsi: null,
      hargaJual: harga2,
      hargaBeli: beli2,
      kodeBarcode: normalizeBarcode(formTiers[1]!.kodeBarcode),
    });

    const nama3 = formTiers[2]?.nama.trim() ?? "";
    if (nama3) {
      const qty2 = parseQtyIsiInput(formTiers[1]!.qtyIsi);
      if (qty2 == null) {
        return { ok: false, error: "Isi konversi ke satuan 3 wajib diisi (bilangan bulat > 0)." };
      }
      result[1]!.qtyIsi = qty2;

      const harga3 = parseHargaInputOptional(formTiers[2]!.hargaJual);
      const beli3 = parseHargaInputOptional(formTiers[2]!.hargaBeli);
      if (harga3 == null || beli3 == null) {
        return { ok: false, error: "Harga tingkat 3 tidak valid." };
      }
      result.push({
        tingkat: 3,
        nama: nama3,
        qtyIsi: null,
        hargaJual: harga3,
        hargaBeli: beli3,
        kodeBarcode: normalizeBarcode(formTiers[2]!.kodeBarcode),
      });
    }
  }

  return { ok: true, satuanTingkat: result };
}

export type BarangJasaUpdatePayload = {
  nama: string;
  stok?: number | null;
  kategoriKode?: string | null;
  merekKode?: string | null;
  defaultGudangKode?: string | null;
  /** Diabaikan jika item sudah punya transaksi (satuan dikunci). */
  satuanTingkat?: Array<{
    tingkat: number;
    nama: string;
    qtyIsi: number | null;
    hargaJual: number;
    hargaBeli: number;
    kodeBarcode: string | null;
  }>;
};

/** Konversi baris DB → form satuan (termasuk data lama tanpa tingkat). */
export function satuanTingkatRowsToForm(
  tiers: BarangSatuanTingkatRow[] | undefined,
  tipe: "Barang" | "Jasa",
  fallbackSatuan: string,
  fallbackHarga: number,
): BarangSatuanTingkatForm[] {
  if (tiers && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => a.tingkat - b.tingkat);
    const forms = defaultSatuanTingkatBarang();
    // Data migrasi: satu satuan di tingkat 3 → tampilkan di tingkat 1 agar cukup isi satu kolom.
    if (sorted.length === 1 && sorted[0]!.tingkat === 3) {
      const t = sorted[0]!;
      forms[0] = {
        nama: t.nama,
        qtyIsi: "",
        hargaJual: String(t.hargaJual),
        hargaBeli: String(t.hargaBeli),
        kodeBarcode: t.kodeBarcode ?? "",
      };
      return forms;
    }
    for (const t of sorted) {
      const idx = t.tingkat - 1;
      if (idx >= 0 && idx < 3) {
        forms[idx] = {
          nama: t.nama,
          qtyIsi: t.qtyIsi != null ? String(t.qtyIsi) : "",
          hargaJual: String(t.hargaJual),
          hargaBeli: String(t.hargaBeli),
          kodeBarcode: t.kodeBarcode ?? "",
        };
      }
    }
    return forms;
  }
  if (tipe === "Jasa") {
    return [
      {
        nama: fallbackSatuan,
        qtyIsi: "",
        hargaJual: String(fallbackHarga),
        hargaBeli: "",
        kodeBarcode: "",
      },
    ];
  }
  const forms = defaultSatuanTingkatBarang();
  forms[2] = {
    nama: fallbackSatuan,
    qtyIsi: "",
    hargaJual: String(fallbackHarga),
    hargaBeli: "",
    kodeBarcode: "",
  };
  return forms;
}

export function formatSatuanTingkatRingkasan(
  tiers: BarangSatuanTingkatRow[] | undefined,
  fallbackSatuan: string,
): string {
  if (!tiers?.length) return fallbackSatuan;
  const sorted = [...tiers].sort((a, b) => a.tingkat - b.tingkat);
  if (sorted.length === 1) return sorted[0]!.nama;

  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    if (i === 0) {
      parts.push(t.nama);
    } else {
      const prev = sorted[i - 1]!;
      const qty = prev.qtyIsi ?? 0;
      parts.push(`${qty} ${t.nama}`);
    }
  }
  return parts.join(" · ");
}

/** Nama satuan terkecil tempat stok dicatat. */
export function getSatuanStokBarang(barang: Pick<BarangJasaRow, "satuan" | "satuanTingkat">): string {
  const tiers = barang.satuanTingkat;
  if (tiers?.length) {
    const terkecil = [...tiers].sort((a, b) => b.tingkat - a.tingkat)[0];
    if (terkecil?.nama.trim()) return terkecil.nama.trim();
  }
  return barang.satuan?.trim() || "—";
}

export function getSatuanStokMeta(barang: Pick<BarangJasaRow, "satuan" | "satuanTingkat">) {
  const satuanStok = getSatuanStokBarang(barang);
  const tiers = barang.satuanTingkat;
  const punyaKonversi = Boolean(tiers && tiers.length > 1);
  return {
    satuanStok,
    konversiRingkasan: punyaKonversi ? formatSatuanTingkatRingkasan(tiers, satuanStok) : null,
  };
}

/** Format kuantitas mutasi/saldo dengan label satuan. */
export function formatQtyDenganSatuan(
  qty: number,
  satuan: string,
  mode: "masuk" | "keluar" | "saldo",
): string {
  if (mode !== "saldo" && qty <= 0) return "—";
  const angka = mode === "masuk" ? `+${qty}` : mode === "keluar" ? `-${qty}` : String(qty);
  return `${angka} ${satuan}`;
}
