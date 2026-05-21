/**
 * Definisi ukuran kertas untuk cetak. Dipakai oleh `PrintButton` dan
 * template HTML cetak untuk menyetel CSS `@page { size: ...; }` di dokumen
 * yang dibuka di browser default.
 *
 * Semua dimensi dalam **milimeter**, presisi sampai 2 desimal.
 */

export type PaperSize =
  | { kind: "preset"; preset: PaperPresetId }
  | { kind: "custom"; widthMm: number; heightMm: number | "auto" };

export type PaperPresetId =
  | "A4"
  | "LETTER"
  | "HALF_CONTINUOUS"
  | "NOTA_58"
  | "NOTA_80";

export type PaperSizeOption = {
  /** ID unik di antara opsi yang ditawarkan ke user. */
  id: string;
  /** Label utama di menu. */
  label: string;
  /** Penjelasan singkat (dimensi atau peruntukan). */
  description: string;
  /** Definisi ukuran. */
  paperSize: PaperSize;
};

/** Daftar preset standar yang dipakai di seluruh aplikasi. */
export const DEFAULT_PAPER_SIZES: PaperSizeOption[] = [
  {
    id: "a4",
    label: "A4",
    description: "210 × 297 mm",
    paperSize: { kind: "preset", preset: "A4" },
  },
  {
    id: "letter",
    label: "Letter",
    description: "215,9 × 279,4 mm",
    paperSize: { kind: "preset", preset: "LETTER" },
  },
  {
    id: "half-continuous",
    label: "½ Continuous form",
    description: "241,3 × 139,7 mm (9,5″ × 5,5″)",
    paperSize: { kind: "preset", preset: "HALF_CONTINUOUS" },
  },
  {
    id: "nota-58",
    label: "Nota thermal 58 mm",
    description: "58 mm × tinggi auto",
    paperSize: { kind: "preset", preset: "NOTA_58" },
  },
  {
    id: "nota-80",
    label: "Nota thermal 80 mm",
    description: "80 mm × tinggi auto",
    paperSize: { kind: "preset", preset: "NOTA_80" },
  },
];

/** Dimensi konkret dalam mm. Tinggi `"auto"` untuk continuous (thermal roll). */
export type PaperDimensions = {
  widthMm: number;
  heightMm: number | "auto";
};

export function paperSizeToDimensions(p: PaperSize): PaperDimensions {
  if (p.kind === "custom") {
    return { widthMm: p.widthMm, heightMm: p.heightMm };
  }
  switch (p.preset) {
    case "A4":
      return { widthMm: 210, heightMm: 297 };
    case "LETTER":
      return { widthMm: 215.9, heightMm: 279.4 };
    case "HALF_CONTINUOUS":
      return { widthMm: 241.3, heightMm: 139.7 };
    case "NOTA_58":
      return { widthMm: 58, heightMm: "auto" };
    case "NOTA_80":
      return { widthMm: 80, heightMm: "auto" };
  }
}

/** Anggap "kertas sempit" kalau lebar < 100 mm (untuk thermal/nota). */
export function isReceiptPaper(p: PaperSize): boolean {
  return paperSizeToDimensions(p).widthMm < 100;
}

/** Format dimensi jadi string ramah Indonesia (mis. "210 × 297 mm"). */
export function formatPaperDimensionsLabel(p: PaperSize): string {
  const { widthMm, heightMm } = paperSizeToDimensions(p);
  const w = formatMm(widthMm);
  if (heightMm === "auto") return `${w} × auto mm`;
  return `${w} × ${formatMm(heightMm)} mm`;
}

function formatMm(n: number): string {
  const fixed = Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
  return fixed.replace(".", ",");
}

/**
 * Bangun blok CSS `@page` + margin yang sesuai dengan ukuran.
 * - Margin kecil (3mm) untuk kertas sempit / continuous
 * - Margin normal (10mm) untuk A4/Letter/half-continuous
 */
export function paperSizeCss(p: PaperSize): string {
  const { widthMm, heightMm } = paperSizeToDimensions(p);
  const receipt = isReceiptPaper(p);
  const margin = receipt ? "3mm 2mm" : "10mm";

  const sizeRule =
    heightMm === "auto"
      ? `${formatCssMm(widthMm)} auto`
      : `${formatCssMm(widthMm)} ${formatCssMm(heightMm)}`;

  return `@page { size: ${sizeRule}; margin: ${margin}; }`;
}

function formatCssMm(n: number): string {
  // CSS pakai titik sebagai pemisah desimal.
  return `${n.toFixed(2).replace(/\.?0+$/, "")}mm`;
}

/**
 * Validasi & bersihkan input custom paper size dari user.
 * - Width wajib > 0 dan ≤ 1000
 * - Height (kalau bukan auto) wajib > 0 dan ≤ 2000
 * - Presisi maksimum 2 desimal
 */
export function buildCustomPaperSize(
  widthMm: number,
  heightMm: number | "auto",
): PaperSize | { error: string } {
  if (!Number.isFinite(widthMm) || widthMm <= 0 || widthMm > 1000) {
    return { error: "Lebar harus antara 0 dan 1000 mm." };
  }
  if (heightMm !== "auto") {
    if (!Number.isFinite(heightMm) || heightMm <= 0 || heightMm > 2000) {
      return { error: "Tinggi harus antara 0 dan 2000 mm, atau pilih auto." };
    }
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    kind: "custom",
    widthMm: round2(widthMm),
    heightMm: heightMm === "auto" ? "auto" : round2(heightMm),
  };
}
