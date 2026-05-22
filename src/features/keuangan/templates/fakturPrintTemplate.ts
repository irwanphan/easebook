import { buildPagedCss, pagedjsPolyfill } from "@/features/keuangan/printPaged";
import {
  buildSignatureBlockHtml,
  SIGNATURE_BLOCK_CSS,
  type SignatureColumn,
  type SignatureMode,
} from "@/features/keuangan/printSignature";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isPaperPaged,
  isReceiptPaper,
  paperSizeCss,
  type PaperSize,
} from "@/lib/paperSize";

/**
 * Satu baris item di faktur (pembelian / penjualan).
 * Field `catatan` opsional — hanya dipakai untuk faktur penjualan.
 */
export type FakturPrintLine = {
  barangKode: string;
  barangNama: string;
  qty: number;
  satuanNama: string;
  hargaSatuan: number;
  /** Diskon nominal per satuan (Rp). */
  diskon: number;
  subtotal: number;
  /** Penjualan-only: catatan per baris. */
  catatan?: string;
};

/**
 * Shape data faktur (pembelian / penjualan) untuk keperluan print.
 * Generic — dipakai untuk dua jenis faktur dengan label yang dibedakan
 * di `FakturPrintConfig`.
 */
export type FakturPrintData = {
  nomor: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  /** Status faktur (mis. "Diterima", "Lunas"). Ditampilkan sebagai badge. */
  status: string;
  /** Kode pemasok / pelanggan. */
  pihakKode: string;
  /** Nama pemasok / pelanggan. */
  pihakNama: string;
  gudangKode: string;
  gudangNama: string;
  /** Pembelian: METODE_PEMBAYARAN label (mis. "Tunai"). Penjualan: kosongkan. */
  metodePembayaranLabel?: string;
  /** Penjualan-only: nama salesman. */
  salesman?: string;
  /** Catatan utama faktur (penjualan: catatanFaktur). */
  catatan?: string;
  /** Akun kas yang menerima/membayar — null = piutang/hutang dagang. */
  akunKasKode: string | null;
  akunKasNama: string | null;
  subtotalBarang: number;
  diskonFaktur: number;
  pajak: number;
  total: number;
  lines: FakturPrintLine[];
};

/**
 * Konfigurasi label & teks per jenis faktur.
 */
