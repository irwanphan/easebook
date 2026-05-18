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

export function parseQtyIsiInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
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
    const hargaJual = parseHargaInput(t.hargaJual);
    const hargaBeli = parseHargaInput(t.hargaBeli);
    if (hargaJual == null || hargaBeli == null) {
      return { ok: false, error: "Harga jual dan harga beli harus valid." };
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

  if (tiers.length < 3) {
    return { ok: false, error: "Lengkapi ketiga tingkat satuan." };
  }

  const result: Array<{
    tingkat: number;
    nama: string;
    qtyIsi: number | null;
    hargaJual: number;
    hargaBeli: number;
    kodeBarcode: string | null;
  }> = [];

  for (let i = 0; i < 3; i++) {
    const t = tiers[i]!;
    const tingkat = i + 1;
    if (!t.nama.trim()) {
      return { ok: false, error: `Nama satuan tingkat ${tingkat} wajib diisi.` };
    }
    const hargaJual = parseHargaInput(t.hargaJual);
    const hargaBeli = parseHargaInput(t.hargaBeli);
    if (hargaJual == null || hargaBeli == null) {
      return { ok: false, error: `Harga tingkat ${tingkat} tidak valid.` };
    }
    let qtyIsi: number | null = null;
    if (tingkat < 3) {
      const q = parseQtyIsiInput(t.qtyIsi);
      if (q == null) {
        return { ok: false, error: `Isi konversi tingkat ${tingkat} wajib bilangan bulat > 0.` };
      }
      qtyIsi = q;
    }
    result.push({
      tingkat,
      nama: t.nama.trim(),
      qtyIsi,
      hargaJual,
      hargaBeli,
      kodeBarcode: normalizeBarcode(t.kodeBarcode),
    });
  }

  return { ok: true, satuanTingkat: result };
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
