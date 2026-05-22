import { escapeHtml } from "@/lib/print";

/**
 * Konfigurasi satu kolom tanda tangan.
 * Untuk konvensi 2 kolom (paling umum di Indonesia), pass 2 elemen:
 * pihak pemberi uang di kiri, pihak penerima uang di kanan.
 *
 * Mis.:
 * - Penerimaan kas: `[{ label: "Yang Menyerahkan" }, { label: "Yang Menerima" }]`
 * - Pengeluaran kas: `[{ label: "Yang Membayar" }, { label: "Yang Menerima" }]`
 * - Pelunasan hutang: `[{ label: "Yang Membayar" }, { label: "Yang Menerima" }]`
 * - Pelunasan piutang: `[{ label: "Yang Membayar" }, { label: "Yang Menerima" }]`
 */
export type SignatureColumn = {
  /** Label di atas garis tanda tangan (mis. "Yang Membayar"). */
  label: string;
};

/**
 * Mode tampilan blok tanda tangan.
 *
 * Konvensi dokumen bisnis Indonesia membedakan dua jenis konfirmasi tertulis:
 * - **tanda-tangan**: tanda tangan penuh untuk dokumen formal (bukti legal,
 *   melibatkan pihak luar). Ruang ~22mm, font 10pt. Cocok untuk penerimaan,
 *   pengeluaran, pelunasan hutang/piutang.
 * - **paraf**: paraf / inisial untuk konfirmasi internal (PIC menyetujui).
 *   Ruang ~12mm, font sedikit lebih kecil. Cocok untuk transaksi internal
 *   seperti transfer antar kas. Lebih kompak — mempermudah dokumen muat
 *   di satu halaman.
 */
export type SignatureMode = "tanda-tangan" | "paraf";

export type SignatureBlockOptions = {
  /** Default `"tanda-tangan"` (size penuh). */
  mode?: SignatureMode;
};

/**
 * Render blok tanda tangan untuk dokumen serah-terima uang.
 *
 * Layout pakai `<table>` (bukan flexbox) karena:
 * 1. Paged.js menangani table jauh lebih baik daripada flex container untuk
 *    keputusan pagination — flex sering bikin paged.js "bingung" mengukur
 *    tinggi & memposisikan blok di antara halaman.
 * 2. Print engine browser secara historis lebih solid handle table-based
 *    layout untuk cetakan.
 *
 * Designed for paged docs (A4/Letter) — TIDAK cocok untuk thermal/nota
 * sempit. Pemanggil bertanggung jawab tidak memanggil ini untuk thermal.
 *
 * Pakai bersama `SIGNATURE_BLOCK_CSS` (di-append ke `extraCss`).
 *
 * @param options.mode `"tanda-tangan"` (default, ~47mm total tinggi) atau
 *   `"paraf"` (~31mm total tinggi) untuk dokumen internal yang harus muat
 *   di satu halaman.
 */
export function buildSignatureBlockHtml(
  columns: SignatureColumn[],
  options?: SignatureBlockOptions,
): string {
  if (columns.length === 0) return "";

  const isParaf = options?.mode === "paraf";
  const tableClass = isParaf ? "signature-block paraf" : "signature-block";
  const ariaLabel = isParaf ? "Paraf" : "Tanda tangan";

  const cells = columns
    .map(
      (col) => `
      <td class="signature-cell">
        <div class="signature-label">${escapeHtml(col.label)}</div>
        <div class="signature-space" aria-hidden="true"></div>
        <div class="signature-line" aria-hidden="true"></div>
        <div class="signature-name">
          <span class="signature-paren">(</span>
          <span class="signature-fill" aria-hidden="true"></span>
          <span class="signature-paren">)</span>
        </div>
      </td>`,
    )
    .join("");

  // role="presentation" pada <table> menyatakan ke screen reader bahwa
  // table ini cuma untuk layout (bukan data tabular).
  return `
    <table class="${tableClass}" role="presentation" aria-label="${ariaLabel}">
      <tbody>
        <tr>${cells}</tr>
      </tbody>
    </table>
  `;
}

/**
 * CSS untuk blok tanda tangan. Append ke `extraCss` saat memakai
 * `buildSignatureBlockHtml`.
 *
 * Catatan override:
 * - Base wrap doc punya `th, td { padding: 2px 4px; border-bottom: 1px solid }`
 *   yang akan diterapkan ke `<td>` di dalam signature table — kita override
 *   dengan selector lebih spesifik (`table.signature-block > tbody > tr > td`)
 *   supaya tidak ada border-bottom & padding tidak perlu.
 * - Base paged CSS set `table { page-break-inside: auto }`. Untuk signature
 *   kita override dengan `table.signature-block { page-break-inside: avoid }`
 *   (specificity lebih tinggi) supaya blok ttd tidak terbelah.
 */
export const SIGNATURE_BLOCK_CSS = `
  table.signature-block {
    width: 100%;
    margin-top: 10mm;
    border-collapse: collapse;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  table.signature-block > tbody > tr > td.signature-cell {
    width: 50%;
    text-align: center;
    vertical-align: top;
    padding: 0 8mm;
    border: none;
    background: transparent;
  }
  .signature-block .signature-label {
    font-size: 10pt;
    font-weight: 600;
    color: #18181b;
    margin-bottom: 2mm;
  }
  .signature-block .signature-space {
    /* Ruang vertikal untuk tanda tangan sebenarnya. ~22mm cukup untuk
       tanda tangan penuh, ~15mm cukup untuk paraf. */
    height: 22mm;
  }
  .signature-block .signature-line {
    border-top: 0.6pt solid #18181b;
    margin: 0 6mm;
  }
  /* Wrapper "( ........ )" — dibuat selebar garis di atasnya dengan
     'margin: 0 6mm' yang sama, lalu flex layout supaya '(' & ')' menempel
     di tepi kiri/kanan persis di ujung garis. Tengahnya '.signature-fill'
     dengan flex:1 mengisi sisanya — ruang kosong untuk menulis nama. */
  .signature-block .signature-name {
    display: flex;
    align-items: baseline;
    margin: 2mm 6mm 0;
    font-size: 10pt;
    color: #71717a;
  }
  .signature-block .signature-fill {
    flex: 1;
  }

  /* Variant paraf — dimensi lebih kompak untuk dokumen internal (mis.
     transfer antar kas) yang tidak butuh tanda tangan formal penuh.
     Hemat ~16mm total tinggi dibanding default, membantu seluruh dokumen
     muat di satu halaman A4. */
  table.signature-block.paraf {
    margin-top: 5mm;
  }
  table.signature-block.paraf > tbody > tr > td.signature-cell {
    padding: 0 6mm;
  }
  .signature-block.paraf .signature-label {
    font-size: 9pt;
    margin-bottom: 1.5mm;
  }
  .signature-block.paraf .signature-space {
    /* Paraf cukup 12mm — ruang untuk inisial 2-3 huruf. */
    height: 12mm;
  }
  .signature-block.paraf .signature-line {
    margin: 0 4mm;
  }
  .signature-block.paraf .signature-name {
    margin: 1.5mm 4mm 0;
    font-size: 8.5pt;
  }
`;