export type FakturPrintConfig = {
  /** Judul dokumen, mis. "Faktur pembelian" / "Faktur penjualan". */
  judulDokumen: string;
  /** Label kolom pihak eksternal, mis. "Pemasok" / "Pelanggan". */
  pihakLabel: string;
  /** Label baris pembayaran, mis. "Dibayar dengan" / "Diterima melalui". */
  pembayaranLabel: string;
  /**
   * Teks fallback saat `akunKasKode` null (transaksi kredit).
   * Mis. "Hutang dagang" untuk pembelian, "Piutang (belum diterima)" untuk
   * penjualan.
   */
  pembayaranKreditFallback: string;
  /** Tampilkan kolom "Catatan" di tabel baris item. Penjualan-only. */
  showLineCatatan?: boolean;
  /** Tampilkan label salesman di blok info. Penjualan-only. */
  showSalesman?: boolean;
  /** Tampilkan label metode pembayaran. Pembelian-only. */
  showMetodePembayaran?: boolean;
  /** Optional blok tanda tangan untuk konfirmasi serah-terima. */
  signatures?: SignatureColumn[];
  /** Mode signature, default "tanda-tangan". Pakai "paraf" untuk hemat ruang. */
  signatureMode?: SignatureMode;
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktuSekarang() {
  return new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Bangun HTML dokumen print-ready untuk faktur pembelian / penjualan.
 *
 * Layout otomatis menyesuaikan ukuran kertas:
 * - Kertas paged (A4, Letter, ½ continuous): layout invoice 2 kolom + tabel
 *   baris item + ringkasan nilai + paged.js untuk header/footer berulang +
 *   page numbering + blok tanda tangan.
 * - Kertas thermal (58/80mm): receipt 1 kolom kompak, flow natural tanpa
 *   paged.js & tanpa blok tanda tangan.
 */
export function buildFakturPrintHtml(
  data: FakturPrintData,
  config: FakturPrintConfig,
  paperSize?: PaperSize,
): string {
  const receipt = paperSize ? isReceiptPaper(paperSize) : false;
  const paged = paperSize ? isPaperPaged(paperSize) : true;
  const usePagedJs = paged && !receipt;
  const showSignatures =
    !receipt && config.signatures && config.signatures.length > 0;

  const body = receipt
    ? buildReceiptBody(data, config)
    : buildInvoiceBody(
        data,
        config,
        !usePagedJs,
        showSignatures ? config.signatures : undefined,
      );

  let extraCss = FAKTUR_EXTRA_CSS;
  let inlineScripts: string[] | undefined;
  let printOn: "load" | "pagedjs-after-rendered" = "load";

  if (paperSize) {
    if (usePagedJs) {
      extraCss += buildPagedCss(
        paperSize,
        config.judulDokumen,
        data.nomor,
        formatTanggal(data.tanggalFaktur),
        formatWaktuSekarang(),
      );
      inlineScripts = [pagedjsPolyfill];
      printOn = "pagedjs-after-rendered";
    } else {
      extraCss += paperSizeCss(paperSize);
    }
  }

  if (showSignatures) {
    extraCss += SIGNATURE_BLOCK_CSS;
  }

  return wrapPrintableDocument({
    title: `${config.judulDokumen} ${data.nomor}`,
    bodyHtml: body,
    extraCss,
    compact: receipt,
    inlineScripts,
    printOn,
  });
}

/**
 * CSS spesifik layout faktur — mirror gaya detail page (Card-style border
 * tipis, section header dengan judul, tabel baris item rapi, ringkasan
 * nilai kanan-rata dengan grand total emphasis).
 */
const FAKTUR_EXTRA_CSS = `
  .faktur-card {
    border: 1px solid #e4e4e7;
    border-radius: 3mm;
    padding: 4mm 5mm;
    margin: 4mm 0;
  }
  .faktur-card .section-header h2 {
    margin: 0;
    font-size: 11pt;
    font-weight: 600;
    color: #18181b;
    text-transform: none;
    letter-spacing: 0;
  }
  .faktur-card .section-header {
    padding-bottom: 3mm;
    border-bottom: 1px solid #f4f4f5;
    margin-bottom: 3mm;
  }

  /* Tabel baris item — pakai <table> agar paged.js bisa break antar
     halaman secara aman saat baris item banyak. */
  table.faktur-lines {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }
  table.faktur-lines > thead > tr > th {
    text-align: left;
    font-size: 8.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #52525b;
    background: #fafafa;
    padding: 2mm 2mm;
    border-bottom: 1px solid #e4e4e7;
  }
  table.faktur-lines > thead > tr > th.num {
    text-align: right;
  }
  table.faktur-lines > tbody > tr > td {
    padding: 2mm 2mm;
    font-size: 9.5pt;
    border-bottom: 1px solid #f4f4f5;
    vertical-align: top;
  }
  table.faktur-lines > tbody > tr > td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  table.faktur-lines > tbody > tr > td.code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 8.5pt;
    color: #52525b;
  }
  table.faktur-lines > tbody > tr > td .line-nama {
    font-weight: 500;
    color: #18181b;
  }
  table.faktur-lines > tbody > tr > td .line-catatan {
    font-size: 8.5pt;
    color: #71717a;
    margin-top: 0.5mm;
  }

  /* Ringkasan nilai (kanan, di bawah tabel). */
  .faktur-summary {
    margin-top: 3mm;
    margin-left: auto;
    width: 70mm;
  }
  .faktur-summary .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 4mm;
    padding: 1.5mm 0;
    font-size: 10pt;
    border-bottom: 1px dashed #f4f4f5;
  }
  .faktur-summary .summary-row dt {
    margin: 0;
    color: #52525b;
  }
  .faktur-summary .summary-row dd {
    margin: 0;
    color: #18181b;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .faktur-summary .summary-row.subtle dt,
  .faktur-summary .summary-row.subtle dd {
    color: #71717a;
  }
  .faktur-summary .summary-row.grand-total {
    margin-top: 1mm;
    padding: 2.5mm 3mm;
    background: #fafafa;
    border-radius: 1.5mm;
    border-bottom: none;
  }
  .faktur-summary .summary-row.grand-total dt {
    font-weight: 600;
    color: #18181b;
  }
  .faktur-summary .summary-row.grand-total dd {
    font-size: 11.5pt;
    font-weight: 700;
    color: #18181b;
  }

  /* Status badge di header info. */
  .status-badge {
    display: inline-block;
    padding: 0.5mm 2mm;
    border-radius: 1mm;
    background: #f4f4f5;
    font-size: 8.5pt;
    font-weight: 600;
    color: #3f3f46;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

/**
 * Layout invoice 2 kolom untuk kertas A4 / Letter / continuous.
 *
 * - `showInlineHeader=true` saat paged.js NOT aktif: header inline di body.
 * - `showInlineHeader=false` saat paged.js aktif: header dipindah ke
 *   @page margin boxes (lihat `buildPagedCss`).
 * - `signatures`: kalau diisi, blok tanda tangan dirender setelah ringkasan.
 */
function buildInvoiceBody(
  data: FakturPrintData,
  config: FakturPrintConfig,
  showInlineHeader: boolean,
  signatures?: SignatureColumn[],
): string {
  const inlineHeader = showInlineHeader
    ? `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(config.judulDokumen)}</h1>
      <p class="muted" style="margin: 0;">No. <span class="mono">${escapeHtml(data.nomor)}</span> · ${escapeHtml(
        formatTanggal(data.tanggalFaktur),
      )}</p>
    </div>
    `
    : "";

  const pembayaranValue = data.akunKasKode
    ? `${escapeHtml(data.akunKasKode)}${
        data.akunKasNama ? ` — ${escapeHtml(data.akunKasNama)}` : ""
      } <span class="muted">(tunai)</span>`
    : `<span class="muted">${escapeHtml(config.pembayaranKreditFallback)}</span>`;

  const showLineCatatan = config.showLineCatatan === true;
  const colCount = showLineCatatan ? 7 : 6;

  const baris = data.lines
    .map(
      (line) => `
      <tr>
        <td class="code">${escapeHtml(line.barangKode)}</td>
        <td>
          <div class="line-nama">${escapeHtml(line.barangNama)}</div>
          ${
            showLineCatatan && line.catatan
              ? `<div class="line-catatan">${escapeHtml(line.catatan)}</div>`
              : ""
          }
        </td>
        <td class="num">${escapeHtml(String(line.qty))}</td>
        <td>${escapeHtml(line.satuanNama || "—")}</td>
        <td class="num">${escapeHtml(formatRupiah(line.hargaSatuan))}</td>
        <td class="num">${line.diskon > 0 ? escapeHtml(formatRupiah(line.diskon)) : "—"}</td>
        <td class="num">${escapeHtml(formatRupiah(line.subtotal))}</td>
      </tr>`,
    )
    .join("");

  const emptyRow = data.lines.length === 0
    ? `<tr><td colspan="${colCount}" style="text-align:center; color:#71717a; padding: 5mm 0;">Tidak ada baris item.</td></tr>`
    : "";

  return `
    ${inlineHeader}
    <div class="grid">
      <div>
        <div class="label">${escapeHtml(config.pihakLabel)}</div>
        <div class="value">${escapeHtml(data.pihakNama || data.pihakKode)}</div>
        <div class="mono muted">${escapeHtml(data.pihakKode)}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="value"><span class="status-badge">${escapeHtml(data.status)}</span></div>
      </div>
      <div>
        <div class="label">Tanggal faktur</div>
        <div class="value">${escapeHtml(formatTanggal(data.tanggalFaktur))}</div>
      </div>
      <div>
        <div class="label">Jatuh tempo</div>
        <div class="value">${escapeHtml(formatTanggal(data.jatuhTempo))}</div>
      </div>
      <div>
        <div class="label">Gudang</div>
        <div class="value">${escapeHtml(data.gudangNama || data.gudangKode)}</div>
        <div class="mono muted">${escapeHtml(data.gudangKode)}</div>
      </div>
      <div>
        <div class="label">${escapeHtml(config.pembayaranLabel)}</div>
        <div class="value">${pembayaranValue}</div>
        ${
          config.showMetodePembayaran && data.metodePembayaranLabel
            ? `<div class="muted">${escapeHtml(data.metodePembayaranLabel)}</div>`
            : ""
        }
      </div>
      ${
        config.showSalesman && data.salesman
          ? `<div>
              <div class="label">Salesman</div>
              <div class="value">${escapeHtml(data.salesman)}</div>
            </div>`
          : ""
      }
      ${
        data.catatan && data.catatan.trim()
          ? `<div style="grid-column: span 2;">
              <div class="label">Catatan</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(data.catatan)}</div>
            </div>`
          : ""
      }
    </div>

    <div class="faktur-card">
      <div class="section-header">
        <h2>Baris item</h2>
      </div>
      <table class="faktur-lines">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama barang${showLineCatatan ? " / catatan" : ""}</th>
            <th class="num">Qty</th>
            <th>Satuan</th>
            <th class="num">Harga satuan</th>
            <th class="num">Diskon/satuan</th>
            <th class="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${baris}${emptyRow}
        </tbody>
      </table>

      <dl class="faktur-summary">
        <div class="summary-row">
          <dt>Subtotal barang</dt>
          <dd>${escapeHtml(formatRupiah(data.subtotalBarang))}</dd>
        </div>
        <div class="summary-row${data.diskonFaktur > 0 ? "" : " subtle"}">
          <dt>Diskon faktur</dt>
          <dd>${data.diskonFaktur > 0 ? `− ${escapeHtml(formatRupiah(data.diskonFaktur))}` : "—"}</dd>
        </div>
        <div class="summary-row${data.pajak > 0 ? "" : " subtle"}">
          <dt>Pajak</dt>
          <dd>${data.pajak > 0 ? escapeHtml(formatRupiah(data.pajak)) : "—"}</dd>
        </div>
        <div class="summary-row grand-total">
          <dt>Total faktur</dt>
          <dd>${escapeHtml(formatRupiah(data.total))}</dd>
        </div>
      </dl>
    </div>

    ${signatures ? buildSignatureBlockHtml(signatures, { mode: config.signatureMode }) : ""}
  `;
}

/** Layout receipt 1 kolom untuk thermal printer 58/80mm. */
function buildReceiptBody(
  data: FakturPrintData,
  config: FakturPrintConfig,
): string {
  const baris = data.lines
    .map(
      (line) => `
      <tr>
        <td>
          <div><strong>${escapeHtml(line.barangNama)}</strong></div>
          <div class="muted" style="font-size: 10px;">
            ${escapeHtml(String(line.qty))} ${escapeHtml(line.satuanNama || "")} × ${escapeHtml(formatRupiah(line.hargaSatuan))}
            ${line.diskon > 0 ? ` − ${escapeHtml(formatRupiah(line.diskon))}` : ""}
          </div>
        </td>
        <td class="num">${escapeHtml(formatRupiah(line.subtotal))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
      <strong style="font-size: 13px;">${escapeHtml(config.judulDokumen)}</strong>
      <div class="mono">${escapeHtml(data.nomor)}</div>
      <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(data.tanggalFaktur))}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">${escapeHtml(config.pihakLabel)}:</span></div>
      <div><strong>${escapeHtml(data.pihakNama || data.pihakKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(data.pihakKode)}</div>
    </div>

    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="padding: 4px 2px;">Item</th>
          <th class="num" style="padding: 4px 2px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="2" style="text-align:center;">—</td></tr>`}
      </tbody>
    </table>

    <div style="margin-top: 6px; border-top: 1px dashed #18181b; padding-top: 4px; font-size: 11px;">
      <div style="display:flex; justify-content:space-between;">
        <span>Subtotal</span><strong>${escapeHtml(formatRupiah(data.subtotalBarang))}</strong>
      </div>
      ${
        data.diskonFaktur > 0
          ? `<div style="display:flex; justify-content:space-between;">
              <span>Diskon</span><span>− ${escapeHtml(formatRupiah(data.diskonFaktur))}</span>
            </div>`
          : ""
      }
      ${
        data.pajak > 0
          ? `<div style="display:flex; justify-content:space-between;">
              <span>Pajak</span><span>${escapeHtml(formatRupiah(data.pajak))}</span>
            </div>`
          : ""
      }
      <div style="display:flex; justify-content:space-between; margin-top: 2px; border-top: 1px solid #18181b; padding-top: 2px;">
        <strong>Total</strong><strong>${escapeHtml(formatRupiah(data.total))}</strong>
      </div>
    </div>

    ${
      data.catatan && data.catatan.trim()
        ? `<div style="margin-top: 6px; border-top: 1px dashed #d4d4d8; padding-top: 4px; font-size: 11px; white-space: pre-wrap;">
            <span class="muted">Catatan: </span>${escapeHtml(data.catatan)}
          </div>`
        : ""
    }
  `;
}
